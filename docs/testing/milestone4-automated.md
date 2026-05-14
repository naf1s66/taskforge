# Milestone 4 Automated Checks — Kanban and Tags

## API / contract checks
- `apps/api/tests/kanban.http` covers board fetch, move mutation, and tag endpoints.
- Jest/Supertest coverage for board move and tag constraints should pass in CI.
- `apps/api/tests/tasks.e2e.test.ts` seeds tagged tasks, asserts grouped board columns and summary counts, exercises filtered board queries, and verifies board move mutations.
- `apps/api/tests/tags.e2e.test.ts` covers tag creation, canonicalization, usage counts, validation, and user ownership boundaries.

## Frontend checks
- `apps/web/app/(protected)/dashboard/dashboard-content.test.tsx` uses React Testing Library with a deterministic `@dnd-kit` mock to exercise dashboard drag handlers.
- Covered drag paths: manual same-lane reorder, sorted same-lane no-op, sorted cross-lane status move with hidden end-of-lane index, and rollback/toast behavior after mutation failure.
- `apps/web/lib/tasks-hooks.test.ts` covers optimistic board cache updates, filtered board variants, and snapshot restoration.

## Recommended local commands
```bash
pnpm lint
pnpm -C apps/api test
pnpm -C apps/web test
pnpm -C apps/api run lint:http
```

## Focus assertions
- Move contract stays `{ taskId, targetStatus, targetIndex }`.
- Sorted-view moves remain deterministic via hidden end-of-lane index.
- Tag uniqueness/ownership constraints are enforced server-side.
- CI applies 5-minute timeouts to the API and web test suite steps. The suites are deterministic and do not currently enable automatic retries; any future retry configuration should rely on the runner logs to expose flaky retry attempts.
