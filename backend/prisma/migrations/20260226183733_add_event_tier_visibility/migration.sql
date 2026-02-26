-- CreateEnum
CREATE TYPE "EventTier" AS ENUM ('FREE', 'BASIC', 'PREMIUM');

-- CreateEnum
CREATE TYPE "EventVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "tier" "EventTier" NOT NULL DEFAULT 'FREE',
ADD COLUMN     "visibility" "EventVisibility" NOT NULL DEFAULT 'PUBLIC';
