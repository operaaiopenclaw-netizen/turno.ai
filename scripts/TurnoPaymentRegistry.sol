// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title TurnoPaymentRegistry
 * @notice Registro imutável de pagamentos da plataforma Turno.ai
 *         Cada pagamento aprovado gera um registro on-chain na Polygon
 *         como prova auditável da transação de trabalho intermitente.
 *
 * @dev Deploy na Polygon Amoy (testnet) ou Polygon Mainnet
 *      Não há movimentação de tokens neste contrato — apenas registro.
 *      A liquidação financeira ocorre off-chain via PIX ou carteira interna (BRLC).
 */
contract TurnoPaymentRegistry {

    // ─── STRUCTS ──────────────────────────────────────────────────────────────

    struct PaymentRecord {
        string  paymentId;
        string  workerId;
        string  companyId;
        string  shiftId;
        uint256 amountCents;       // valor líquido pago ao worker em centavos BRL
        string  pixE2eId;          // ID fim-a-fim Pix (vazio se liquidado via wallet)
        string  settlementType;    // "PIX" | "WALLET" | "CARD"
        uint256 timestamp;
        address registeredBy;
        bool    exists;
    }

    // ─── STATE ────────────────────────────────────────────────────────────────

    address public owner;
    address public operator;
    uint256 public totalPayments;
    uint256 public totalAmountCents;

    mapping(bytes32 => PaymentRecord) private _records;
    mapping(string  => bytes32)       private _paymentIndex;
    bytes32[] private _allRecords;

    // ─── EVENTS ───────────────────────────────────────────────────────────────

    event PaymentRegistered(
        bytes32 indexed recordId,
        string  indexed paymentId,
        string          workerId,
        string          companyId,
        uint256         amountCents,
        string          settlementType,
        uint256         timestamp
    );

    event OperatorUpdated(address indexed oldOperator, address indexed newOperator);

    // ─── MODIFIERS ────────────────────────────────────────────────────────────

    modifier onlyOwner() {
        require(msg.sender == owner, "Apenas o owner pode executar");
        _;
    }

    modifier onlyOperator() {
        require(
            msg.sender == operator || msg.sender == owner,
            "Apenas operador autorizado"
        );
        _;
    }

    // ─── CONSTRUCTOR ──────────────────────────────────────────────────────────

    constructor(address _operator) {
        owner    = msg.sender;
        operator = _operator;
    }

    // ─── WRITE ────────────────────────────────────────────────────────────────

    /**
     * @notice Registra um pagamento aprovado na blockchain
     * @param paymentId      ID único do pagamento na plataforma
     * @param workerId       ID do trabalhador
     * @param companyId      ID da empresa
     * @param shiftId        ID do turno trabalhado
     * @param amountCents    Valor líquido pago ao worker em centavos BRL
     * @param pixE2eId       ID fim-a-fim Pix (vazio para pagamentos via wallet)
     * @param settlementType "PIX", "WALLET" ou "CARD"
     * @return recordId      Hash único do registro
     */
    function registerPayment(
        string calldata paymentId,
        string calldata workerId,
        string calldata companyId,
        string calldata shiftId,
        uint256 amountCents,
        string calldata pixE2eId,
        string calldata settlementType
    ) external onlyOperator returns (bytes32 recordId) {
        require(bytes(paymentId).length > 0, "paymentId obrigatorio");
        require(amountCents > 0,             "valor deve ser positivo");
        require(
            _paymentIndex[paymentId] == bytes32(0),
            "Pagamento ja registrado"
        );

        recordId = keccak256(abi.encodePacked(
            paymentId,
            workerId,
            companyId,
            shiftId,
            amountCents,
            block.timestamp
        ));

        _records[recordId] = PaymentRecord({
            paymentId:      paymentId,
            workerId:       workerId,
            companyId:      companyId,
            shiftId:        shiftId,
            amountCents:    amountCents,
            pixE2eId:       pixE2eId,
            settlementType: settlementType,
            timestamp:      block.timestamp,
            registeredBy:   msg.sender,
            exists:         true
        });

        _paymentIndex[paymentId] = recordId;
        _allRecords.push(recordId);

        totalPayments++;
        totalAmountCents += amountCents;

        emit PaymentRegistered(
            recordId,
            paymentId,
            workerId,
            companyId,
            amountCents,
            settlementType,
            block.timestamp
        );
    }

    // ─── READ ─────────────────────────────────────────────────────────────────

    function getPaymentByRecordId(bytes32 recordId)
        external view returns (PaymentRecord memory)
    {
        require(_records[recordId].exists, "Registro nao encontrado");
        return _records[recordId];
    }

    function getPaymentById(string calldata paymentId)
        external view returns (PaymentRecord memory)
    {
        bytes32 recordId = _paymentIndex[paymentId];
        require(recordId != bytes32(0), "Pagamento nao encontrado");
        return _records[recordId];
    }

    function getRecordId(string calldata paymentId)
        external view returns (bytes32)
    {
        return _paymentIndex[paymentId];
    }

    function paymentExists(string calldata paymentId)
        external view returns (bool)
    {
        return _paymentIndex[paymentId] != bytes32(0);
    }

    function getStats() external view returns (
        uint256 _totalPayments,
        uint256 _totalAmountCents
    ) {
        return (totalPayments, totalAmountCents);
    }

    function getRecentRecords(uint256 count)
        external view returns (bytes32[] memory)
    {
        uint256 len = _allRecords.length;
        uint256 n   = count > len ? len : count;
        bytes32[] memory result = new bytes32[](n);
        for (uint256 i = 0; i < n; i++) {
            result[i] = _allRecords[len - n + i];
        }
        return result;
    }

    // ─── ADMIN ────────────────────────────────────────────────────────────────

    function setOperator(address _operator) external onlyOwner {
        emit OperatorUpdated(operator, _operator);
        operator = _operator;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Endereco invalido");
        owner = newOwner;
    }
}
