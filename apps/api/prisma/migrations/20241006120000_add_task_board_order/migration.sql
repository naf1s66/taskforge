-- AlterTable
ALTER TABLE "Task" ADD COLUMN "boardOrder" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Task_userId_status_boardOrder_idx" ON "Task"("userId", "status", "boardOrder");
