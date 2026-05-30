-- P&L Tracker Pro: $17/mo subscription fields + cloud-saved tracker data on User.
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "pnlSubStatus" TEXT,
ADD COLUMN     "pnlSubId" TEXT,
ADD COLUMN     "pnlSubCurrentPeriodEnd" TIMESTAMP(3),
ADD COLUMN     "pnlData" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "User_pnlSubId_key" ON "User"("pnlSubId");
