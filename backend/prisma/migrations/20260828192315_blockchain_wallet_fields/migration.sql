-- AlterTable
ALTER TABLE "listings" ADD COLUMN     "onChainTxHash" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "walletPrivateKeyEncrypted" TEXT;
