# PRD — TaskForge (Monorepo)

## Overview
- **Goal:** Production-like personal task manager in ≤ 1 week, highlighting OAuth, REST, RBAC‑ready design, OpenAPI, tests, Docker, CI, DB migrations, and refined UI (dark/classy with animations).
- **Monorepo:** `apps/web`, `apps/api`, `packages/shared`, `infra`, `docs`.

## Users
- Primary: single user (personal). Future: org workspaces.

## Success
- Deployed FE/BE/DB on free tiers. OAuth login, CRUD tasks (tags + due dates), Kanban, filters/search, basic email digest, Swagger at `/api/taskforge/docs`, 10–20 tests, `.http` suite, Docker + CI, README + ADRs.

## Scope
- Auth: NextAuth (GitHub/Google) backed by Prisma, credential login against the API, and a session bridge that exchanges
  NextAuth sessions for API `tf_session` cookies via `SESSION_BRIDGE_SECRET`.
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
- FE: Next.js App Router (TS) with NextAuth database sessions, OAuth providers, and a server-side session bridge that mints
  API cookies before rendering protected routes.
- BE: Express (TS), Zod validation, Prisma (Postgres), Swagger. Auth router issues JWT access/refresh pairs, maintains
  `tf_session` HttpOnly cookies, and exposes a `session-bridge` endpoint for trusted frontends.
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

  @@unique([id, userId])
}

model Tag {
  id      String    @id @default(uuid()) @db.Uuid
  userId  String    @db.Uuid
  label   String
  TaskTag TaskTag[]
  user    User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([id, userId])
  @@unique([userId, label])
}

model TaskTag {
  taskId String @db.Uuid
  tagId  String @db.Uuid
  userId String @db.Uuid
  task   Task   @relation(fields: [taskId, userId], references: [id, userId], onDelete: Cascade)
  tag    Tag    @relation(fields: [tagId, userId], references: [id, userId], onDelete: Cascade)

  @@id([taskId, tagId])
  @@index([userId])
}

enum TaskStatus { TODO IN_PROGRESS DONE }
enum TaskPriority { LOW MEDIUM HIGH }
```

## API (v1)
- `GET /api/v1/health`
- `GET /api/v1/me`
- `GET /api/v1/tasks?status=&priority=&tag=&q=&dueFrom=&dueTo=&page=&pageSize=`
- `POST /api/v1/tasks`
- `PATCH /api/v1/tasks/:id`
- `DELETE /api/v1/tasks/:id`
- `GET /api/v1/tags`
- `POST /api/v1/tags`
- Docs: `GET /api/taskforge/docs`
- OpenAPI reference: [`docs/openapi.json`](./openapi.json)

## ADR Summary
- Auth: NextAuth + backend JWT verification with dedicated session bridge and shared Prisma adapter.
- Backend: Express TS + Zod + Swagger.
- DB: Postgres (Neon/Supabase) + Prisma.
- Email: Nodemailer adapter; MailHog dev; free SMTP prod.
- Monorepo rationale: shared types, unified tooling, single CI.

## Milestones (7 days)
- **Day 1:** Monorepo setup, Tailwind + shadcn/ui, Express + Prisma scaffold, Dockerfiles, compose, CI skeleton.
- **Day 2:** Frontend OAuth (GitHub/Google) with NextAuth, guarded routes, session UI, and the `/auth/session-bridge` flow to mint API cookies.
- **Day 3:** `/tasks` CRUD + Zod + tests; FE list + dialogs; OpenAPI draft.
- **Day 4:** Kanban DnD, `/tags`, optimistic UI, `.http` pack.
- **Day 5:** Search, due filters, priority; email digest (node-cron + Nodemailer).
- **Day 6:** Helmet/CORS/rate-limit; finalize Swagger; ADRs + README; CI docker build.
- **Day 7:** Provision Neon/Supabase; deploy API (Render/Railway) + Web (Vercel); smoke test; v1 release.

## Authentication Experience
- Users can authenticate with GitHub or Google through NextAuth (Auth.js) using the Prisma adapter to reuse shared user records. Verified OAuth logins trigger the server-side session bridge to call `/api/taskforge/v1/auth/session-bridge`, which returns JWTs and sets the API-managed `tf_session` cookie so backend routes trust the request.
- Email/password login remains available via `/api/taskforge/v1/auth/login`. The Next.js login form posts to the API, receives validation errors, and relies on the `tf_session` cookie for subsequent navigation without duplicating NextAuth.
- Authenticated layouts call `getCurrentUser()` server-side. If the NextAuth session exists it is used; otherwise the layout resolves the API user from the `tf_session` cookie and, when needed, exchanges it for a fresh token using the session bridge helper.
- Signing out from the web app clears both the NextAuth session and the API cookie through the `/api/auth/logout` Next.js route, which invokes the API logout endpoint and expires `tf_session` on the server.

### Auth Lifecycle Diagram
```mermaid
sequenceDiagram
    participant Browser
    participant NextAuth as Next.js (NextAuth)
    participant API as Express API
    participant DB as Prisma/Postgres

    Browser->>NextAuth: OAuth callback (GitHub/Google)
    NextAuth->>DB: Link/update user via Prisma adapter
    NextAuth-->>Browser: NextAuth session cookie
    NextAuth->>API: POST /auth/session-bridge (user id/email, secret)
    API->>DB: Lookup user, issue JWTs
    API-->>Browser: Set tf_session HttpOnly cookie
    Browser->>API: Authenticated request with tf_session
    API-->>Browser: Protected data

    Browser->>API: POST /auth/login (credentials)
    API->>DB: Verify password
    API-->>Browser: Set tf_session HttpOnly cookie
