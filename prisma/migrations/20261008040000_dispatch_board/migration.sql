-- Dispatch board (stage 1a — docs/DISPATCH-FLOW.md).
--
-- ADDITIVE ONLY. Adds four enums, five nullable columns on DriverProfile, and
-- three new tables. It does not drop, rename, truncate, or rewrite any
-- existing table, column, or row. Every existing driver account, profile,
-- trip log, mileage, expense, and P&L record is untouched; the new columns
-- are NULL for everyone and the new tables start empty.

-- CreateEnum
CREATE TYPE "VehicleClass" AS ENUM ('CAR', 'SUV', 'MINIVAN', 'PICKUP_TRUCK', 'CARGO_VAN', 'SPRINTER_VAN', 'BOX_TRUCK');

-- CreateEnum
CREATE TYPE "DispatchLane" AS ENUM ('CLAIM', 'BID');

-- CreateEnum
CREATE TYPE "DispatchStatus" AS ENUM ('NEW', 'OFFERED', 'ASSIGNED', 'PLACED', 'AWARDED', 'LOST', 'IN_PROGRESS', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OfferResponse" AS ENUM ('PENDING', 'ACCEPTED', 'PASSED', 'EXPIRED');

-- AlterTable
ALTER TABLE "DriverProfile" ADD COLUMN     "baseZip" TEXT,
ADD COLUMN     "curriActivatedAt" TIMESTAMP(3),
ADD COLUMN     "dutyMaxTripMiles" INTEGER,
ADD COLUMN     "dutyRadiusMiles" INTEGER,
ADD COLUMN     "onDutyUntil" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "DispatchLoad" (
    "id" TEXT NOT NULL,
    "curriRef" TEXT,
    "lane" "DispatchLane" NOT NULL,
    "status" "DispatchStatus" NOT NULL DEFAULT 'NEW',
    "rush" BOOLEAN NOT NULL DEFAULT false,
    "pickupAt" TIMESTAMP(3) NOT NULL,
    "pickupAddress" TEXT NOT NULL,
    "pickupZip" TEXT NOT NULL,
    "dropoffAddress" TEXT NOT NULL,
    "dropoffZip" TEXT NOT NULL,
    "tripMiles" DOUBLE PRECISION,
    "vehicleClass" "VehicleClass" NOT NULL,
    "listedCents" INTEGER,
    "bidCents" INTEGER,
    "notes" TEXT,
    "assignedProfileId" TEXT,
    "busyUntil" TIMESTAMP(3),
    "payoutId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DispatchLoad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DispatchOffer" (
    "id" TEXT NOT NULL,
    "loadId" TEXT NOT NULL,
    "driverProfileId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "tokenHash" TEXT,
    "response" "OfferResponse" NOT NULL DEFAULT 'PENDING',
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "DispatchOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DispatchEvent" (
    "id" TEXT NOT NULL,
    "loadId" TEXT NOT NULL,
    "actorId" TEXT,
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DispatchEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DispatchLoad_payoutId_key" ON "DispatchLoad"("payoutId");

-- CreateIndex
CREATE INDEX "DispatchLoad_status_createdAt_idx" ON "DispatchLoad"("status", "createdAt");

-- CreateIndex
CREATE INDEX "DispatchLoad_assignedProfileId_status_idx" ON "DispatchLoad"("assignedProfileId", "status");

-- CreateIndex
CREATE INDEX "DispatchOffer_loadId_idx" ON "DispatchOffer"("loadId");

-- CreateIndex
CREATE INDEX "DispatchOffer_driverProfileId_response_idx" ON "DispatchOffer"("driverProfileId", "response");

-- CreateIndex
CREATE INDEX "DispatchEvent_loadId_createdAt_idx" ON "DispatchEvent"("loadId", "createdAt");

-- AddForeignKey
ALTER TABLE "DispatchLoad" ADD CONSTRAINT "DispatchLoad_assignedProfileId_fkey" FOREIGN KEY ("assignedProfileId") REFERENCES "DriverProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchOffer" ADD CONSTRAINT "DispatchOffer_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "DispatchLoad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchOffer" ADD CONSTRAINT "DispatchOffer_driverProfileId_fkey" FOREIGN KEY ("driverProfileId") REFERENCES "DriverProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchEvent" ADD CONSTRAINT "DispatchEvent_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "DispatchLoad"("id") ON DELETE CASCADE ON UPDATE CASCADE;
