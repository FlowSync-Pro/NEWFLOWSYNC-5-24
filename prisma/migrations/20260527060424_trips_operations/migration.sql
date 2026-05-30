-- CreateTable
CREATE TABLE "Trip" (
    "id" TEXT NOT NULL,
    "driverProfileId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pickupAddress" TEXT NOT NULL,
    "dropoffAddress" TEXT NOT NULL,
    "earningsCents" INTEGER NOT NULL DEFAULT 0,
    "paidMiles" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deadheadMiles" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fuelCents" INTEGER NOT NULL DEFAULT 0,
    "tollsCents" INTEGER NOT NULL DEFAULT 0,
    "otherExpensesCents" INTEGER NOT NULL DEFAULT 0,
    "durationMinutes" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Trip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inspection" (
    "id" TEXT NOT NULL,
    "driverProfileId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "odometer" INTEGER,
    "passed" BOOLEAN NOT NULL DEFAULT true,
    "items" JSONB NOT NULL DEFAULT '{}',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Inspection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Trip_driverProfileId_date_idx" ON "Trip"("driverProfileId", "date");

-- CreateIndex
CREATE INDEX "Inspection_driverProfileId_date_idx" ON "Inspection"("driverProfileId", "date");

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_driverProfileId_fkey" FOREIGN KEY ("driverProfileId") REFERENCES "DriverProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_driverProfileId_fkey" FOREIGN KEY ("driverProfileId") REFERENCES "DriverProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
