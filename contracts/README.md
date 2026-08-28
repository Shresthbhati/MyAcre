# contracts

`PropertyToken.sol` — an ERC-1155 contract where each MyAcre listing is one token id and a holder's balance is the number of square feet they own of that property. One contract serves every listing; `propertyId = uint256(keccak256(bytes(listingUuid)))` so no on-chain counter needs to stay in sync with Postgres.

The backend's server wallet is the sole `minter`: it calls `tokenizeProperty` once a listing clears the oracle check, and `buyChunk` after its own off-chain KYC/payment checks pass. On-chain atomicity comes from Solidity itself — `buyChunk` reverts entirely if the requested sqft would exceed the property's remaining supply, so two buyers racing for the same last square feet can never both succeed.

## Setup

```bash
cd contracts
npm install
cp .env.example .env   # fill in DEPLOYER_PRIVATE_KEY (a funded Amoy testnet wallet)
npm test                # run the unit tests (local Hardhat network, no network needed)
npm run deploy:amoy     # deploy to Polygon Amoy testnet
```

After deploying, copy the printed contract address into `backend/.env` as `CONTRACT_ADDRESS`.

## Tests

`test/PropertyToken.test.js` covers tokenizing, minting, multi-buyer partial ownership, minter/owner access control, and — the key demo claim — that a purchase exceeding the remaining supply reverts atomically with zero state change, proving double-sale can't happen on-chain.
