# Legal Model

MyAcre is a hackathon prototype of a technology layer, not a production legal or financial product. This doc exists so the UI's claims stay honest and a judge's legal questions have a straight answer.

## The core distinction

A blockchain token minted by `PropertyToken.sol` is **not** legal title to Indian immovable property. Four separate layers exist, and MyAcre keeps them distinct rather than collapsing them into "the NFT is the deed":

1. **Legal / physical asset** — the actual land or building, governed by India's existing property-registration law (Registration Act, state stamp-duty rules, RERA where applicable).
2. **Verified digital property record** — MyAcre's Property Passport: the off-chain evidence and checks (title-deed match, geometry consistency, valuation) recorded in Postgres.
3. **Digital fractional representation** — the ERC-1155 balance a buyer holds, representing a proportional economic interest, not a surveyed physical parcel.
4. **Blockchain settlement/audit layer** — the immutable record of who was minted how much, when, enforced by the contract's supply cap.

## What blockchain actually buys here

Not "proof of ownership" — Postgres could store that. What the chain adds:

- **Atomicity**: a mint either fully succeeds or fully reverts, so two buyers racing for the same square footage can't both win.
- **Independent verifiability**: anyone can check the contract's state without trusting MyAcre's database.
- **Tamper-evident history**: a settlement, once mined, can't be quietly edited.

## What a real deployment would need

Fractional participation in Indian real estate at this scale is the domain SM REITs (SEBI-regulated Small and Medium REITs) already occupy — a real MyAcre would need to operate within that framework (or an equivalent regulated structure), not around it. It would also need genuine registry integration (state land records, not a 7-entry demo array) and a real KYC provider (UIDAI/Aadhaar-based, not a PAN-format check).

## What's simulated in this build

- **KYC**: PAN-format validation only. No UIDAI/Aadhaar integration.
- **Land registry**: a hardcoded sample deed-number list (`backend/src/lib/oracle.js`). No connection to any actual state land-records system.
- **Payments**: mock UPI/card success/failure, no PSP integration.

## UI language

The app avoids "own this land" phrasing for fractional purchases. Preferred terms: **verified asset**, **fractional digital representation**, **beneficial/economic participation**, **blockchain settlement**. The Property Passport and purchase flow carry an explicit demo-scope disclaimer for this reason.
