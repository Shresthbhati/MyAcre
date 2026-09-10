# backend

Node.js/Express API + Prisma/Postgres (hosted on Supabase). Verifies Firebase ID tokens (Firebase Admin SDK) for authenticated routes; the frontend still owns registration/login via Firebase Auth — this API only stores off-chain data (KYC status, listings, holdings, transactions) keyed by Firebase UID.

## Setup

```bash
cd backend
npm install
cp .env.example .env   # fill in DATABASE_URL (Supabase pooler string) + FIREBASE_SERVICE_ACCOUNT_JSON
npm run prisma:migrate       # creates tables from prisma/schema.prisma
node prisma/seed.js          # optional: sample properties
npm run dev                  # starts on http://localhost:4000
```

Get `DATABASE_URL` from Supabase: dashboard → your project → **Connect** → **Transaction pooler** connection string. Use the pooler (not the direct connection) — it's IPv4-reachable and works from anywhere, whereas the direct connection is IPv6-only on most Supabase plans.

**If you're pointing at the project already provisioned for this repo** (schema applied directly via the Supabase MCP tools rather than through a local `prisma migrate`), tell Prisma that migration is already applied instead of re-running it:
```bash
npx prisma migrate resolve --applied 20260909193000_init_postgres
```
A brand-new/empty Supabase project doesn't need this — `npm run prisma:migrate` applies it normally.

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

**Concurrency note**: the buy endpoint's transaction does several round-trips (guarded raw `UPDATE`, holding upserts, transaction record). Against Supabase's pooled connection without `pgbouncer=true` (or a tight/default Prisma transaction timeout), this can fail with `Transaction not found` once round-trip latency adds up — see `.env.example` and the `{ timeout: 15000, maxWait: 10000 }` options passed to `prisma.$transaction` in `src/routes/listings.js`. The double-sale guard itself is a single atomic `UPDATE ... WHERE ("totalSqFt" - "soldSqFt") >= sqFt` — Postgres locks that row for the transaction's duration, so a concurrent buyer either sees the updated `soldSqFt` or is blocked, never both succeeding.
