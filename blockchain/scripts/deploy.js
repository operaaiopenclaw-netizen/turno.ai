import { ethers } from "hardhat"
import { writeFileSync } from "fs"
import { config as dotenvConfig } from "dotenv"
import { resolve } from "path"

dotenvConfig({ path: resolve(process.cwd(), "../.env") })

async function main() {
  const [deployer] = await ethers.getSigners()
  console.log("Deploying with:", deployer.address)

  const balance = await ethers.provider.getBalance(deployer.address)
  console.log("Balance:", ethers.formatEther(balance), "MATIC")

  const Factory   = await ethers.getContractFactory("TurnoPaymentRegistry")
  const contract  = await Factory.deploy(deployer.address)
  await contract.waitForDeployment()

  const address = await contract.getAddress()
  const network = (await ethers.provider.getNetwork()).name

  console.log("\n✅ TurnoPaymentRegistry deployed!")
  console.log("Address:", address)
  console.log("Network:", network)
  console.log("\nAdd to .env:\n  CONTRACT_ADDRESS=\"" + address + "\"")

  writeFileSync(
    `deployment-${network}.json`,
    JSON.stringify({ address, network, deployer: deployer.address, deployedAt: new Date().toISOString() }, null, 2)
  )
}

main().catch(e => { console.error(e); process.exit(1) })
