# backend

Node.js/Express API + Prisma/PostgreSQL. Verifies Firebase ID tokens (Firebase Admin SDK) for authenticated routes; the frontend still owns registration/login via Firebase Auth — this API only stores off-chain data (KYC status, listings, holdings, transactions) keyed by Firebase UID.

## Setup

```bash
cd backend
npm install
cp .env.example .env.local   # fill in DATABASE_URL (Neon) and FIREBASE_SERVICE_ACCOUNT_JSON
npm run prisma:migrate       # creates tables from prisma/schema.prisma
npm run dev                  # starts on http://localhost:4000
```

## Endpoints (Phase 2)

- `GET /api/health` — reports whether DB/Firebase Admin are configured
- `POST /api/users/sync` — upsert the current Firebase user into Postgres (call after login/register)
- `GET /api/users/me` — current user's profile + KYC status
- `POST /api/kyc/verify` — mock rule-based PAN check, updates KYC status
- `GET /api/kyc/status` — current KYC status

All routes except `/api/health` require `Authorization: Bearer <firebase-id-token>`.

Listings/holdings/transactions tables exist in the schema now but their endpoints land in Phase 4/5 (Sell & Tokenize, Browse & Buy).
