-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firebaseUid" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "kycStatus" TEXT NOT NULL DEFAULT 'UNVERIFIED',
    "kycPan" TEXT,
    "walletAddress" TEXT,
    "walletPrivateKeyEncrypted" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "listings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "latitude" REAL NOT NULL,
    "longitude" REAL NOT NULL,
    "titleDeedNumber" TEXT NOT NULL,
    "totalValue" REAL NOT NULL,
    "areaSqFt" REAL NOT NULL,
    "pricePerSqFt" REAL NOT NULL,
    "totalTokens" INTEGER NOT NULL,
    "pricePerToken" REAL NOT NULL,
    "sqFtPerToken" REAL NOT NULL,
    "gridRows" INTEGER NOT NULL DEFAULT 4,
    "gridCols" INTEGER NOT NULL DEFAULT 5,
    "imageSeed" TEXT NOT NULL,
    "titleStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "titleRejectionReason" TEXT,
    "contractAddress" TEXT,
    "onChainTxHash" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "listings_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "plots" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "listingId" TEXT NOT NULL,
    "row" INTEGER NOT NULL,
    "col" INTEGER NOT NULL,
    "sellable" BOOLEAN NOT NULL DEFAULT true,
    "totalSqFt" REAL NOT NULL,
    "soldSqFt" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "plots_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "plot_holdings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "plotId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "sqFt" REAL NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "plot_holdings_plotId_fkey" FOREIGN KEY ("plotId") REFERENCES "plots" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "plot_holdings_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "holdings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "listingId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "sqFtOwned" REAL NOT NULL DEFAULT 0,
    "plotCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "holdings_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "holdings_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "listingId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sqFt" REAL NOT NULL,
    "plotIds" JSONB NOT NULL,
    "amount" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentMethod" TEXT,
    "txHash" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "transactions_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "transactions_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "area_price_history" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "city" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "periodIndex" INTEGER NOT NULL,
    "pricePerSqFt" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "users_firebaseUid_key" ON "users"("firebaseUid");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "plots_listingId_row_col_key" ON "plots"("listingId", "row", "col");

-- CreateIndex
CREATE UNIQUE INDEX "plot_holdings_plotId_ownerId_key" ON "plot_holdings"("plotId", "ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "holdings_listingId_ownerId_key" ON "holdings"("listingId", "ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "area_price_history_city_period_key" ON "area_price_history"("city", "period");
