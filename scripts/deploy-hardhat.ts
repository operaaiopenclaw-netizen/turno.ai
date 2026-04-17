// scripts/deploy-hardhat.ts
// Deploy via Hardhat (usa artifacts compilados por `npx hardhat compile`)
// Uso: npx hardhat run scripts/deploy-hardhat.ts --network amoy
//      npx hardhat run scripts/deploy-hardhat.ts --network polygon

import { ethers } from "hardhat"
import * as fs from "fs"
import * as path from "path"

async function main() {
  const [deployer] = await ethers.getSigners()
  const network    = hre.network.name

  console.log("\n╔══════════════════════════════════════════╗")
  console.log("  🚀  TurnoPaymentRegistry — Deploy")
  console.log("╚══════════════════════════════════════════╝")
  console.log(`  Rede:     ${network}`)
  console.log(`  Deployer: ${deployer.address}`)

  const balance = await ethers.provider.getBalance(deployer.address)
  const balEth  = parseFloat(ethers.formatEther(balance))
  console.log(`  Saldo:    ${balEth.toFixed(4)} MATIC`)

  if (balEth < 0.01) {
    console.error("\n  ❌ Saldo insuficiente.")
    if (network === "amoy") console.log("  Faucet: https://faucet.polygon.technology")
    process.exit(1)
  }

  console.log("\n  Fazendo deploy...")
  const Factory  = await ethers.getContractFactory("TurnoPaymentRegistry")
  const contract = await Factory.deploy(deployer.address)
  await contract.waitForDeployment()

  const address = await contract.getAddress()
  const tx      = contract.deploymentTransaction()

  const explorer = network === "amoy"
    ? `https://amoy.polygonscan.com/address/${address}`
    : `https://polygonscan.com/address/${address}`

  console.log("\n  ✅ Deploy concluído!")
  console.log(`  Endereço:  ${address}`)
  console.log(`  Tx Hash:   ${tx?.hash}`)
  console.log(`  Explorer:  ${explorer}`)
  console.log("\n  Adicione ao .env:")
  console.log(`  CONTRACT_ADDRESS="${address}"`)
  console.log(`  BLOCKCHAIN_NETWORK="${network === "amoy" ? "amoy" : "mainnet"}"`)
  console.log("")

  fs.writeFileSync(
    path.resolve(__dirname, `../deployment-${network}.json`),
    JSON.stringify({
      network, address, txHash: tx?.hash,
      deployer: deployer.address,
      operator: deployer.address,
      deployedAt: new Date().toISOString(),
      explorer,
    }, null, 2)
  )
  console.log(`  Salvo em: deployment-${network}.json\n`)
}

declare const hre: { network: { name: string } }
main().catch(e => { console.error("❌", e.message); process.exit(1) })
