-- Fix 7, marketing email groundwork. ADDITIVE ONLY: one new nullable column on
-- "User" and one new table. No existing column or row is changed or removed.
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "marketingOptOutAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scheduledFor" TIMESTAMP(3),
    "resendId" TEXT,
    "cancelledAt" TIMESTAMP(3),

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailLog_sentAt_idx" ON "EmailLog"("sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmailLog_userId_kind_key" ON "EmailLog"("userId", "kind");

-- AddForeignKey
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
