# MyAcre

Blockchain-based fractional real estate ownership — Smart India Hackathon 2026, Problem Statement SIH26204, team CodeCrafters.

MyAcre splits physical property into small, tradeable digital tokens. Smart contracts atomically verify payment and transfer ownership; every transaction is recorded permanently on-chain.

## Structure

- `frontend/` — React + Tailwind web app (Vite), Firebase Auth
- `backend/` — Node/Express API (Phase 2+)
- `contracts/` — Solidity contracts, Hardhat, Polygon Amoy testnet (Phase 3+)
- `docs/` — architecture notes, demo script

## Getting started (frontend)

```bash
cd frontend
npm install
cp .env.example .env.local   # fill in your Firebase project's web app config
npm run dev
```

## Build status

See the phased roadmap for what's built vs. mocked at each stage. Currently: Phase 0 (scaffold) and Phase 1 (frontend shell + landing page) are in place.
