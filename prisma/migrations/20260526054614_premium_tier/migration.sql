-- CreateEnum
CREATE TYPE "Tier" AS ENUM ('STANDARD', 'PREMIUM');

-- AlterTable
ALTER TABLE "DriverProfile" ADD COLUMN     "externalWebsiteUrl" TEXT,
ADD COLUMN     "tier" "Tier" NOT NULL DEFAULT 'STANDARD';

-- CreateTable
CREATE TABLE "DriverService" (
    "id" TEXT NOT NULL,
    "driverProfileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceCents" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DriverService_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DriverService_driverProfileId_idx" ON "DriverService"("driverProfileId");

-- AddForeignKey
ALTER TABLE "DriverService" ADD CONSTRAINT "DriverService_driverProfileId_fkey" FOREIGN KEY ("driverProfileId") REFERENCES "DriverProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
