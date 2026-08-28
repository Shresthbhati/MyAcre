/*
  Warnings:

  - You are about to drop the column `quantity` on the `holdings` table. All the data in the column will be lost.
  - You are about to drop the column `ownerId` on the `plots` table. All the data in the column will be lost.
  - You are about to drop the column `quantity` on the `transactions` table. All the data in the column will be lost.
  - Added the required column `areaSqFt` to the `listings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pricePerSqFt` to the `listings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sqFtPerToken` to the `listings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalSqFt` to the `plots` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sqFt` to the `transactions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PlotStatus" ADD VALUE 'PARTIAL';
ALTER TYPE "PlotStatus" ADD VALUE 'EXCLUDED';

-- DropForeignKey
ALTER TABLE "plots" DROP CONSTRAINT "plots_ownerId_fkey";

-- AlterTable
ALTER TABLE "holdings" DROP COLUMN "quantity",
ADD COLUMN     "plotCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sqFtOwned" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "listings" ADD COLUMN     "areaSqFt" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "pricePerSqFt" DECIMAL(14,2) NOT NULL,
ADD COLUMN     "sqFtPerToken" DOUBLE PRECISION NOT NULL;

-- AlterTable
ALTER TABLE "plots" DROP COLUMN "ownerId",
ADD COLUMN     "sellable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "soldSqFt" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "totalSqFt" DOUBLE PRECISION NOT NULL;

-- AlterTable
ALTER TABLE "transactions" DROP COLUMN "quantity",
ADD COLUMN     "sqFt" DOUBLE PRECISION NOT NULL;

-- CreateTable
CREATE TABLE "plot_holdings" (
    "id" TEXT NOT NULL,
    "plotId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "sqFt" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plot_holdings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "area_price_history" (
    "id" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "periodIndex" INTEGER NOT NULL,
    "pricePerSqFt" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "area_price_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plot_holdings_plotId_ownerId_key" ON "plot_holdings"("plotId", "ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "area_price_history_city_period_key" ON "area_price_history"("city", "period");

-- AddForeignKey
ALTER TABLE "plot_holdings" ADD CONSTRAINT "plot_holdings_plotId_fkey" FOREIGN KEY ("plotId") REFERENCES "plots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plot_holdings" ADD CONSTRAINT "plot_holdings_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
