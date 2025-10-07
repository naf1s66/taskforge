# PRD — TaskForge (Monorepo)

## Overview
- **Goal:** Production-like personal task manager in ≤ 1 week, highlighting OAuth, REST, RBAC‑ready design, OpenAPI, tests, Docker, CI, DB migrations, and refined UI (dark/classy with animations).
- **Monorepo:** `apps/web`, `apps/api`, `packages/shared`, `infra`, `docs`.

## Users
- Primary: single user (personal). Future: org workspaces.

## Success
- Deployed FE/BE/DB on free tiers. OAuth login, CRUD tasks (tags + due dates), Kanban, filters/search, basic email digest, Swagger at `/api/taskforge/docs`, 10–20 tests, `.http` suite, Docker + CI, README + ADRs.

## Scope
- Auth: NextAuth (GitHub/Google), optional credentials.
- Tasks: title, description (MD), status, priority, **tags**, **dueDate**.
- Kanban: DnD with optimistic UI.
- Filters/search: tag/status/due range/text.
- Email: daily digest + welcome email (toggle).
- UI: Next.js, Tailwind, shadcn/ui, Framer Motion, desktop-first dark theme.
- Docs: Swagger/OpenAPI + ADRs. `.http` pack.
- Tests: Jest/Supertest + basic FE validation.

## Non-Goals (Phase 1)
- Multi-tenant orgs, role assignment, real-time, advanced analytics.

## Architecture
- FE: Next.js App Router (TS), NextAuth, calls API with bearer.
- BE: Express (TS), Zod validation, Prisma (Postgres), Swagger.
- DB: Neon/Supabase Postgres; Prisma migrations + seed.
- Email: Nodemailer; dev via MailHog.
- Infra: Dockerfiles + docker-compose; CI with GitHub Actions.

## Data Model (Prisma Sketch)
```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  image     String?
  provider  String?
  createdAt DateTime @default(now())
  tasks     Task[]
}

model Task {
  id          String       @id @default(cuid())
  userId      String
  title       String
  description String?
  status      TaskStatus   @default(TODO)
  priority    TaskPriority @default(MEDIUM)
  dueDate     DateTime?
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  user        User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  TaskTag     TaskTag[]
}

model Tag {
  id    String   @id @default(cuid())
  label String   @unique
  TaskTag TaskTag[]
}

model TaskTag {
  taskId String
  tagId  String
  task   Task @relation(fields: [taskId], references: [id], references: [id], onDelete: Cascade)
  tag    Tag  @relation(fields: [tagId], references: [id], onDelete: Cascade)
  @@id([taskId, tagId])
}

enum TaskStatus { TODO IN_PROGRESS DONE }
enum TaskPriority { LOW MEDIUM HIGH }
```

## API (v1)
- `GET /api/v1/health`
- `GET /api/v1/me`
- `GET /api/v1/tasks?status=&tag=&q=&dueFrom=&dueTo=`
- `POST /api/v1/tasks`
- `PATCH /api/v1/tasks/:id`
- `DELETE /api/v1/tasks/:id`
- `GET /api/v1/tags`
- `POST /api/v1/tags`
- Docs: `GET /api/taskforge/docs`

## ADR Summary
- Auth: NextAuth + backend JWT verification.
- Backend: Express TS + Zod + Swagger.
- DB: Postgres (Neon/Supabase) + Prisma.
- Email: Nodemailer adapter; MailHog dev; free SMTP prod.
- Monorepo rationale: shared types, unified tooling, single CI.

## Milestones (7 days)
- **Day 1:** Monorepo setup, Tailwind + shadcn/ui, Express + Prisma scaffold, Dockerfiles, compose, CI skeleton.
- **Day 2:** OAuth (GitHub/Google), protected routes, `/me`.
- **Day 3:** `/tasks` CRUD + Zod + tests; FE list + dialogs; OpenAPI draft.
- **Day 4:** Kanban DnD, `/tags`, optimistic UI, `.http` pack.
- **Day 5:** Search, due filters, priority; email digest (node-cron + Nodemailer).
- **Day 6:** Helmet/CORS/rate-limit; finalize Swagger; ADRs + README; CI docker build.
- **Day 7:** Provision Neon/Supabase; deploy API (Render/Railway) + Web (Vercel); smoke test; v1 release.
