const hre = require('hardhat')

async function main() {
  const [deployer] = await hre.ethers.getSigners()
  console.log('Deploying PropertyToken with account:', deployer.address)

  const balance = await hre.ethers.provider.getBalance(deployer.address)
  console.log('Deployer balance:', hre.ethers.formatEther(balance), 'MATIC')

  // The deployer wallet is also the initial minter — the same server wallet
  // the backend uses to call tokenizeProperty/buyChunk.
  const PropertyToken = await hre.ethers.getContractFactory('PropertyToken')
  const token = await PropertyToken.deploy(deployer.address)
  await token.waitForDeployment()

  const address = await token.getAddress()
  console.log('PropertyToken deployed to:', address)
  console.log('\nAdd this to backend/.env:')
  console.log(`CONTRACT_ADDRESS=${address}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
