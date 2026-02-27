-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "contractErrorCode" INTEGER;

-- CreateIndex
CREATE INDEX "transactions_contractErrorCode_idx" ON "transactions"("contractErrorCode");
