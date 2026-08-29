# backend

Node.js/Express API + Prisma/PostgreSQL. Verifies Firebase ID tokens (Firebase Admin SDK) for authenticated routes; the frontend still owns registration/login via Firebase Auth — this API only stores off-chain data (KYC status, listings, holdings, transactions) keyed by Firebase UID.

## Setup

```bash
cd backend
npm install
cp .env.example .env   # fill in DATABASE_URL (Neon) and FIREBASE_SERVICE_ACCOUNT_JSON
npm run prisma:migrate       # creates tables from prisma/schema.prisma
npm run dev                  # starts on http://localhost:4000
```

## Endpoints

- `GET /api/health` — reports whether DB/Firebase Admin are configured
- `POST /api/users/sync` — upsert the current Firebase user into Postgres (call after login/register)
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

**Neon/Prisma gotcha**: the buy endpoint's transaction does several round-trips (guarded raw `UPDATE`, holding upserts, transaction record). Against Neon's pooled connection without `pgbouncer=true` (or against a connection with a tight/default Prisma transaction timeout), this can fail with `Transaction not found` once round-trip latency adds up — see `.env.example` and the `{ timeout: 15000, maxWait: 10000 }` options passed to `prisma.$transaction` in `src/routes/listings.js`.

**Network gotcha**: some networks block outbound TCP on port 5432 (Postgres's usual port) while leaving normal HTTPS (443) open — this happened on the dev machine mid-project. `src/lib/prisma.js` connects via `@neondatabase/serverless` + `@prisma/adapter-neon`, which tunnels the connection over a WebSocket on 443 instead, sidestepping that restriction entirely (and making the app resilient if the same thing happens at a demo venue). `DATABASE_URL` stays the same either way — no config changes needed for this, it's purely in how `src/lib/prisma.js` constructs the client. `prisma migrate`/`prisma db seed` still connect directly (they don't go through this adapter), so a fresh clone still needs raw TCP/5432 open once, to run migrations.
