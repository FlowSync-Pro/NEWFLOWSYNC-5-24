-- Driver experience, ratings, and credentials.
--
-- ADDITIVE ONLY. This migration creates two new (empty) tables, one new enum,
-- and adds one new column to Trip. It does not drop, rename, truncate, or
-- rewrite any existing table, column, or row. Existing driver accounts,
-- profiles, trip logs, mileage, expenses, and P&L data are untouched.

-- CreateEnum
CREATE TYPE "LicenseKind" AS ENUM ('TWIC', 'HAZMAT', 'TANKER', 'DOUBLES_TRIPLES', 'CDL_A', 'CDL_B', 'CDL_C', 'PASSENGER', 'AIR_BRAKES', 'FORKLIFT', 'MEDICAL_CARD', 'OSHA_10', 'OTHER');

-- AlterTable
-- Opt-in list of delivery photos a driver has approved for their public
-- profile. Existing trips get an empty array; their private `photos` column is
-- left exactly as-is and stays private.
ALTER TABLE "Trip" ADD COLUMN     "publicPhotos" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "VerifiedLoad" (
    "id" TEXT NOT NULL,
    "driverProfileId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pickupCity" TEXT NOT NULL,
    "dropoffCity" TEXT NOT NULL,
    "loadType" TEXT,
    "rating" INTEGER,
    "publicNote" TEXT,
    "adminNote" TEXT,
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "photosPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerifiedLoad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverLicense" (
    "id" TEXT NOT NULL,
    "driverProfileId" TEXT NOT NULL,
    "kind" "LicenseKind" NOT NULL,
    "customLabel" TEXT,
    "blobUrl" TEXT NOT NULL,
    "status" "DocStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3),
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "DriverLicense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VerifiedLoad_driverProfileId_date_idx" ON "VerifiedLoad"("driverProfileId", "date");

-- CreateIndex
CREATE INDEX "VerifiedLoad_driverProfileId_rating_idx" ON "VerifiedLoad"("driverProfileId", "rating");

-- CreateIndex
CREATE INDEX "DriverLicense_driverProfileId_idx" ON "DriverLicense"("driverProfileId");

-- CreateIndex
CREATE INDEX "DriverLicense_status_idx" ON "DriverLicense"("status");

-- AddForeignKey
ALTER TABLE "VerifiedLoad" ADD CONSTRAINT "VerifiedLoad_driverProfileId_fkey" FOREIGN KEY ("driverProfileId") REFERENCES "DriverProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverLicense" ADD CONSTRAINT "DriverLicense_driverProfileId_fkey" FOREIGN KEY ("driverProfileId") REFERENCES "DriverProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
