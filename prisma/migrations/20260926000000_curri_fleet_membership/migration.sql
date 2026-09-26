-- Curri fleet membership.
--
-- ADDITIVE ONLY. This migration adds one value to an existing enum and one
-- nullable column to User. It does not drop, rename, truncate, or rewrite any
-- existing table, column, or row. Every existing driver account, profile, trip
-- log, mileage, expense, and P&L record is untouched; fleetJoinedAt is simply
-- NULL for everyone until they join.

-- AlterEnum
ALTER TYPE "PaymentType" ADD VALUE 'FLEET';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "fleetJoinedAt" TIMESTAMP(3);
