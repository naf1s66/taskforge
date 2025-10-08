# TaskForge (Monorepo)

**Full-stack Task Manager** showcasing Next.js (TS) + shadcn/ui + Tailwind + Framer Motion • Express (TS) • PostgreSQL (Neon/Supabase) • Prisma • OAuth via Auth.js • Swagger/OpenAPI • Jest/Supertest • Docker • GitHub Actions.

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

## Auth Setup (Day 2)
1. **Create OAuth apps**
   - GitHub: [Developer settings → OAuth Apps](https://github.com/settings/developers). Callback URL: `http://localhost:3000/api/auth/callback/github`.
   - Google: [Google Cloud Console → Credentials → OAuth Client ID](https://console.cloud.google.com/apis/credentials). Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`.
2. **Populate the web env file** (`apps/web/.env` or Docker env):
   ```bash
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=changeme # generate a strong value before deploying
   GITHUB_ID=your-app-id
   GITHUB_SECRET=your-github-secret
   GOOGLE_ID=your-client-id
   GOOGLE_SECRET=your-google-secret
   API_BASE_URL=http://localhost:4000/api/taskforge
   ```
3. **Restart the Next.js dev server** so NextAuth picks up the changes, then visit `http://localhost:3000/login`.

If the secrets are missing, the `/login` page now shows an "OAuth not configured" banner instead of crashing.

> Tip: when you're iterating locally without OAuth apps, use the **Development login** button on `/login` to spawn a temporary session. It is disabled automatically in production builds.

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
