-- Telegram driver-community assistant. All objects are additive and isolated
-- from existing driver, profile, trip, payment, and authentication data.

CREATE TYPE "TelegramKnowledgeStatus" AS ENUM ('DRAFT', 'APPROVED', 'REJECTED', 'RETIRED');
CREATE TYPE "TelegramEscalationStatus" AS ENUM ('PENDING_OWNER', 'ANSWERED_PENDING_APPROVAL', 'RESOLVED_APPROVED', 'RESOLVED_NOT_SAVED');
CREATE TYPE "TelegramUpdateStatus" AS ENUM ('RECEIVED', 'COMPLETED', 'FAILED');

CREATE TABLE "TelegramKnowledgeEntry" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "TelegramKnowledgeStatus" NOT NULL DEFAULT 'DRAFT',
    "source" TEXT NOT NULL DEFAULT 'OWNER',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TelegramKnowledgeEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TelegramEscalation" (
    "id" TEXT NOT NULL,
    "groupChatId" TEXT NOT NULL,
    "groupMessageId" INTEGER NOT NULL,
    "telegramUserId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "ownerPromptMessageId" INTEGER,
    "ownerAnswer" TEXT,
    "status" "TelegramEscalationStatus" NOT NULL DEFAULT 'PENDING_OWNER',
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TelegramEscalation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TelegramProcessedUpdate" (
    "updateId" TEXT NOT NULL,
    "chatId" TEXT,
    "userId" TEXT,
    "status" "TelegramUpdateStatus" NOT NULL DEFAULT 'RECEIVED',
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TelegramProcessedUpdate_pkey" PRIMARY KEY ("updateId")
);

CREATE TABLE "TelegramBotSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TelegramBotSetting_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "TelegramKnowledgeEntry_status_updatedAt_idx" ON "TelegramKnowledgeEntry"("status", "updatedAt");
CREATE UNIQUE INDEX "TelegramEscalation_ownerPromptMessageId_key" ON "TelegramEscalation"("ownerPromptMessageId");
CREATE UNIQUE INDEX "TelegramEscalation_groupChatId_groupMessageId_key" ON "TelegramEscalation"("groupChatId", "groupMessageId");
CREATE INDEX "TelegramEscalation_status_createdAt_idx" ON "TelegramEscalation"("status", "createdAt");
CREATE INDEX "TelegramEscalation_telegramUserId_createdAt_idx" ON "TelegramEscalation"("telegramUserId", "createdAt");
CREATE INDEX "TelegramProcessedUpdate_userId_createdAt_idx" ON "TelegramProcessedUpdate"("userId", "createdAt");
CREATE INDEX "TelegramProcessedUpdate_chatId_createdAt_idx" ON "TelegramProcessedUpdate"("chatId", "createdAt");
CREATE INDEX "TelegramProcessedUpdate_status_updatedAt_idx" ON "TelegramProcessedUpdate"("status", "updatedAt");
