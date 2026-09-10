-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED');
CREATE TYPE "TitleStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');
CREATE TYPE "PlotStatus" AS ENUM ('AVAILABLE', 'PARTIAL', 'SOLD', 'EXCLUDED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "firebaseUid" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "kycStatus" "KycStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "kycPan" TEXT,
    "walletAddress" TEXT,
    "walletPrivateKeyEncrypted" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "users_firebaseUid_key" ON "users"("firebaseUid");
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateTable
CREATE TABLE "listings" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "titleDeedNumber" TEXT NOT NULL,
    "totalValue" DOUBLE PRECISION NOT NULL,
    "areaSqFt" DOUBLE PRECISION NOT NULL,
    "pricePerSqFt" DOUBLE PRECISION NOT NULL,
    "totalTokens" INTEGER NOT NULL,
    "pricePerToken" DOUBLE PRECISION NOT NULL,
    "sqFtPerToken" DOUBLE PRECISION NOT NULL,
    "gridRows" INTEGER NOT NULL DEFAULT 4,
    "gridCols" INTEGER NOT NULL DEFAULT 5,
    "imageSeed" TEXT NOT NULL,
    "titleStatus" "TitleStatus" NOT NULL DEFAULT 'PENDING',
    "titleRejectionReason" TEXT,
    "contractAddress" TEXT,
    "onChainTxHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plots" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "listingId" TEXT NOT NULL,
    "row" INTEGER NOT NULL,
    "col" INTEGER NOT NULL,
    "sellable" BOOLEAN NOT NULL DEFAULT true,
    "totalSqFt" DOUBLE PRECISION NOT NULL,
    "soldSqFt" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "PlotStatus" NOT NULL DEFAULT 'AVAILABLE',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "plots_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "plots_listingId_row_col_key" ON "plots"("listingId", "row", "col");

-- CreateTable
CREATE TABLE "plot_holdings" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "plotId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "sqFt" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "plot_holdings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "plot_holdings_plotId_ownerId_key" ON "plot_holdings"("plotId", "ownerId");

-- CreateTable
CREATE TABLE "holdings" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "listingId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "sqFtOwned" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "plotCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "holdings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "holdings_listingId_ownerId_key" ON "holdings"("listingId", "ownerId");

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "listingId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sqFt" DOUBLE PRECISION NOT NULL,
    "plotIds" JSONB NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "paymentMethod" TEXT,
    "txHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "area_price_history" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "city" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "periodIndex" INTEGER NOT NULL,
    "pricePerSqFt" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "area_price_history_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "area_price_history_city_period_key" ON "area_price_history"("city", "period");

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "plots" ADD CONSTRAINT "plots_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "plot_holdings" ADD CONSTRAINT "plot_holdings_plotId_fkey" FOREIGN KEY ("plotId") REFERENCES "plots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "plot_holdings" ADD CONSTRAINT "plot_holdings_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "holdings" ADD CONSTRAINT "holdings_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "holdings" ADD CONSTRAINT "holdings_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- EnableRowLevelSecurity
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "listings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "plots" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "plot_holdings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "holdings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "transactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "area_price_history" ENABLE ROW LEVEL SECURITY;
