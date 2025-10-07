# TaskForge (Monorepo)

**Full‑stack Task Manager** showcasing Next.js (TS) + shadcn/ui + Tailwind + Framer Motion • Express (TS) • PostgreSQL (Neon/Supabase) • Prisma • OAuth via Auth.js • Swagger/OpenAPI • Jest/Supertest • Docker • GitHub Actions.

- 📄 PRD: [`docs/PRD.md`](docs/PRD.md)
- 🧑‍💻 Agents: [`docs/AGENTS.md`](docs/AGENTS.md)
- 🧠 ADRs: [`docs/adr/`](docs/adr/)

## Structure
```
taskmaster/
├─ apps/
│  ├─ web/     # Next.js App Router (TS), Tailwind, shadcn/ui
│  └─ api/     # Express (TS), Prisma, Swagger, Zod
├─ packages/shared/        # Shared DTOs/types
├─ infra/                  # docker-compose, env templates
├─ docs/                   # PRD, agents, ADRs, OpenAPI
├─ .github/workflows/ci.yml
├─ Makefile
├─ package.json (workspaces)
└─ pnpm-workspace.yaml
```

## Quickstart
1. Install deps: `pnpm install` (or npm/yarn workspaces)
2. Copy envs:
   ```bash
   cp infra/env/api.env.example apps/api/.env
   cp infra/env/web.env.example apps/web/.env
   ```
3. Start local stack: `make up`
4. Run dev servers:
   ```bash
   pnpm -C apps/api dev
   pnpm -C apps/web dev
   ```
5. API Docs (placeholder): `http://localhost:4000/api/taskforge/docs`
6. Web: `http://localhost:3000`

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
