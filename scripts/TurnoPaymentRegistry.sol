// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title TurnoPaymentRegistry
/// @notice Registro imutável de pagamentos Pix via plataforma Turno
/// @dev Deploy na rede Polygon para custo mínimo de gas

contract TurnoPaymentRegistry {
    // ─── EVENTOS ───────────────────────────────────────────────────────────────
    event PaymentRegistered(
        bytes32 indexed recordId,
        string  indexed paymentId,
        uint256 amountCents,
        uint256 timestamp
    );

    // ─── STRUCTS ───────────────────────────────────────────────────────────────
    struct PaymentRecord {
        string  paymentId;
        string  workerId;
        string  companyId;
        string  shiftId;
        uint256 amountCents;
        string  pixE2eId;
        uint256 timestamp;
        bool    exists;
    }

    // ─── STATE ─────────────────────────────────────────────────────────────────
    address public owner;
    address public turnoOperator; // Endereço autorizado a registrar pagamentos
    mapping(bytes32 => PaymentRecord) private records;
    mapping(string => bytes32) private paymentIdToRecord;
    uint256 public totalRegistered;

    // ─── MODIFIERS ─────────────────────────────────────────────────────────────
    modifier onlyOwner() {
        require(msg.sender == owner, "Apenas o owner pode executar");
        _;
    }

    modifier onlyOperator() {
        require(
            msg.sender == turnoOperator || msg.sender == owner,
            "Apenas operador autorizado"
        );
        _;
    }

    // ─── CONSTRUCTOR ───────────────────────────────────────────────────────────
    constructor(address _operator) {
        owner          = msg.sender;
        turnoOperator  = _operator;
    }

    // ─── FUNÇÕES PRINCIPAIS ────────────────────────────────────────────────────

    /// @notice Registra um pagamento Pix confirmado
    /// @param paymentId   ID interno da plataforma Turno
    /// @param workerId    ID do trabalhador
    /// @param companyId   ID da empresa
    /// @param shiftId     ID do turno
    /// @param amountCents Valor em centavos (ex: R$150,00 = 15000)
    /// @param pixE2eId    ID fim-a-fim do Banco Central
    /// @return recordId   Hash do registro criado
    function registerPayment(
        string calldata paymentId,
        string calldata workerId,
        string calldata companyId,
        string calldata shiftId,
        uint256         amountCents,
        string calldata pixE2eId
    ) external onlyOperator returns (bytes32 recordId) {
        require(bytes(paymentId).length > 0,   "paymentId obrigatorio");
        require(amountCents > 0,                "valor deve ser positivo");
        require(
            paymentIdToRecord[paymentId] == bytes32(0),
            "Pagamento ja registrado"
        );

        recordId = keccak256(abi.encodePacked(
            paymentId, workerId, companyId, shiftId, amountCents, block.timestamp
        ));

        records[recordId] = PaymentRecord({
            paymentId:   paymentId,
            workerId:    workerId,
            companyId:   companyId,
            shiftId:     shiftId,
            amountCents: amountCents,
            pixE2eId:    pixE2eId,
            timestamp:   block.timestamp,
            exists:      true
        });

        paymentIdToRecord[paymentId] = recordId;
        totalRegistered++;

        emit PaymentRegistered(recordId, paymentId, amountCents, block.timestamp);
    }

    /// @notice Consulta um pagamento pelo ID da plataforma
    function getPaymentByPaymentId(string calldata paymentId)
        external view
        returns (PaymentRecord memory)
    {
        bytes32 rid = paymentIdToRecord[paymentId];
        require(rid != bytes32(0), "Pagamento nao encontrado");
        return records[rid];
    }

    /// @notice Consulta um pagamento pelo recordId (hash)
    function getPayment(bytes32 recordId)
        external view
        returns (
            string memory workerId,
            string memory companyId,
            string memory shiftId,
            uint256 amountCents,
            string memory pixE2eId,
            uint256 timestamp
        )
    {
        PaymentRecord storage r = records[recordId];
        require(r.exists, "Registro nao encontrado");
        return (r.workerId, r.companyId, r.shiftId, r.amountCents, r.pixE2eId, r.timestamp);
    }

    /// @notice Verifica se um pagamento existe
    function paymentExists(string calldata paymentId) external view returns (bool) {
        return paymentIdToRecord[paymentId] != bytes32(0);
    }

    // ─── ADMIN ─────────────────────────────────────────────────────────────────

    function setOperator(address _operator) external onlyOwner {
        turnoOperator = _operator;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Endereco invalido");
        owner = newOwner;
    }
}
