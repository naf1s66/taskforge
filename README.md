# TaskForge (Monorepo)

**Full-stack Task Manager** showcasing Next.js (TS) + shadcn/ui + Tailwind + Framer Motion • Express (TS) • PostgreSQL (Neon/Supabase) • Prisma • JWT auth flows • Swagger/OpenAPI • Jest/Supertest • Docker • GitHub Actions.

- 📄 PRD: [`docs/PRD.md`](docs/PRD.md)
- 🧑‍💻 Agents: [`docs/AGENTS.md`](docs/AGENTS.md)
- 🧠 ADRs: [`docs/adr/`](docs/adr/)

## Structure
```
taskforge/
├─ apps/
│  ├─ web/     # Next.js App Router (TS), Tailwind, shadcn/ui, Framer Motion
│  └─ api/     # Express (TS), Prisma, Swagger, Zod
├─ packages/shared/        # Shared DTOs/types
├─ infra/                  # docker-compose, env templates
├─ docs/                   # PRD, agents, ADRs, OpenAPI
├─ .github/workflows/ci.yml
├─ Makefile
├─ package.json (pnpm workspaces)
└─ pnpm-workspace.yaml
```

## Quick Start
1. **Install dependencies**
   ```bash
   pnpm install
   ```
2. **Copy environment templates (optional for dev defaults)**
   ```bash
   cp infra/env/api.env.example apps/api/.env
   cp infra/env/web.env.example apps/web/.env
   ```
3. **Run static checks**
   ```bash
   pnpm lint
   pnpm typecheck
   ```
4. **Start the Docker services (Postgres + MailHog + app containers)**
   ```bash
   make up
   # when finished
   make down
   ```
5. **Run dev servers locally (hot reload)**
   ```bash
   pnpm -C apps/api dev
   pnpm -C apps/web dev
   ```
6. **Smoke test**
   - API health: `curl http://localhost:4000/api/taskforge/v1/health`
   - Web UI: http://localhost:3000

> `make up` builds and starts the Dockerized API/Web services, while the pnpm dev commands are ideal for iterative development outside containers.

## Running frontend auth
1. **Set environment variables**
   - API (`apps/api/.env`): ensure `JWT_SECRET` is set (defaults to `dev-secret`) and configure database credentials if you are not using the in-memory store.
   - Web (`apps/web/.env` or Docker env):
     ```bash
     NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api/taskforge/v1
     ```
     Adjust the host/port to match where the API server is running.
2. **Start both servers**
   ```bash
   pnpm -C apps/api dev
   pnpm -C apps/web dev
   ```
3. **Create an account**
   - Visit `http://localhost:3000/register` to create a user. Client-side validation is powered by Zod and mirrors the API contract.
   - Successful registration provisions an API token, boots a NextAuth session, and redirects to `/dashboard`.
4. **Sign in / out**
   - Navigate to `http://localhost:3000/login` and sign in with your credentials. Errors from the API surface inline via the credentials provider.
   - The header swaps between a loader, user avatar/email, and a “Sign in” CTA as the session resolves. Use the “Sign out” button in the header to invalidate the NextAuth session and propagate logout to the API.
5. **Session troubleshooting**
   - If you need to reset state manually, clear the `next-auth.session-token` cookie (and `next-auth.csrf-token`) in your browser. The API token is refreshed automatically by the credentials flow.

### Protected routes
- `/dashboard` and any routes nested under `app/(protected)` enforce authentication on the server via NextAuth and immediately redirect unauthenticated visitors to `/login`.
- The public auth pages (login/register) redirect signed-in users back to `/dashboard` to avoid dead-end flows.
- A lightweight client gate keeps `/dashboard` content hidden until the session hydrates, preventing flicker after navigation.
- Fixes #128.

## Scripts
- `make dev` – run api + web (assumes local dev, not cross-platform background mgmt).
- `make migrate` / `make seed` – DB ops (requires Prisma client and seed hooked up).
- `make swagger` – export OpenAPI (placeholder script in `apps/api/src/openapi.export.js`).

## Deploy Targets (free tiers)
- FE: Vercel
- BE: Render or Railway
- DB: Neon or Supabase
- Email (dev): MailHog; (prod) any free SMTP (e.g., Brevo, Resend, Postmark trial)

**Note:** This scaffold uses an in-memory store in the API for now—wire up Prisma (see PRD) before production.
