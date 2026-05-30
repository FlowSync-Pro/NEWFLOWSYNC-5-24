-- AlterTable
ALTER TABLE "Trip" ADD COLUMN     "photos" TEXT[] DEFAULT ARRAY[]::TEXT[];
