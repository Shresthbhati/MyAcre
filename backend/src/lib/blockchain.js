const { ethers } = require('ethers')
const abi = require('./PropertyTokenAbi.json')

const AMOY_RPC_URL = process.env.AMOY_RPC_URL || 'https://rpc-amoy.polygon.technology'
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS
const MINTER_PRIVATE_KEY = process.env.MINTER_PRIVATE_KEY

const isBlockchainConfigured = Boolean(CONTRACT_ADDRESS && MINTER_PRIVATE_KEY)

let contract = null
let minterWallet = null

if (isBlockchainConfigured) {
  const provider = new ethers.JsonRpcProvider(AMOY_RPC_URL)
  minterWallet = new ethers.Wallet(MINTER_PRIVATE_KEY, provider)
  contract = new ethers.Contract(CONTRACT_ADDRESS, abi, minterWallet)
}

// Derives the on-chain uint256 token id for a listing from its UUID —
// no on-chain counter needs to stay in sync with Postgres. Must match
// contracts/test/PropertyToken.test.js's propertyIdFor exactly.
function propertyIdFor(listingId) {
  return BigInt(ethers.keccak256(ethers.toUtf8Bytes(listingId)))
}

// Solidity balances are integers — sqft is rounded to the nearest whole
// unit on-chain. Postgres (Float) stays the precise source of truth for
// pricing; the chain is the public, tamper-proof ownership ledger.
function toChainSqFt(sqFt) {
  return BigInt(Math.round(Number(sqFt)))
}

async function generateWallet() {
  const wallet = ethers.Wallet.createRandom()
  return { address: wallet.address, privateKey: wallet.privateKey }
}

async function tokenizeProperty(listingId, totalSqFt) {
  if (!isBlockchainConfigured) return null
  const tx = await contract.tokenizeProperty(propertyIdFor(listingId), toChainSqFt(totalSqFt))
  const receipt = await tx.wait()
  return receipt.hash
}

async function buyChunk(listingId, buyerAddress, sqFt) {
  if (!isBlockchainConfigured) return null
  const tx = await contract.buyChunk(propertyIdFor(listingId), buyerAddress, toChainSqFt(sqFt))
  const receipt = await tx.wait()
  return receipt.hash
}

module.exports = {
  isBlockchainConfigured,
  contractAddress: CONTRACT_ADDRESS,
  propertyIdFor,
  generateWallet,
  tokenizeProperty,
  buyChunk,
}
