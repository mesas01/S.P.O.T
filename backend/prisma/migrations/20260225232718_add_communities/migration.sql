-- AlterTable
ALTER TABLE "events" ADD COLUMN     "communityId" INTEGER;

-- CreateTable
CREATE TABLE "communities" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "communities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_members" (
    "id" SERIAL NOT NULL,
    "communityId" INTEGER NOT NULL,
    "address" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "communities_country_idx" ON "communities"("country");

-- CreateIndex
CREATE INDEX "community_members_address_idx" ON "community_members"("address");

-- CreateIndex
CREATE UNIQUE INDEX "community_members_communityId_address_key" ON "community_members"("communityId", "address");

-- CreateIndex
CREATE INDEX "events_communityId_idx" ON "events"("communityId");

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_members" ADD CONSTRAINT "community_members_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
