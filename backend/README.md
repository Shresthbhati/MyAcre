# backend

Node.js/Express API + Prisma/SQLite. Verifies Firebase ID tokens (Firebase Admin SDK) for authenticated routes; the frontend still owns registration/login via Firebase Auth — this API only stores off-chain data (KYC status, listings, holdings, transactions) keyed by Firebase UID.

## Setup

```bash
cd backend
npm install
cp .env.example .env   # SQLite works out of the box; fill in FIREBASE_SERVICE_ACCOUNT_JSON
npm run prisma:migrate       # creates the local dev.db from prisma/schema.prisma
node prisma/seed.js          # optional: sample properties
npm run dev                  # starts on http://localhost:4000
```

Swapping to Postgres for a real deployment: change `datasource db { provider = "postgresql" }` in `prisma/schema.prisma`, point `DATABASE_URL` at a Postgres connection string, and re-run `npm run prisma:migrate`. Nothing else in the codebase is SQLite-specific.

## Endpoints

- `GET /api/health` — reports whether DB/Firebase Admin are configured
- `POST /api/users/sync` — upsert the current Firebase user into the database (call after login/register)
- `GET /api/users/me` — current user's profile + KYC status
- `GET /api/users/me/holdings` — current user's sqft holdings across all listings
- `GET /api/users/me/transactions` — current user's transaction history
- `POST /api/kyc/verify` — mock rule-based PAN check, updates KYC status
- `GET /api/kyc/status` — current KYC status
- `GET /api/listings` — public map dataset (verified listings only)
- `GET /api/listings/:id` — listing detail including its full plot grid
- `GET /api/listings/:id/valuation` — historical price/sqft trend for the listing's city + a linear-regression projection (see `src/lib/valuation.js`)
- `POST /api/listings` — list a property (KYC-gated); runs the mock oracle (`src/lib/oracle.js`) against `titleDeedNumber`; `excludedCells: [{row, col}]` marks non-sellable grid cells (roads/common area)
- `POST /api/listings/:id/buy` — atomically buy sq-ft-precise `selections: [{ plotId, sqFt }]` — can be a whole chunk or a partial slice of one

All routes except `/api/health`, `GET /api/listings`, `GET /api/listings/:id`, and the valuation endpoint require `Authorization: Bearer <firebase-id-token>`.

**Concurrency note**: the buy endpoint's transaction reads each plot's remaining sqft and writes the update inside a single Prisma interactive transaction (`src/routes/listings.js`). SQLite serializes write transactions (only one commits at a time), so a concurrent buyer racing for the same plot either sees this transaction's committed state or is blocked until it commits — that's what prevents a double-sale here, in place of the guarded atomic `UPDATE ... WHERE` a multi-writer database like Postgres needs for the same guarantee.
