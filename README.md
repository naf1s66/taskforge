# TaskForge (Monorepo)

Full-stack task manager built with Next.js (TS), shadcn/ui, Tailwind, Framer Motion, Express (TS), PostgreSQL (Neon/Supabase), Prisma, JWT auth, Swagger/OpenAPI, Jest/Supertest, Docker, and GitHub Actions.

- PRD: `docs/PRD.md`
- Agents: `docs/AGENTS.md`
- ADRs: `docs/adr/`; production/deployment ADRs: `docs/prod/adr/`
- Production runbooks: `docs/prod/`

## Structure
```
taskforge/
- apps/
  - web/     # Next.js App Router (TS), Tailwind, shadcn/ui, Framer Motion
  - api/     # Express (TS), Prisma, Swagger, Zod
- packages/shared/        # Shared DTOs/types
- infra/                  # docker-compose, env templates
- docs/                   # PRD, agents, ADRs, OpenAPI
- .github/workflows/ci.yml
- Makefile
- package.json (pnpm workspaces)
- pnpm-workspace.yaml
```

## Quick Start
1. Install dependencies
   ```bash
   pnpm install
   ```
2. Optional: copy environment templates
   ```bash
   cp infra/env/api.env.example apps/api/.env
   cp infra/env/web.env.example apps/web/.env
   ```
3. Apply Prisma migrations (required for the task repository)
   ```bash
   pnpm -C apps/api prisma migrate deploy
   ```
4. Run static checks and tests
   ```bash
   make lint
   make typecheck
   make test
   ```
5. Start Docker services (Postgres + MailHog + app containers)
   ```bash
   make up
   # when finished
   make down
   ```
6. Run dev servers locally (hot reload)
   ```bash
   pnpm -C apps/api dev
   pnpm -C apps/web dev
   ```
7. Smoke tests
   - API health: `curl http://localhost:4000/api/taskforge/v1/health`
   - Web UI: `http://localhost:3000`
8. Docker auth smoke test
   ```bash
   make auth-smoke
   ```
   This runs a scripted register/login/bridge check from inside the web container to confirm it can reach the API with the shared `SESSION_BRIDGE_SECRET`.

Note: `make up` builds and starts the Dockerized API/Web services, while the pnpm dev commands are intended for iterative development outside containers.

## Authentication Reference
For architectural details, see `docs/adr/0001-auth-strategy-nextauth-%2B-backend-jwt.md` and the PRD auth section in `docs/PRD.md#authentication`.

### Environment variables
Keep `.env` files aligned with the templates in `infra/env/`. The table below summarizes the auth-related variables and their intended use.

| Variable | Scope | Dev default | Notes |
| --- | --- | --- | --- |
| `JWT_SECRET` | `apps/api/.env` | `dev-secret` | Rotate per environment; used to sign access tokens for `/api/auth/*` routes. Set `JWT_REFRESH_SECRET` if refresh tokens are enabled. |
| `SESSION_BRIDGE_SECRET` | `apps/api/.env`, `apps/web/.env` | `dev-bridge-secret` | Shared secret that allows the Next.js app to exchange a NextAuth session for API JWTs via `/session-bridge`. Required for Docker to pass API cookies back to the browser. |
| `NEXTAUTH_SECRET` | `apps/web/.env` | `changeme` | Random 32+ character string generated with `openssl rand -hex 32`. In production this must be rotated and stored securely. |
| `NEXTAUTH_URL` | `apps/web/.env` | `http://localhost:3000` | Match the public URL serving the Next.js app. When deploying, update to `https://<your-domain>`. |
| `DATABASE_URL` | both | `postgresql://postgres:postgres@db:5432/taskforge?schema=public` | For local dev outside Docker switch the host from `db` to `localhost`. Production values should come from your managed Postgres provider. |
| `API_BASE_URL` | `apps/web/.env` | `http://api:4000/api/taskforge` | Server-side (Next.js) requests to the Express API. Include the `/api/taskforge` prefix so callers can append `/v1/*` paths consistently. |
| `NEXT_PUBLIC_API_BASE_URL` | `apps/web/.env` | `http://localhost:4000/api/taskforge` | Browser fetches to the Express API. Match the API origin plus `/api/taskforge` to mirror the Docker defaults. |
| `GITHUB_ID` / `GITHUB_SECRET` | `apps/web/.env` | _(blank)_ | Populate when enabling GitHub OAuth. Leave blank to hide the provider in development. |
| `GOOGLE_ID` / `GOOGLE_SECRET` | `apps/web/.env` | _(blank)_ | Same as above for Google OAuth. Configure OAuth consent screen and redirect URIs to match `NEXTAUTH_URL`. |
| `TF_DEV_BYPASS_AUTH` | both | `false` | Development/test-only escape hatch for local auth issues. Set to `true` in both apps only when using the documented dev bypass flow. |
| `TF_DEV_BYPASS_CLIENT_SECRET` | both | _(blank)_ | Shared HMAC secret for the dev bypass client token. Configure only with `TF_DEV_BYPASS_AUTH=true`; never set it in production. |
| `SMTP_HOST` / `SMTP_PORT` | `apps/api/.env` | `mailhog` / `1025` | Local Docker sends through MailHog. Production uses Resend SMTP; see `infra/env/api.prod.env.example` and `docs/prod/resend-email-setup.md`. |
| `SMTP_USER` / `SMTP_PASS` | `apps/api/.env` | _(blank)_ | Production Resend SMTP uses `SMTP_USER=resend` and stores the Resend API key in `SMTP_PASS`. Never commit real credentials. |
| `EMAIL_FROM` | `apps/api/.env` | `TaskForge <noreply@taskforge.local>` | Production must use a sender on the verified Resend domain. |
| `SEED_USER_PASSWORD` | `apps/api/.env` (optional) | `Demo1234!` | Overrides the deterministic password used during seeding. |
| `BCRYPT_SALT_ROUNDS` | `apps/api/.env` (optional) | `10` | Tune hashing cost if parity with production is required. |

