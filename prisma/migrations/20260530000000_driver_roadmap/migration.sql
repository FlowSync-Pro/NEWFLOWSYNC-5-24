-- Driver Roadmap: per-user progress (completed task ids + daily check-in dates).
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "roadmapData" JSONB;
