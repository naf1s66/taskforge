# API Test Harness

The Jest/Supertest suites for `@taskforge/api` run against a disposable PostgreSQL
instance so we exercise the real Prisma models and repositories.

## Quick start

1. Ensure Docker is running (the harness uses [`testcontainers`](https://testcontainers.com/)).
2. Install dependencies: `pnpm install` at the repo root.
3. Run the API tests: `pnpm -C apps/api test`.

The harness automatically:

- loads `.env.test` via `dotenv-flow` (you can override values locally),
- spins up a PostgreSQL 16 container, applies Prisma migrations, and
- truncates database tables between individual specs.

## Environment variables

Tests read the same variables as production code. Defaults are provided in
`.env.test` and echoed in CI:

- `DATABASE_URL` – connection string used by Prisma.
- `JWT_SECRET` / `JWT_REFRESH_SECRET` – required to issue access & refresh tokens.
- `SESSION_BRIDGE_SECRET` – unlocks the `/auth/session-bridge` endpoint.

Override these by exporting new values before running Jest if needed:

```bash
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/taskforge?schema=test"
pnpm -C apps/api test
```

## Troubleshooting

- **Tests hang on startup** – confirm Docker is available and that no existing
  container is already bound to port `5432`. Stopping stale containers usually
  resolves the issue.
- **Residual data between specs** – the harness truncates tables in `beforeEach`.
  If you add new Prisma models, update `tests/setup.ts` to include their tables
  in the truncate list.
- **Custom databases** – set `DATABASE_URL` to an existing Postgres instance to
  bypass Testcontainers. The harness will still migrate and clean it between tests.


## HTTP request packs (VS Code REST Client / Bruno / Insomnia / Postman)

- `auth.http`: register/login/logout/me auth smoke flow.
- `tasks.http`: task CRUD + filters + board fetch/move requests.
- `kanban.http`: focused board + tag CRUD demo flows for QA and staging walkthroughs.

### Environment variables

All packs support variable-based hosts/tokens (for example `@apiBaseUrl`, `{{accessToken}}`, and `{{sessionCookie}}`) so you can replay requests without editing hard-coded URLs.

### Import tips

- **VS Code REST Client**: open the `.http` file and click `Send Request` for each section.
- **Bruno**: create/import a collection, then copy each request block as separate requests; keep variables in Bruno environments (`apiBaseUrl`, `accessToken`, `sessionCookie`).
- **Insomnia/Postman**: import from raw text (or paste request-by-request) and map placeholders to environment variables with matching names.
