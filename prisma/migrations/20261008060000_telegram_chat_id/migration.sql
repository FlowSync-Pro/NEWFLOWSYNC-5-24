-- Dispatch stage 1b (docs/DISPATCH-FLOW.md): the driver's private Telegram chat.
--
-- ADDITIVE ONLY. Adds one nullable column to User and a unique index on it.
-- It does not drop, rename, truncate, or rewrite any existing table, column,
-- or row. Every existing driver account, profile, trip log, mileage, expense,
-- and P&L record is untouched; the column is NULL until a driver links.

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "telegramChatId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_telegramChatId_key" ON "User"("telegramChatId");
