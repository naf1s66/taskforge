# AGENTS - Codex Orchestration

## Roles
- Architect - ADRs, diagrams, structure.
- Backend Engineer - Express TS, Prisma, Zod, Swagger, Jest/Supertest, `.http`.
- Frontend Engineer - Next.js App Router, Tailwind, shadcn/ui, Framer Motion, NextAuth.
- QA - test plan, coverage sanity, `.http`, Lighthouse/a11y.
- DevOps - Dockerfiles, docker-compose, GitHub Actions, env templates.
- Docs - README, ADRs, OpenAPI export, approved screenshot references.

## Commands
- Architect: create ADRs for auth, db, deferred email, hosting, monorepo.
- Backend: routes `/tasks`, `/tags`, `/me`; validation; Prisma; Swagger at `/api/taskforge/docs`; tests + seed.
- Frontend: auth pages; Task list + dialogs; Kanban DnD; settings; dark theme.
- QA: `.http` pack for CRUD/move/filters; API + DnD tests.
- DevOps: Dockerfiles (web/api), `infra/docker-compose.yml`, CI job.

## Frontend Data Access
- Use `apps/web/lib/tasks-client.ts` for low-level task, board, and tag HTTP calls.
- Prefer `apps/web/lib/tasks-hooks.ts` from React components so cache keys, optimistic updates, rollback, and toast-friendly errors stay consistent.

## Env Examples
- **API**: `PORT`, `NODE_ENV`, `DATABASE_URL`, `CORS_ALLOWED_ORIGINS`, `API_JSON_BODY_LIMIT`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `SESSION_BRIDGE_SECRET`, `DIGEST_JOB_SECRET`, `TRUST_PROXY`, `TF_DEV_BYPASS_AUTH`, `TF_DEV_BYPASS_CLIENT_SECRET`, optional `COOKIE_DOMAIN`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`, `EMAIL_DAILY_SEND_LIMIT`
- **WEB**: `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `DATABASE_URL`, `API_BASE_URL`, `NEXT_PUBLIC_API_BASE_URL`, provider IDs/secrets (`GITHUB_ID`, `GITHUB_SECRET`, `GOOGLE_ID`, `GOOGLE_SECRET`), `SESSION_BRIDGE_SECRET`, `CRON_SECRET`, `DIGEST_JOB_SECRET`, `TF_DEV_BYPASS_AUTH`, `TF_DEV_BYPASS_CLIENT_SECRET`, optional `COOKIE_DOMAIN`

## DoD
- Milestone work is documented, tests pass in CI, `/api/taskforge/docs` renders locally, README + ADRs are current, and deployment-specific proof is attached to the release/PR when available.
