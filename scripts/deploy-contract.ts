// scripts/deploy-contract.ts
// Deploy do contrato TurnoPaymentRegistry na rede Polygon
//
// Uso:
//   npx ts-node scripts/deploy-contract.ts --network mumbai
//   npx ts-node scripts/deploy-contract.ts --network mainnet

import { ethers } from "ethers"
import * as fs from "fs"
import * as path from "path"

const ABI = [
  "constructor(address _operator)",
  "function registerPayment(string,string,string,string,uint256,string) returns (bytes32)",
  "function getPayment(bytes32) view returns (string,string,string,uint256,string,uint256)",
  "function totalRegistered() view returns (uint256)",
  "event PaymentRegistered(bytes32 indexed,string indexed,uint256,uint256)",
]

// ABI + Bytecode seria gerado pelo compilador Solidity
// Para deploy real, compile o .sol com hardhat ou foundry
// Este script mostra a estrutura; em prod use: npx hardhat deploy

async function deploy() {
  const network    = process.argv.includes("--network")
    ? process.argv[process.argv.indexOf("--network") + 1]
    : "mumbai"

  const privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY
  if (!privateKey) {
    console.error("❌ BLOCKCHAIN_PRIVATE_KEY não definida no .env")
    process.exit(1)
  }

  const rpcUrls: Record<string, string> = {
    mumbai:  process.env.MUMBAI_RPC_URL  ?? "https://rpc-mumbai.maticvigil.com",
    mainnet: process.env.POLYGON_RPC_URL ?? "https://polygon-rpc.com",
  }

  const provider = new ethers.JsonRpcProvider(rpcUrls[network])
  const wallet   = new ethers.Wallet(privateKey, provider)

  console.log(`🚀 Deploying TurnoPaymentRegistry`)
  console.log(`   Network:  ${network}`)
  console.log(`   Deployer: ${wallet.address}`)

  const balance = await provider.getBalance(wallet.address)
  console.log(`   Balance:  ${ethers.formatEther(balance)} MATIC`)

  if (balance === 0n) {
    console.error("❌ Saldo insuficiente. Adicione MATIC à carteira.")
    process.exit(1)
  }

  // Para deploy real, você precisa compilar o .sol primeiro
  // Usando hardhat: npx hardhat compile
  // Depois: const { bytecode, abi } = require("../artifacts/contracts/TurnoPaymentRegistry.json")
  
  console.log("")
  console.log("📋 Próximos passos para deploy:")
  console.log("   1. npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox")
  console.log("   2. npx hardhat compile")
  console.log("   3. npx hardhat run scripts/deploy-contract.ts --network", network)
  console.log("")
  console.log("   Ou use Remix IDE: https://remix.ethereum.org")
  console.log("   Cole o conteúdo de scripts/TurnoPaymentRegistry.sol")
  console.log("   Compile e faça deploy com MetaMask na rede Polygon")
  console.log("")
  console.log("   Após deploy, copie o endereço do contrato para .env:")
  console.log("   CONTRACT_ADDRESS=0x...")
}

deploy().catch(console.error)