For multi-subdomain deployments (for example `api.taskforge.app` and `app.taskforge.app`), set `COOKIE_DOMAIN` in both `.env` files so session cookies are shared correctly.

### Local vs. Docker setup
1. Copy the env templates: `cp infra/env/api.env.example apps/api/.env` and `cp infra/env/web.env.example apps/web/.env`.
2. Update the secrets listed above. For Docker-based workflows keep the Postgres host as `db`; when running the dev servers directly (`pnpm -C apps/* dev`) point `DATABASE_URL` at `localhost` or your cloud instance.
3. Restart the affected service after changing secrets (for example, `pnpm -C apps/web dev` or `make up`).

### OAuth providers
- Configure any provider credentials that are available. Leaving the variables blank keeps the login screen in a safe "No providers configured" state.
- Google Cloud
  1. Create an OAuth consent screen (External) in https://console.cloud.google.com/apis/credentials
  2. Add an OAuth 2.0 Client ID (Web application) with authorized origins `http://localhost:3000` and redirect URI `http://localhost:3000/api/auth/callback/google` for local development.
  3. Repeat the setup with production domains and update `NEXTAUTH_URL` plus redirect URIs to match.
- GitHub: create an OAuth app at https://github.com/settings/developers. Use the same callback pattern `http://localhost:3000/api/auth/callback/github` while testing locally.
- Accounts created through Google or GitHub reuse existing credential users when the email matches.

### Database migrations and seed user
Run Prisma migrations whenever the schema changes:

```bash
pnpm -C apps/api prisma migrate dev
```

Use `pnpm -C apps/api prisma migrate deploy` when applying the same migrations to managed environments or the Dockerised Postgres service.

Before the first production database is created, development migrations may be squashed into a clean timestamped baseline. See [Database Migration Squash Before Production](docs/prod/database-migration-squash.md) for the rules and verification checklist.

Seed the deterministic demo user (`demo@taskforge.dev` / `Demo1234!` by default) for QA flows:

```bash
pnpm -C apps/api tsx prisma/seed.ts
# or
make seed
```

Running the seed multiple times is safe; it upserts the user and respects `SEED_USER_PASSWORD` if provided. The seed user is available in both the API JWT flow and the NextAuth login page.

### Auth smoke tests
1. API-only JWT flow
   ```bash
   pnpm -C apps/api dev
   # in another shell (use curl if HTTPie is not available)
   http POST :4000/api/taskforge/v1/auth/login email=demo@taskforge.dev password=Demo1234!
   http GET :4000/api/taskforge/v1/auth/me "Authorization:Bearer <token>"
   ```
   Replace `<token>` with the `accessToken` returned from the login response.
