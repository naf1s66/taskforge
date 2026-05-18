ALTER TABLE "Tag" ADD COLUMN "userId" UUID;
ALTER TABLE "TaskTag" ADD COLUMN "userId" UUID;

CREATE TEMP TABLE "_TaskTagBackfill" ON COMMIT DROP AS
SELECT DISTINCT
  ttag."taskId",
  task."userId",
  lower(trim(tag."label")) AS "label"
FROM "TaskTag" ttag
JOIN "Task" task ON task."id" = ttag."taskId"
JOIN "Tag" tag ON tag."id" = ttag."tagId"
WHERE lower(trim(tag."label")) <> '';

DROP INDEX IF EXISTS "Tag_label_key";

DELETE FROM "TaskTag";
DELETE FROM "Tag";

INSERT INTO "Tag" ("id", "userId", "label")
SELECT gen_random_uuid(), backfill."userId", backfill."label"
FROM (
  SELECT DISTINCT "userId", "label"
  FROM "_TaskTagBackfill"
) backfill;

INSERT INTO "TaskTag" ("taskId", "tagId", "userId")
SELECT backfill."taskId", tag."id", backfill."userId"
FROM "_TaskTagBackfill" backfill
JOIN "Tag" tag
  ON tag."userId" = backfill."userId"
 AND tag."label" = backfill."label"
ON CONFLICT ("taskId", "tagId") DO NOTHING;

ALTER TABLE "Tag" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "TaskTag" ALTER COLUMN "userId" SET NOT NULL;

ALTER TABLE "TaskTag" DROP CONSTRAINT "TaskTag_taskId_fkey";
ALTER TABLE "TaskTag" DROP CONSTRAINT "TaskTag_tagId_fkey";

CREATE UNIQUE INDEX "Task_id_userId_key" ON "Task"("id", "userId");
CREATE UNIQUE INDEX "Tag_id_userId_key" ON "Tag"("id", "userId");
CREATE UNIQUE INDEX "Tag_userId_label_key" ON "Tag"("userId", "label");
CREATE INDEX "TaskTag_userId_idx" ON "TaskTag"("userId");

ALTER TABLE "Tag" ADD CONSTRAINT "Tag_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TaskTag" ADD CONSTRAINT "TaskTag_taskId_userId_fkey"
  FOREIGN KEY ("taskId", "userId") REFERENCES "Task"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TaskTag" ADD CONSTRAINT "TaskTag_tagId_userId_fkey"
  FOREIGN KEY ("tagId", "userId") REFERENCES "Tag"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;
