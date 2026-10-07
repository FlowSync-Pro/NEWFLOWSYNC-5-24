-- Fleet payouts (Stripe Connect phase 2): pay a driver per completed delivery.
--
-- ADDITIVE ONLY. Adds two enums, one column on User (with a default) and one
-- new table. It does not drop, rename, truncate, or rewrite any existing
-- table, column, or row. Every existing driver account, profile, trip log,
-- mileage, expense, and P&L record is untouched; payPlan is simply STANDARD
-- for everyone and the payouts table starts empty.

-- CreateEnum
CREATE TYPE "PayPlan" AS ENUM ('STANDARD', 'FASTER');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'CANCELLED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "payPlan" "PayPlan" NOT NULL DEFAULT 'STANDARD';

-- CreateTable
CREATE TABLE "DriverPayout" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "loadCents" INTEGER NOT NULL,
    "feePercent" INTEGER NOT NULL,
    "feeCents" INTEGER NOT NULL,
    "netCents" INTEGER NOT NULL,
    "note" TEXT,
    "deliveredOn" TIMESTAMP(3) NOT NULL,
    "stripeTransferId" TEXT,
    "paidAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriverPayout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DriverPayout_stripeTransferId_key" ON "DriverPayout"("stripeTransferId");

-- CreateIndex
CREATE INDEX "DriverPayout_userId_status_idx" ON "DriverPayout"("userId", "status");

-- CreateIndex
CREATE INDEX "DriverPayout_status_createdAt_idx" ON "DriverPayout"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "DriverPayout" ADD CONSTRAINT "DriverPayout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
