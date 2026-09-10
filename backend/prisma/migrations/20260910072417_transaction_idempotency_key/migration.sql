-- Lets a client-supplied Idempotency-Key header dedupe retried /buy requests
-- per buyer. Postgres unique indexes treat NULL as distinct from every other
-- NULL, so this constraint only ever rejects a real repeat of the same
-- (buyer, key) pair — ordinary buys that send no header are unaffected.

ALTER TABLE "transactions" ADD COLUMN "idempotencyKey" TEXT;

CREATE UNIQUE INDEX "transactions_buyerId_idempotencyKey_key" ON "transactions"("buyerId", "idempotencyKey");
