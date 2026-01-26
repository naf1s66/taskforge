ALTER TABLE "Task" ADD COLUMN "board_order" INTEGER NOT NULL DEFAULT 0;

WITH ranked AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "userId", "status"
      ORDER BY "updatedAt" DESC, "id"
    ) - 1 AS row_num
  FROM "Task"
)
UPDATE "Task"
SET "board_order" = ranked.row_num
FROM ranked
WHERE "Task"."id" = ranked."id";
