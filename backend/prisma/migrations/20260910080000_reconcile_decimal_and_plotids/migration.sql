-- Reconciles the Supabase-oriented consolidated init migration (which left
-- money columns as DOUBLE PRECISION and plotIds as JSONB) with this
-- schema's Decimal/native-array choices. In the branch this schema was
-- developed on, totalValue/pricePerSqFt/pricePerToken/amount were already
-- Decimal from the very first migration and plotIds was already a native
-- text array, so no earlier migration in this history converts them —
-- this one does, to match what schema.prisma now declares.

ALTER TABLE "listings" ALTER COLUMN "totalValue" TYPE DECIMAL(14,2) USING "totalValue"::DECIMAL(14,2);
ALTER TABLE "listings" ALTER COLUMN "pricePerSqFt" TYPE DECIMAL(14,2) USING "pricePerSqFt"::DECIMAL(14,2);
ALTER TABLE "listings" ALTER COLUMN "pricePerToken" TYPE DECIMAL(14,2) USING "pricePerToken"::DECIMAL(14,2);

ALTER TABLE "transactions" ALTER COLUMN "amount" TYPE DECIMAL(14,2) USING "amount"::DECIMAL(14,2);
ALTER TABLE "transactions" ALTER COLUMN "plotIds" TYPE TEXT[] USING (
  SELECT array_agg(value::text) FROM jsonb_array_elements_text("plotIds") AS value
);

ALTER TABLE "area_price_history" ALTER COLUMN "pricePerSqFt" TYPE DECIMAL(14,2) USING "pricePerSqFt"::DECIMAL(14,2);
