-- A purchase can succeed off-chain (payment + ownership recorded) while its
-- blockchain leg fails or was never attempted. Previously the only signal
-- was a nullable txHash, which can't distinguish "blockchain not configured
-- for this deployment" from "blockchain call failed and needs reconciliation"
-- — both looked identical to the UI. This column makes that distinction real.

CREATE TYPE "BlockchainStatus" AS ENUM ('NOT_CONFIGURED', 'CONFIRMED', 'RECONCILIATION_REQUIRED');

ALTER TABLE "transactions" ADD COLUMN "blockchainStatus" "BlockchainStatus" NOT NULL DEFAULT 'NOT_CONFIGURED';

-- Backfill existing rows: a transaction that already has a txHash was
-- confirmed on-chain; one without a txHash predates this column and its
-- true blockchain state is unknown, so treat it the same as "not
-- configured" rather than falsely flagging it for reconciliation.
UPDATE "transactions" SET "blockchainStatus" = 'CONFIRMED' WHERE "txHash" IS NOT NULL;
