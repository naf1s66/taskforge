# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**TaskForge** is a full-stack task manager monorepo built with Next.js, Express, and PostgreSQL. It showcases OAuth authentication, REST API with OpenAPI, Prisma ORM, and a modern UI with shadcn/ui, Tailwind, and Framer Motion.

**Tech Stack:**
- Frontend: Next.js 14 (App Router, TypeScript), Tailwind CSS, shadcn/ui, Framer Motion
- Backend: Express (TypeScript), Prisma, Zod validation, Swagger/OpenAPI
- Database: PostgreSQL (targeting Neon/Supabase for production)
- Auth: NextAuth (Auth.js) with GitHub/Google OAuth + backend JWT verification
- Package Manager: pnpm (v8.15.4+)
- Node Version: 20+

## Monorepo Structure

```
taskforge/
├─ apps/
│  ├─ api/          # Express API (port 4000)
│  └─ web/          # Next.js frontend (port 3000)
├─ packages/
│  └─ shared/       # Shared types/DTOs (not yet implemented)
├─ infra/
│  ├─ docker-compose.yml  # PostgreSQL, MailHog, app containers
│  └─ env/                # Environment templates
└─ docs/
   ├─ PRD.md              # Product requirements
   ├─ AGENTS.md           # Development roles/responsibilities
   ├─ adr/                # Architecture Decision Records
   └─ openapi.json        # OpenAPI spec export
```

This is a **pnpm workspace** monorepo. Use `pnpm -C <app-dir>` to run commands in specific workspaces.

## Common Commands

### Development Workflow

```bash
# Install all dependencies
pnpm install

# Run development servers (both API + web with hot reload)
pnpm dev
# OR separately:
pnpm -C apps/api dev    # API on http://localhost:4000
pnpm -C apps/web dev    # Web on http://localhost:3000

# Static checks
pnpm lint           # Lint all workspaces
pnpm typecheck      # TypeScript check all workspaces

# Build all apps
pnpm build
```

### Docker Infrastructure

```bash
# Start all services (PostgreSQL, MailHog, app containers)
make up

# Stop all services
make down

# Check running containers
docker ps
```

### Database Operations (Prisma)

```bash
# Run migrations
make migrate
# OR directly:
cd apps/api && pnpm prisma migrate deploy

# Seed database
make seed
# OR directly:
cd apps/api && pnpm tsx prisma/seed.ts

# Generate Prisma client (after schema changes)
cd apps/api && pnpm prisma generate

# Create a new migration
cd apps/api && pnpm prisma migrate dev --name <migration_name>
```

### Testing

```bash
# Run API tests
make test
# OR directly:
pnpm -C apps/api test
```

**Note:** Jest is not yet fully configured. The test script currently exits 0 as a placeholder.

### API Documentation

```bash
# Generate/export OpenAPI spec to docs/openapi.json
make swagger
# OR directly:
pnpm -C apps/api run gen:openapi
```

Swagger UI is available at: http://localhost:4000/api/taskforge/docs

### Individual Workspace Commands

```bash
# API-specific
pnpm -C apps/api dev        # Start with tsx watch
pnpm -C apps/api build      # Build TypeScript
pnpm -C apps/api lint       # ESLint
pnpm -C apps/api typecheck  # TypeScript check

# Web-specific
pnpm -C apps/web dev        # Next.js dev server
pnpm -C apps/web build      # Next.js production build
pnpm -C apps/web start      # Start production server
pnpm -C apps/web lint       # Next.js lint
pnpm -C apps/web typecheck  # TypeScript check
```

### Makefile Shortcuts

```bash
make install    # pnpm install
make lint       # Lint API + Web
make typecheck  # TypeScript check API + Web
make ci         # Full CI pipeline: install, lint, typecheck, test, build
```

## Architecture & Key Concepts

### Authentication Flow

**Strategy (ADR 0001):** NextAuth on frontend + JWT validation on backend

1. User authenticates via NextAuth (GitHub/Google OAuth) in Next.js app
2. NextAuth manages session securely
3. Frontend forwards **Bearer JWT** to API on authenticated requests
4. API validates JWT using shared secret (`JWT_SECRET`)

**Important:** Auth middleware is applied globally in `apps/api/src/server.ts:30`. All routes after this line require authentication except `/health` and `/docs`.

### Data Model (Prisma Schema)

Located at: `apps/api/prisma/schema.prisma`

**Core entities:**
- `User`: OAuth user with tasks relationship
- `Task`: Main entity with title, description, status (TODO/IN_PROGRESS/DONE), priority (LOW/MEDIUM/HIGH), dueDate, and many-to-many tags
- `Tag`: Labels for tasks (unique)
- `TaskTag`: Join table for Task-Tag many-to-many relationship

