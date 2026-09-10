# Implementation Audit

Snapshot of MyAcre as of this branch, against what a judge-proof demo needs. This is a working hackathon MVP, not a gap list to panic over — most of the fundamentals (atomic no-double-sale, real ERC-1155 settlement, honest simulated/real labeling) are already sound.

## What already works

- **No-double-sale, enforced twice**: a guarded raw-SQL `UPDATE ... WHERE ("totalSqFt" - "soldSqFt") >= sqFt` in Postgres (`listings.js:255`), plus a Solidity `require` in `buyChunk` that reverts if a mint would exceed `totalSupplyCap`. Concurrent buyers can't oversell.
- **Real on-chain settlement**: `PropertyToken.sol` is a working ERC-1155 with mint caps, minter-only access control, and events. Deployed to Polygon Amoy testnet, not just described.
- **Honest scope framing**: the README already states plainly what's simulated (KYC, land registry, payments) vs. real (contract, atomic purchase, map/grid UI, DB sync). Good precedent to keep extending rather than overwrite.
- **Clean, small data model**: 7 Prisma models, no dead schema, sensible relations and unique constraints (`@@unique([listingId, row, col])`, etc.).
- **Sound blockchain/DB pattern**: on-chain calls are explicitly best-effort after the DB transaction commits, with the reasoning documented inline. Not silently pretended as atomic — but also not yet reconciled if it fails (see below).

## Gaps that matter for the demo

1. **No verification evidence, just a boolean.** `oracle.js` checks a deed number against a 7-entry array and returns `verified`/`reason`. There's no score breakdown, no per-check evidence, no timestamp/expiry. Judges will ask "what did you actually verify?" — right now the honest answer is "one string match."
2. **No duplicate-asset detection.** Nothing stops the same deed number, same coordinates, and same owner from being listed twice under different titles. This is a named judge question in the brief ("what stops fake properties") with no current answer beyond title-deed uniqueness not even being enforced at the DB level.
3. **No unified "Property Passport" view.** Listing data, valuation, and blockchain proof are three separate API calls and are not presented as one coherent trust dossier anywhere in the UI.
4. **No legal-positioning copy.** Nothing in the UI or docs currently says a token isn't legal title. Given the spec calls this out as a required judge answer, it's cheap risk to leave unaddressed.
5. **Geometry is a grid, not a parcel.** Grid cells are equal-area rectangles laid over lat/lng — useful for the demo, but nothing distinguishes "this is a survey boundary" from "this is a tokenization grid," which matters if a judge assumes the rectangle *is* the surveyed parcel.
6. **Valuation has no fairness/deviation signal.** `buildValuation` returns a trend and a projected price, but nothing compares the *listing's* price to the model's — so "is this listing overpriced" isn't answerable today.
7. **No admin/verifier console.** Verification decisions happen inline at listing-creation time with no review queue, no audit log, no way to flag/freeze a listing after the fact.
8. **No reconciliation state for failed on-chain calls.** If `blockchain.tokenizeProperty` or `buyChunk` throws, the code logs and moves on — the listing/transaction stays in a state that says "succeeded" off-chain with no on-chain proof and no visible flag that a reconciliation is needed.

## What's out of scope for this pass (deliberately deferred)

Full ML training pipeline, GeoJSON parcel geometry, verification-provider plugin architecture, contract lifecycle state machine (DRAFT→FROZEN→CLOSED), wallet-provider abstraction, and the full admin console are real, multi-day pieces of work each. Attempting all of them shallowly in one pass would produce more risk than value — half-wired Prisma models with no tested migrations, docs describing features that don't run. They're not in this pass; each is its own follow-up.

## This pass implements

- Property Passport: one aggregating endpoint + a real passport section on the property detail page, built from data that already exists (no new models).
- Asset-identity duplicate detection at listing-creation time (deed number + geo + owner fingerprint).
- Legal-positioning copy in the UI plus `docs/LEGAL_MODEL.md`.