2. Docker bridge test: run `make up` then `make auth-smoke`. The script registers, logs in, and exercises the `/session-bridge` endpoint using the shared `SESSION_BRIDGE_SECRET` to ensure the Next.js container can exchange sessions with the API.
3. NextAuth UI: start the web app (`pnpm -C apps/web dev`) and visit `http://localhost:3000/login`. With provider credentials in place, GitHub/Google buttons appear; otherwise a helper callout explains how to enable them. After signing in, the app redirects to the dashboard and confirms session state in the header.

Approved screenshots are not committed yet. Attach UI screenshots to PRs when they help review, and use the milestone manual checklists as the source of truth for hands-on verification.


## API HTTP packs for QA demos

Reusable HTTP request packs live in `apps/api/tests/`:
- `auth.http` (auth smoke flows)
- `tasks.http` (task CRUD and filters)
- `kanban.http` (board fetch/move + tag list/create)

Use environment variables/placeholders instead of fixed hosts (`@apiBaseUrl`, `{{accessToken}}`) so the same files run against local, dev, and staging environments.

Quick validation command:
```bash
pnpm -C apps/api run lint:http
```


## Kanban Board + Tag Workflow (Milestone 4)

### Board behavior summary
- **Board order** enables true manual reordering (same-column + cross-column).
- **Sorted views** (due date, priority, recently updated) allow status moves across columns but do not allow same-column reorder.
- In sorted views, the move payload still includes `targetIndex`, but placement is recalculated by the active sort after mutation/refetch.
- Board moves are persisted through `PATCH /api/taskforge/v1/tasks/board/move` with `{ taskId, targetStatus, targetIndex }`.

### Docker and drag/drop notes
- Use a Chromium-based browser (Chrome/Edge) when validating pointer/keyboard drag interactions inside Dockerized dev environments.
- Start containers with `make up`, then open `http://localhost:3000` from the host OS browser (avoid in-container headless validation for tactile drag UX).
- If drag feels unresponsive, ensure both `web` and `api` containers are healthy via `docker ps` and confirm `NEXT_PUBLIC_API_BASE_URL` points to `http://localhost:4000/api/taskforge`.

### Run the Kanban `.http` pack
Use the API request pack to validate board + tags quickly:
```bash
pnpm -C apps/api run lint:http
# then run apps/api/tests/kanban.http in your HTTP client
```

### QA checklists (Milestone 4)
- Manual: `docs/testing/milestone4-manual-checklist.md`
- Automated: `docs/testing/milestone4-automated.md`
- Task sequence + implementation notes: `docs/tasks/milestone4/sequence.md`

## Continuous Integration
- The GitHub Actions workflow (`.github/workflows/ci.yml`) provisions a PostgreSQL service, runs `prisma generate`, and applies migrations via `prisma migrate deploy` before executing the Jest suite in `apps/api`.
- Frontend tests run through `pnpm test` in `apps/web`; `make test` runs both the API and web suites locally.
- Configure repository secrets (`CI_JWT_SECRET`, `CI_JWT_REFRESH_SECRET`, `CI_SESSION_BRIDGE_SECRET`, `CI_NEXTAUTH_SECRET`) to override the CI-safe defaults used in the workflow when running against staging infrastructure.

### Accessing session state in code
- Server components read the active session via `getCurrentUser()` (`apps/web/lib/server-auth.ts`).
- Client components use `useAuth()` (`apps/web/lib/use-auth.ts`), a thin wrapper around `next-auth/react`'s `useSession()` hook.

## Scripts
- `make dev` - run api + web (assumes local dev, not cross-platform background management).
- `make lint` / `make typecheck` - run API and web static checks.
- `make test` - run API Jest/Supertest tests and web Vitest/Testing Library tests.
- `make build` - build API and web packages.
- `make ci` - local CI rehearsal: install, lint, typecheck, test, and build.
- `make migrate` / `make seed` - database operations.
- `make swagger` - export OpenAPI.

## Deploy Targets (free tiers)
- FE: Vercel
- BE: Render or Railway
- DB: Neon or Supabase
- Email: Nodemailer SMTP adapter is available. Local Docker defaults to MailHog; production defaults to Resend SMTP (`smtp.resend.com:587`). See `docs/prod/resend-email-setup.md`.

Task data persists via Prisma. Run migrations before exercising the API in any environment.
