-- Stripe Connect (Express) accounts for fleet payouts.
--
-- ADDITIVE ONLY. Adds three columns to User — two nullable, one boolean with a
-- default — and a unique index on the new account id. It does not drop,
-- rename, truncate, or rewrite any existing table, column, or row. Every
-- existing driver account, profile, trip log, mileage, expense, and P&L record
-- is untouched; the new columns are simply NULL / false for everyone until a
-- driver sets up payouts.

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "stripeConnectAccountId" TEXT,
ADD COLUMN     "stripeConnectOnboardedAt" TIMESTAMP(3),
ADD COLUMN     "stripeConnectPayoutsEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeConnectAccountId_key" ON "User"("stripeConnectAccountId");
