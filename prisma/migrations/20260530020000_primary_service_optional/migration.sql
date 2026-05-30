-- Allow drivers to skip "main service" at setup and pick it later.
-- AlterTable
ALTER TABLE "DriverProfile" ALTER COLUMN "primaryService" DROP NOT NULL;
