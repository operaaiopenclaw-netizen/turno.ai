// scripts/deploy-contract.ts
// Deploy do TurnoPaymentRegistry na Polygon Amoy (testnet) ou Mainnet
//
// Pré-requisitos:
//   npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
//   npx hardhat compile
//
// Uso:
//   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/deploy-contract.ts --network amoy
//   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/deploy-contract.ts --network mainnet
//
// Variáveis de ambiente necessárias:
//   BLOCKCHAIN_PRIVATE_KEY  — chave privada da wallet operadora
//   AMOY_RPC_URL            — RPC Polygon Amoy (default: rpc-amoy.polygon.technology)
//   POLYGON_RPC_URL         — RPC Polygon Mainnet

import { ethers } from "ethers"
import * as dotenv from "dotenv"
import * as path   from "path"
import * as fs     from "fs"

dotenv.config({ path: path.resolve(__dirname, "../.env") })

const NETWORKS: Record<string, { rpc: string; explorer: string; faucet?: string }> = {
  amoy: {
    rpc:      process.env.AMOY_RPC_URL    ?? "https://rpc-amoy.polygon.technology",
    explorer: "https://amoy.polygonscan.com",
    faucet:   "https://faucet.polygon.technology",
  },
  mainnet: {
    rpc:      process.env.POLYGON_RPC_URL ?? "https://polygon-rpc.com",
    explorer: "https://polygonscan.com",
  },
}

// Bytecode compilado pelo hardhat (npx hardhat compile)
// Se não existir, fornece instruções para compilar
function getBytecode(): string {
  const artifactPath = path.resolve(
    __dirname,
    "../artifacts/contracts/TurnoPaymentRegistry.sol/TurnoPaymentRegistry.json"
  )
  if (fs.existsSync(artifactPath)) {
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"))
    return artifact.bytecode
  }
  return ""
}

const ABI = [
  "constructor(address _operator)",
  "function registerPayment(string,string,string,string,uint256,string,string) returns (bytes32)",
  "function getPaymentById(string) view returns (tuple(string,string,string,string,uint256,string,string,uint256,address,bool))",
  "function paymentExists(string) view returns (bool)",
  "function getStats() view returns (uint256,uint256)",
  "function totalPayments() view returns (uint256)",
  "function owner() view returns (address)",
  "function operator() view returns (address)",
  "event PaymentRegistered(bytes32 indexed,string indexed,string,string,uint256,string,uint256)",
]

async function deploy() {
  const network = process.argv.includes("--network")
    ? process.argv[process.argv.indexOf("--network") + 1]
    : "amoy"

  const net = NETWORKS[network]
  if (!net) {
    console.error(`❌ Rede inválida: "${network}". Use "amoy" ou "mainnet".`)
    process.exit(1)
  }

  const privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY
  if (!privateKey) {
    console.error("❌ BLOCKCHAIN_PRIVATE_KEY não definida no .env")
    process.exit(1)
  }

  const bytecode = getBytecode()
  if (!bytecode) {
    console.log("")
    console.log("⚠️  Bytecode não encontrado. Compile o contrato primeiro:")
    console.log("")
    console.log("   # Instalar Hardhat (só na primeira vez):")
    console.log("   npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox")
    console.log("")
    console.log("   # Criar hardhat.config.ts na raiz do projeto:")
    const hardhatConfig = `import { HardhatUserConfig } from "hardhat/config"
import "@nomicfoundation/hardhat-toolbox"

const config: HardhatUserConfig = {
  solidity: "0.8.20",
  networks: {
    amoy: {
      url: process.env.AMOY_RPC_URL ?? "https://rpc-amoy.polygon.technology",
      accounts: process.env.BLOCKCHAIN_PRIVATE_KEY ? [process.env.BLOCKCHAIN_PRIVATE_KEY] : [],
    },
    polygon: {
      url: process.env.POLYGON_RPC_URL ?? "https://polygon-rpc.com",
      accounts: process.env.BLOCKCHAIN_PRIVATE_KEY ? [process.env.BLOCKCHAIN_PRIVATE_KEY] : [],
    },
  },
  paths: { sources: "./scripts" },
}
export default config`
    console.log(`\n${hardhatConfig}\n`)
    console.log("   # Mover o contrato para pasta contracts/:")
    console.log("   mkdir contracts && cp scripts/TurnoPaymentRegistry.sol contracts/")
    console.log("")
    console.log("   # Compilar:")
    console.log("   npx hardhat compile")
    console.log("")
    console.log("   # Depois rode este script novamente.")
    console.log("")
    console.log("   ─── Alternativa rápida: usar Remix IDE ────────────────────")
    console.log("   1. Acesse https://remix.ethereum.org")
    console.log("   2. Crie arquivo 'TurnoPaymentRegistry.sol' e cole o conteúdo de scripts/TurnoPaymentRegistry.sol")
    console.log("   3. Compile com solc 0.8.20")
    console.log("   4. Deploy em 'Injected Web3' com MetaMask na rede Polygon Amoy")
    console.log("   5. Copie o endereço do contrato para .env: CONTRACT_ADDRESS=0x...")
    process.exit(0)
  }

  const provider = new ethers.JsonRpcProvider(net.rpc)
  const wallet   = new ethers.Wallet(privateKey, provider)

  console.log("")
  console.log("╔══════════════════════════════════════════╗")
  console.log("  🚀  TurnoPaymentRegistry — Deploy")
  console.log("╚══════════════════════════════════════════╝")
  console.log(`  Rede:      ${network}`)
  console.log(`  Deployer:  ${wallet.address}`)

  const balance = await provider.getBalance(wallet.address)
  const balEth  = parseFloat(ethers.formatEther(balance))
  console.log(`  Saldo:     ${balEth.toFixed(4)} MATIC`)

  if (balEth < 0.01) {
    console.log("")
    if (network === "amoy") {
      console.log(`  ❌ Saldo insuficiente. Obtenha MATIC de teste em: ${net.faucet}`)
    } else {
      console.log(`  ❌ Saldo insuficiente. Adicione MATIC à carteira ${wallet.address}`)
    }
    process.exit(1)
  }

  console.log("")
  console.log("  Fazendo deploy...")

  const factory  = new ethers.ContractFactory(ABI, bytecode, wallet)
  // operator = mesma wallet que faz deploy (pode mudar depois via setOperator)
  const contract = await factory.deploy(wallet.address)
  const receipt  = await contract.deploymentTransaction()?.wait()

  const address = await contract.getAddress()

  console.log("")
  console.log("  ✅ Deploy concluído!")
  console.log(`  Endereço:  ${address}`)
  console.log(`  Tx Hash:   ${receipt?.hash}`)
  console.log(`  Explorer:  ${net.explorer}/address/${address}`)
  console.log("")
  console.log("  Adicione ao seu .env:")
  console.log(`  CONTRACT_ADDRESS="${address}"`)
  console.log(`  BLOCKCHAIN_NETWORK="${network === "amoy" ? "amoy" : "mainnet"}"`)
  console.log("")

  // Salva endereço em arquivo local
  const deployInfo = {
    network,
    address,
    txHash:    receipt?.hash,
    deployer:  wallet.address,
    operator:  wallet.address,
    deployedAt: new Date().toISOString(),
    explorer:  `${net.explorer}/address/${address}`,
  }
  fs.writeFileSync(
    path.resolve(__dirname, `../deployment-${network}.json`),
    JSON.stringify(deployInfo, null, 2)
  )
  console.log(`  Informações salvas em: deployment-${network}.json`)
}

deploy().catch(err => {
  console.error("❌ Erro no deploy:", err.message)
  process.exit(1)
})
