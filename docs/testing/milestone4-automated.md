# Milestone 4 Automated Checks - Kanban and Tags

Use this document as the source of truth for automated Milestone 4 verification. The goal is to prove that the board read model, board move contract, tag system, filters, optimistic UI, and rollback behavior stay aligned across API, shared DTOs, web client code, and CI.

## Required Commands
Run these before claiming Milestone 4 is merge-ready:

```bash
make lint
make typecheck
pnpm -C apps/api test
pnpm -C apps/web test
make build
pnpm -C apps/api gen:openapi
pnpm -C apps/api run lint:http
docker compose -f infra/docker-compose.yml config --quiet
```

Optional but recommended when Docker is available:

```bash
make up
make auth-smoke
make down
```

## API Coverage

Primary files:
- `apps/api/tests/tasks.e2e.test.ts`
- `apps/api/tests/tags.e2e.test.ts`
- `apps/api/tests/kanban.http`
- `apps/api/tests/tasks.http`

Required scenarios:
- Board read model groups authenticated tasks into `TODO`, `IN_PROGRESS`, and `DONE` lanes.
- Board response includes lane order, per-lane totals, overdue counts, tag summaries, board summary totals, `updatedAt`, and `generatedAt`.
- Board response excludes other users' tasks.
- `GET /api/taskforge/v1/tasks/board` requires authentication.
- Board filters support `status`, `priority`, repeated `tag`, `q`, `dueFrom`, and `dueTo`.
- List and board due filters accept RFC3339 timestamps with timezone offsets.
- Inverted due ranges are rejected with the standard validation envelope.
- `PATCH /api/taskforge/v1/tasks/board/move` requires authentication.
- Board move supports manual same-lane reorder.
- Board move supports cross-lane status changes plus destination ordering.
- Board move rejects out-of-range `targetIndex` values and unknown task ids.
- Board move is user-scoped and cannot move another user's task.
- Reindexing a board move does not mark unrelated lane tasks as recently updated.
- `GET /api/taskforge/v1/tags` returns canonical labels and usage counts scoped to the authenticated user.
- `POST /api/taskforge/v1/tags` validates label length/content and returns the canonical record.
- Tag creation/listing enforces user ownership and database boundaries.
- Tag canonicalization is stable for spacing/case variants.

## Web Client And Contract Coverage

Primary files:
- `apps/web/lib/tasks-client.test.ts`
- `apps/web/lib/tag-normalization.test.ts`

Required scenarios:
- Board filters serialize to `/api/taskforge/v1/tasks/board` with repeated `tag` params.
- Invalid board due ranges are rejected client-side before a request is sent.
- Board DTO parsing rejects malformed server responses.
- Tag summary requests target `/api/taskforge/v1/tags`.
- Browser requests include credentials.
- Server requests can bind the session cookie.
- Dev-bypass client auth headers are attached when present.
- Tag normalization uses locale-invariant lowercasing, not host-locale lowercasing.

## Web Board Interaction Coverage

Primary files:
- `apps/web/app/(protected)/dashboard/dashboard-content.test.tsx`
- `apps/web/app/(protected)/dashboard/board-order-utils.test.ts`

Required scenarios:
- Manual board-order mode submits same-lane reorders.
- Manual board-order mode translates visible filtered indices back to full-lane target indices before sending the API mutation.
- Sorted same-lane drag is disabled and does not submit a move.
- Sorted cross-lane drag submits a status move with deterministic end-of-lane `targetIndex`.
- Optimistic manual reorders roll back when the move mutation fails.
- Rollback failure path shows retry/error feedback.
- Workspace totals are sourced from an unfiltered board query while visible board filters are active.
- Column id parsing rejects invalid statuses.
- Sorted-view preview helpers move cards to the destination lane end.
- Same-lane order remains stable in sorted views.

## Web Tag And Cache Coverage

Primary files:
- `apps/web/components/tasks/task-tag-selector.test.tsx`
- `apps/web/lib/tasks-hooks.test.ts`

Required scenarios:
- Inline tag creation allows distinct labels that are substrings of existing tags, such as `api` when `api-v2` exists.
- Inline tag creation does not offer duplicate creation for exact normalized label matches.
- Optimistic task edits update board caches and recompute lane metadata.
- Filtered board caches remove tasks that no longer match tag, status, priority, search, or due filters.
- Tag filters match case-insensitively during optimistic updates and server reconciliation.
- Search-filtered board caches handle compact board items that do not include descriptions.
- Server task reconciliation inserts matching tasks into filtered board caches.
- Optimistic board move rollback restores every cached board variant under the board root.
- Optimistic board moves are removed from filtered caches when the target status no longer matches.
- Moved tasks are inserted into matching cached lists when they were not already present.
- Optimistic board moves recompute overdue summary metadata.
- Optimistic delete recomputes board metadata.

## CI Expectations
- `.github/workflows/ci.yml` runs lint, typecheck, API tests, frontend tests, and builds for PRs targeting `main` or milestone branches.
- API and frontend test jobs have 5-minute timeouts.
- The suites are deterministic and do not currently enable automatic retries.
- If retry behavior is introduced later, runner logs must expose retry attempts so flakes are visible during review.

## Manual-Only Follow-up
Automated tests intentionally mock drag/drop internals. The manual checklist remains required for:
- real pointer dragging in a browser,
- visual drop indicators and destination-column highlights,
- keyboard/screen-reader language checks,
- localStorage and URL persistence through full browser refreshes,
- MailHog/Docker stack health when relevant to the review environment.

## Merge Gate
Milestone 4 should not be considered fully vetted unless:
- all required automated commands pass,
- `docs/openapi.json` has no uncommitted diff after `pnpm -C apps/api gen:openapi`,
- the HTTP pack lint reports all `.http` files valid,
- any failed manual-only item is documented as a release note or follow-up task.
