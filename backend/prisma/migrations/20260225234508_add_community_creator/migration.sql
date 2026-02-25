/*
  Warnings:

  - Added the required column `creatorAddress` to the `communities` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "communities" ADD COLUMN     "creatorAddress" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "communities_creatorAddress_idx" ON "communities"("creatorAddress");