**Important:** There's a duplicate `references: [id]` in the TaskTag model (line 43) that should be fixed.

### API Structure

**Base URL:** `http://localhost:4000/api/taskforge/v1`

**Core endpoints (planned/in-progress):**
- `GET /health` - Health check (no auth required)
- `GET /me` - Current user info
- `GET /tasks` - List tasks with filters (status, tag, q, dueFrom, dueTo)
- `POST /tasks` - Create task
- `PATCH /tasks/:id` - Update task
- `DELETE /tasks/:id` - Delete task
- `GET /tags` - List all tags
- `POST /tags` - Create tag

**Architecture:**
- Routes: `apps/api/src/routes/` (tasks.ts, tags.ts)
- Schemas: `apps/api/src/schemas/` (Zod validation)
- Middleware: `apps/api/src/middleware/` (auth.ts)
- Entry: `apps/api/src/server.ts`

**Security:** Helmet, CORS, rate limiting (120 req/min) applied globally.

### Frontend Architecture

**Not yet implemented.** The web app structure is scaffolded but pages/components are minimal.

**Planned structure:**
- Next.js App Router with TypeScript
- shadcn/ui components for UI primitives
- Tailwind CSS with dark theme (desktop-first)
- Framer Motion for animations
- NextAuth for OAuth (GitHub/Google)
- Optimistic UI for Kanban drag-and-drop

### Email System (Planned)

**Strategy (ADR 0003):** Nodemailer with adapter pattern

- **Dev:** MailHog (included in docker-compose)
- **Prod:** Free SMTP provider (Brevo, Resend, Postmark trial)
- **Features:** Welcome email, daily task digest (node-cron)

## Environment Variables

### API (`apps/api/.env`)

```bash
DATABASE_URL="postgresql://user:pass@localhost:5432/taskforge"
JWT_SECRET="your-jwt-secret"
PORT=4000

# Email (dev)
SMTP_HOST="localhost"
SMTP_PORT=1025

# Email (prod)
SMTP_HOST="smtp.example.com"
SMTP_PORT=587
SMTP_USER="user"
SMTP_PASS="pass"
```

### Web (`apps/web/.env`)

```bash
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret"

# OAuth providers
GITHUB_ID="your-github-client-id"
GITHUB_SECRET="your-github-client-secret"
GOOGLE_ID="your-google-client-id"
GOOGLE_SECRET="your-google-client-secret"

# API backend
API_BASE_URL="http://localhost:4000/api/taskforge/v1"
```

**Templates available at:** `infra/env/*.env.example`

## Development Workflow

### Adding a New API Endpoint

1. Define Zod schemas in `apps/api/src/schemas/`
2. Create/update route handler in `apps/api/src/routes/`
3. Register route in `apps/api/src/server.ts`
4. Update OpenAPI spec (manual or via comments)
5. Export OpenAPI: `make swagger`
6. Add tests (when Jest is configured)

### Database Schema Changes

1. Modify `apps/api/prisma/schema.prisma`
2. Generate migration: `cd apps/api && pnpm prisma migrate dev --name <name>`
3. Regenerate client: `pnpm prisma generate`
4. Update seed file if needed: `apps/api/prisma/seed.ts`

### Working with the Frontend

1. Use Next.js App Router conventions (`apps/web/src/app/`)
2. Add shadcn/ui components as needed
3. Follow dark theme design system
4. Implement optimistic UI for better UX
5. Use Framer Motion for animations

## Important Notes

### Current Limitations

- **No real auth implemented yet:** Auth middleware exists but uses mock data (apps/api/src/server.ts:34)
- **In-memory data store:** API uses in-memory arrays, not Prisma yet (wire up before production)
- **Jest not configured:** Test script is a placeholder
- **Frontend is scaffolded:** No actual pages/components implemented
- **OpenAPI spec is empty:** Needs to be populated with actual endpoints

### Deployment Targets (Planned)

- **Frontend:** Vercel
- **Backend:** Render or Railway
- **Database:** Neon or Supabase (PostgreSQL)
- **Email (prod):** Free SMTP provider

All target free tiers for personal use.

## References

- **PRD:** `docs/PRD.md` - Product requirements and 7-day development plan
- **ADRs:** `docs/adr/` - Architecture decision records (auth, database, email, hosting)
- **OpenAPI:** `docs/openapi.json` - API specification (generated via `make swagger`)
- **Agents Guide:** `docs/AGENTS.md` - Role-based development guidance
- **Pull Request Template:** `.github/pull_request_template.md`

## Testing

### API Health Check

```bash
curl http://localhost:4000/api/taskforge/v1/health
# Expected: {"ok":true}
```

### Swagger UI

Visit: http://localhost:4000/api/taskforge/docs

### MailHog (Email Dev)

Visit: http://localhost:8025 (when running `make up`)
