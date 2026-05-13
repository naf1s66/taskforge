# Milestone 4 Automated Checks — Kanban and Tags

## API / contract checks
- `apps/api/tests/kanban.http` covers board fetch, move mutation, and tag endpoints.
- Jest/Supertest coverage for board move and tag constraints should pass in CI.

## Recommended local commands
```bash
pnpm -C apps/api test
pnpm -C apps/api run lint:http
```

## Focus assertions
- Move contract stays `{ taskId, targetStatus, targetIndex }`.
- Sorted-view moves remain deterministic via hidden end-of-lane index.
- Tag uniqueness/ownership constraints are enforced server-side.