```

## Auth Decisions & Deviations
- **Session bridge implemented earlier than planned:** The original milestone assumed the JWT bridge would land after initial OAuth wiring. In practice, the bridge was required to make protected routes render reliably in Docker and to share auth between OAuth and credential logins, so `/auth/session-bridge` shipped alongside the OAuth integration.
- **Database-backed NextAuth sessions:** Instead of the default JWT session mode we keep the Prisma adapter’s session table so OAuth and credentials reuse the same user IDs that the API expects, avoiding mismatched subject claims.
- **Shared sign-out path:** A dedicated Next.js `/api/auth/logout` route coordinates clearing both the NextAuth session and the API cookie to prevent stale `tf_session` values after OAuth sign-out.

## Tasks Experience (Dashboard + Dialogs)
- **End-to-end flow:** Authenticated users land on the task dashboard, which loads task data via `/api/taskforge/v1/tasks` using the shared `tf_session` cookie or Bearer token from the session bridge. The UI renders status columns, badges for priority/tags, and empty-state callouts when filters return zero results. The decisions behind the session bridge and data storage live in [ADR 0001](docs/adr/0001-auth-strategy-nextauth-%2B-backend-jwt.md) and [ADR 0002](docs/adr/0002-database-postgres-+-prisma.md).
- **Filters + tags:** Filters (status, priority, tag, search, due date range) map 1:1 to API query parameters. Tag entry is normalized to the shared tag list so list, create, and update requests stay aligned across the API and UI. The dashboard exposes quick filters for common combinations (for example, In Progress + High priority) so users can drill into the work queue quickly.
- **Create/edit dialogs:** Create and edit dialogs surface the same fields (title, description, status, priority, due date, tags), run Zod validation, and submit through React Query mutations. Successful actions optimistically update the task list and kanban preview; validation errors show inline with a destructive toast for visibility. If a task is deleted while editing, the dialog closes with a conflict notice.
- **Screenshots/GIFs:** Dashboard, filter, and dialog assets will be linked once design approves them. Coordinate with design for final, approved assets before publishing externally.
- **Known limitations:** UI pagination controls are not exposed yet (the list defaults to the first page), and tag management remains embedded in the task dialogs until the dedicated tags view ships.

## Task dialog UX
- **Creation:** The dashboard and hooks demo use buttons with `data-task-dialog="create"` to launch the modal form. It runs the shared Zod schema with `react-hook-form`, sanitizes tags/due dates, and optimistically inserts the task into the page-one cache so the kanban preview updates instantly.
- **Editing:** Every task card includes an **Edit** action annotated with `data-task-dialog="edit" data-task-id="<id>"`. The dialog loads the record directly from the React Query cache, keeps in sync with background updates, and exposes the same editable fields (title, description, status, priority, due date, tags). Submissions call `useUpdateTask`; validation errors render inline, successful saves show a toast, and missing/deleted tasks close the dialog with a conflict notice.
