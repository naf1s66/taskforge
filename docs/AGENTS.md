# AGENTS — Codex Orchestration

## Roles
- Architect — ADRs, diagrams, structure.
- Backend Engineer — Express TS, Prisma, Zod, Swagger, Jest/Supertest, `.http`.
- Frontend Engineer — Next.js App Router, Tailwind, shadcn/ui, Framer Motion, NextAuth.
- QA — test plan, coverage sanity, `.http`, Lighthouse/a11y.
- DevOps — Dockerfiles, docker-compose, GitHub Actions, env templates.
- Docs — README, ADRs, OpenAPI export, screenshots/GIFs.

## Commands
- Architect: create ADRs for auth, db, email, hosting, monorepo.
- Backend: routes `/tasks`, `/tags`, `/me`; validation; Prisma; Swagger at `/api/docs`; tests + seed.
- Frontend: auth pages; Task list + dialogs; Kanban DnD; settings; dark theme.
- QA: `.http` pack for CRUD/move/filters; API + DnD tests.
- DevOps: Dockerfiles (web/api), `infra/docker-compose.yml`, CI job.

## Env Examples
**API**: `DATABASE_URL`, `JWT_SECRET`, `SMTP_HOST`, `SMTP_PORT`  
**WEB**: `NEXT_PUBLIC_API_BASE_URL`

## DoD
- Day 1–7 done; CI green; `/api/docs` live; deployed FE/BE/DB; README + ADRs present.
