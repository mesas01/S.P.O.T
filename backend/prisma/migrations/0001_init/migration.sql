-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "CreatorStatus" AS ENUM ('APPROVED', 'REVOKED');

-- CreateTable
CREATE TABLE "events" (
    "id" SERIAL NOT NULL,
    "eventId" INTEGER NOT NULL,
    "creator" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "eventDate" BIGINT NOT NULL,
    "location" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "maxPoaps" INTEGER NOT NULL,
    "claimStart" BIGINT NOT NULL,
    "claimEnd" BIGINT NOT NULL,
    "metadataUri" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "mintedCount" INTEGER NOT NULL DEFAULT 0,
    "txHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "imageId" INTEGER,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "claims" (
    "id" SERIAL NOT NULL,
    "eventId" INTEGER NOT NULL,
    "claimer" TEXT NOT NULL,
    "tokenId" INTEGER,
    "txHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creators" (
    "id" SERIAL NOT NULL,
    "address" TEXT NOT NULL,
    "status" "CreatorStatus" NOT NULL DEFAULT 'APPROVED',
    "paymentReference" TEXT,
    "txHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "creators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" SERIAL NOT NULL,
    "action" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "txHash" TEXT,
    "payload" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "images" (
    "id" SERIAL NOT NULL,
    "bucket" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "publicUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "events_eventId_key" ON "events"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "events_imageId_key" ON "events"("imageId");

-- CreateIndex
CREATE INDEX "events_creator_idx" ON "events"("creator");

-- CreateIndex
CREATE INDEX "claims_claimer_idx" ON "claims"("claimer");

-- CreateIndex
CREATE UNIQUE INDEX "claims_eventId_claimer_key" ON "claims"("eventId", "claimer");

-- CreateIndex
CREATE UNIQUE INDEX "creators_address_key" ON "creators"("address");

-- CreateIndex
CREATE INDEX "transactions_action_idx" ON "transactions"("action");

-- CreateIndex
CREATE INDEX "transactions_txHash_idx" ON "transactions"("txHash");

-- CreateIndex
CREATE UNIQUE INDEX "images_bucket_key_key" ON "images"("bucket", "key");

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "images"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("eventId") ON DELETE RESTRICT ON UPDATE CASCADE;
