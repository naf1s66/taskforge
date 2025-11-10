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

## Auth Quickstart
1. **Configure NextAuth secrets** – in `apps/web/.env` (or Docker env), set:
   ```bash
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=<random-string>
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/taskforge?schema=public
   ```
   The default template in `infra/env/web.env.example` now includes `DATABASE_URL`. When running inside Docker Compose, keep the
   host as `db`; for local `pnpm dev` sessions, point it at your accessible Postgres host (e.g., `localhost`).
2. **Optional OAuth providers** – supply any provider keys you have:
   ```bash
   GITHUB_ID=<github-client-id>
   GITHUB_SECRET=<github-client-secret>
   GOOGLE_ID=<google-oauth-client-id>
   GOOGLE_SECRET=<google-oauth-client-secret>
   ```
   Leaving these blank keeps the login screen in a safe “No providers configured” state for development demos.
3. **Run Prisma migrations** – make sure the shared database has the auth tables NextAuth expects:
   ```bash
   pnpm -C apps/api prisma migrate deploy
   ```
   Run this any time the Prisma schema changes (or `prisma migrate dev` when iterating locally).
4. **Backend linkage (optional)** – `API_BASE_URL` and `NEXT_PUBLIC_API_BASE_URL` remain available if you need to hydrate UI from the Express API while OAuth is being integrated end-to-end.
5. **Run the web app** – launch the Next.js dev server:
   ```bash
   pnpm -C apps/web dev
   ```
   Visit `http://localhost:3000/login` to confirm:
   - With no provider keys, the page renders a friendly callout explaining how to enable OAuth.
   - With provider keys set, sign-in buttons appear and sessions flow through NextAuth’s `SessionProvider`.
6. **Access session data** –
   - Server components use `getCurrentUser()` (`@/lib/server-auth`) to read the active session.
   - Client components call `useAuth()` (`@/lib/use-auth`) for `{ user, status }`, built on top of `next-auth/react`’s `useSession()` hook.

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
