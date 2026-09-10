-- Money is already Decimal(14,2); area/sqft columns were left as Float
-- (double precision), which accumulates IEEE-754 rounding error across many
-- small increments (e.g. repeated "soldSqFt" += purchase updates). Moving
-- them to Decimal(14,2) makes ownership-unit arithmetic exact, matching how
-- totalValue/pricePerSqFt/pricePerToken already work.

ALTER TABLE "listings" ALTER COLUMN "areaSqFt" TYPE DECIMAL(14,2) USING "areaSqFt"::DECIMAL(14,2);
ALTER TABLE "listings" ALTER COLUMN "sqFtPerToken" TYPE DECIMAL(14,2) USING "sqFtPerToken"::DECIMAL(14,2);

ALTER TABLE "plots" ALTER COLUMN "totalSqFt" TYPE DECIMAL(14,2) USING "totalSqFt"::DECIMAL(14,2);
ALTER TABLE "plots" ALTER COLUMN "soldSqFt" TYPE DECIMAL(14,2) USING "soldSqFt"::DECIMAL(14,2);
ALTER TABLE "plots" ALTER COLUMN "soldSqFt" SET DEFAULT 0;

ALTER TABLE "plot_holdings" ALTER COLUMN "sqFt" TYPE DECIMAL(14,2) USING "sqFt"::DECIMAL(14,2);

ALTER TABLE "holdings" ALTER COLUMN "sqFtOwned" TYPE DECIMAL(14,2) USING "sqFtOwned"::DECIMAL(14,2);
ALTER TABLE "holdings" ALTER COLUMN "sqFtOwned" SET DEFAULT 0;

ALTER TABLE "transactions" ALTER COLUMN "sqFt" TYPE DECIMAL(14,2) USING "sqFt"::DECIMAL(14,2);
