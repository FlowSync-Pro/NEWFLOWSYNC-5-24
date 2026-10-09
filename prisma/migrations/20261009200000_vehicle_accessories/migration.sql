-- Vehicle filter + accessories (owner-approved 2026-10-09).
--
-- ADDITIVE ONLY. Adds one array column to DriverProfile (empty for everyone)
-- and one new, empty table for a driver's extra vehicles. It does not drop,
-- rename, truncate, or rewrite any existing table, column, or row. Every
-- existing driver account, profile, vehicle, trip log, mileage, expense, and
-- P&L record is untouched: the main vehicle stays in DriverProfile.vehicleType
-- / vehicleMakeModel / vehicleYear exactly as before.

-- AlterTable
ALTER TABLE "DriverProfile" ADD COLUMN     "vehicleAccessories" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "DriverVehicle" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "makeModel" TEXT,
    "year" TEXT,
    "vin" TEXT,
    "accessories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriverVehicle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DriverVehicle_profileId_idx" ON "DriverVehicle"("profileId");

-- AddForeignKey
ALTER TABLE "DriverVehicle" ADD CONSTRAINT "DriverVehicle_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "DriverProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

