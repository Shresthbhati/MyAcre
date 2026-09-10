# MyAcre

**Blockchain-based fractional real estate ownership** — built by team **CodeCrafters**.

India's land ownership records are paper-based, slow to update, and easy to forge — and real estate investment is locked behind crore-scale entry costs. MyAcre splits a property into small, tradeable digital tokens (sq-ft-precise fractional ownership), runs every listing through a title-verification check, and lets smart contracts mint/transfer ownership atomically so the same square foot can never be sold twice.

## What's built

- **Map-based browsing** — every listing sits on a real map (OpenStreetMap), with its token grid (chunks) overlaid directly on the street imagery at its actual location.
- **Sq-ft-precise fractional ownership** — a property's chunks are priced per square foot; buyers can take a whole chunk or a smaller slice of one, not just fixed-size tokens.
- **Road/common-area exclusion** — property owners mark grid cells that overlap roads or shared areas as non-sellable when listing, so nobody accidentally buys a strip of road.
- **Mock KYC & title-oracle checks** — rule-based simulated verification (no real UIDAI/registry integration, by design — see MVP scope below), with real pass/reject decision states in the UI.
- **Atomic no-double-sale purchases** — enforced twice over: a guarded database transaction off-chain, and an on-chain Solidity `require` that reverts the entire transaction if a purchase would exceed a property's remaining supply.
- **On-chain settlement** — an ERC-1155 contract (`contracts/`) where each listing is one token id and a holder's balance is the sqft they own; the backend mints on the buyer's behalf via an auto-generated custodial wallet, so no one needs their own MetaMask to use the app.
- **Historical price-trend valuation** — a simple linear-regression model over seeded historical price-per-sqft data, shown per listing so buyers can see how prices in that area have moved.
- **Firebase Auth** (email/password + Google) and a full off-chain relational data model (users, listings, holdings, transactions) via Prisma, backed by a hosted Postgres instance on Supabase — no local database install.

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | React (Vite), Tailwind CSS v4, React Router, Leaflet, Firebase Auth |
| Backend | Node.js, Express, Prisma, Postgres (Supabase) |
| Blockchain | Solidity (OpenZeppelin ERC-1155), Hardhat, Polygon Amoy testnet, ethers.js |
| Auth/Identity | Firebase Authentication, Firebase Admin SDK (ID token verification) |

## Repo structure

```
MyAcre/
├── frontend/    React + Tailwind web app
├── backend/     Express API + Prisma/Postgres (Supabase) + blockchain integration
├── contracts/   Solidity contracts (Hardhat), deployed to Polygon Amoy
└── docs/        architecture notes, demo script
```

## Getting started

Each part has its own setup in its README — start here:

```bash
# 1. Frontend
cd frontend
npm install
cp .env.example .env.local   # fill in your Firebase web app config
npm run dev                  # http://localhost:5173

# 2. Backend (separate terminal)
cd backend
npm install
cp .env.example .env         # fill in DATABASE_URL (Supabase pooler string) + FIREBASE_SERVICE_ACCOUNT_JSON
npm run prisma:migrate
node prisma/seed.js          # optional: sample properties
npm run dev                  # http://localhost:4000

# 3. Contracts (optional — the app works fully off-chain without this)
cd contracts
npm install
cp .env.example .env         # fill in DEPLOYER_PRIVATE_KEY (funded Amoy testnet wallet)
npm test                     # run the double-sale-prevention test suite
npm run deploy:amoy          # deploy PropertyToken.sol, then set CONTRACT_ADDRESS/MINTER_PRIVATE_KEY in backend/.env
```

See [`frontend/README.md`](frontend/README.md), [`backend/README.md`](backend/README.md), and [`contracts/README.md`](contracts/README.md) for full detail.

## MVP scope — what's real vs. simulated

This is a hackathon prototype, not a production system. Built for real: the smart contract, the atomic buy/sell flow, the map and grid UI, the database sync. Deliberately simulated: government land registry (small hardcoded sample dataset), Aadhaar/PAN KYC (rule-based check, no UIDAI integration), and payment gateway (mock UPI/card success/failure).
