-- Remove duplicate labels that only differ in case before adding per-user uniqueness.
DELETE FROM "Tag" t
USING "Tag" d
WHERE lower(t."label") = lower(d."label")
  AND t."id" > d."id";

-- Assign tags to task owners.
ALTER TABLE "Tag" ADD COLUMN "userId" UUID;

UPDATE "Tag" t
SET "userId" = tt."userId"
FROM (
  SELECT DISTINCT ON (tg."id") tg."id", task."userId"
  FROM "Tag" tg
  JOIN "TaskTag" ttag ON ttag."tagId" = tg."id"
  JOIN "Task" task ON task."id" = ttag."taskId"
  ORDER BY tg."id", task."createdAt" ASC
) tt
WHERE t."id" = tt."id";

DELETE FROM "Tag" WHERE "userId" IS NULL;
ALTER TABLE "Tag" ALTER COLUMN "userId" SET NOT NULL;

DROP INDEX IF EXISTS "Tag_label_key";
CREATE UNIQUE INDEX "Tag_userId_label_key" ON "Tag"("userId", "label");

ALTER TABLE "Tag" ADD CONSTRAINT "Tag_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
