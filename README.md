# TaskForge (Monorepo)

**Full-stack Task Manager** showcasing Next.js (TS) + shadcn/ui + Tailwind + Framer Motion • Express (TS) • PostgreSQL (Neon/Supabase) • Prisma • JWT auth flows • Swagger/OpenAPI • Jest/Supertest • Docker • GitHub Actions.


> _Authenticated task list preview available in the design handoff; binary assets are excluded from the repository._

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
3. **Apply Prisma migrations (required for the task repository)**
   ```bash
   pnpm -C apps/api prisma migrate dev
   ```
   Re-run this whenever the Prisma schema changes to keep your local database aligned.
4. **Run static checks**
   ```bash
   pnpm lint
   pnpm typecheck
   ```
5. **Start the Docker services (Postgres + MailHog + app containers)**
   ```bash
   make up
   # when finished
   make down
   ```
6. **Run dev servers locally (hot reload)**
   ```bash
   pnpm -C apps/api dev
   pnpm -C apps/web dev
   ```
7. **Smoke test**
   - API health: `curl http://localhost:4000/api/taskforge/v1/health`
   - Web UI: http://localhost:3000
8. **Docker auth smoke test**
   ```bash
   make auth-smoke
   ```
   This runs a scripted register/login/bridge check from inside the web container to confirm it can reach the API with the shared `SESSION_BRIDGE_SECRET`.

> `make up` builds and starts the Dockerized API/Web services, while the pnpm dev commands are ideal for iterative development outside containers.

## Testing

- **API integration tests** – `pnpm -C apps/api test`
  - Spins up a disposable Postgres instance, applies Prisma migrations, then runs the Jest/Supertest suite that exercises auth plus the task CRUD/filter flows (tags, cross-user guards, pagination, validation).
  - The same command runs in CI via `make test` / `make ci`, so keep it green before opening pull requests.

## Authentication Reference
> For deeper architectural decisions see [ADR 0001 – Auth strategy](docs/adr/0001-auth-strategy-nextauth-%2B-backend-jwt.md) and the [PRD auth section](docs/PRD.md#authentication).

### Environment variables
Keep `.env` files in sync with the templates in `infra/env/`. The table below highlights auth-related variables and how to adjust them between local development and production deployments.

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
| `GOOGLE_ID` / `GOOGLE_SECRET` | `apps/web/.env` | _(blank)_ | Same as above for Google OAuth. Configure OAuth consent screen + redirect URIs to match `NEXTAUTH_URL`. |
| `SEED_USER_PASSWORD` | `apps/api/.env` (optional) | `Demo1234!` | Overrides the deterministic password used during seeding. |
| `BCRYPT_SALT_ROUNDS` | `apps/api/.env` (optional) | `10` | Tune hashing cost if you need parity with production infrastructure. |

> **Production tip:** uncomment `COOKIE_DOMAIN` in both `.env` files when deploying across subdomains (for example `api.taskforge.app` and `app.taskforge.app`) so session cookies are shared correctly.

### Local vs. Docker setup
1. Copy the env templates: `cp infra/env/api.env.example apps/api/.env` and `cp infra/env/web.env.example apps/web/.env`.
2. Update the secrets listed above. For Docker-based workflows keep the Postgres host as `db`; when running the dev servers directly (`pnpm -C apps/* dev`) point `DATABASE_URL` at `localhost` or your cloud instance.
3. Restart the affected service after changing secrets (e.g., `pnpm -C apps/web dev` or `make up`).

### OAuth providers
- Configure any provider credentials you have. Leaving the variables blank keeps the login screen in a safe “No providers configured” state.
- **Google Cloud**
  1. Create an OAuth consent screen (External) in [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
  2. Add an OAuth 2.0 Client ID (Web application) with authorized origins `http://localhost:3000` and redirect URI `http://localhost:3000/api/auth/callback/google` for local development.
  3. Repeat the setup with your production domains and update `NEXTAUTH_URL` plus redirect URIs to match.
- **GitHub** – create an OAuth app at <https://github.com/settings/developers>. Use the same callback pattern `http://localhost:3000/api/auth/callback/github` while testing locally.
- Accounts created through Google or GitHub reuse existing credential users when the email matches, letting teammates link social login after registering with a password.

### Database migrations and seed user
Run Prisma migrations whenever the schema changes:

```bash
pnpm -C apps/api prisma migrate dev
```

Use `pnpm -C apps/api prisma migrate deploy` when applying the same migrations to managed environments or the Dockerised Postgres service.

Seed the deterministic demo user (`demo@taskforge.dev` / `Demo1234!` by default) for QA flows:

```bash
pnpm -C apps/api tsx prisma/seed.ts
# or
make seed
```

Running the seed multiple times is safe—it upserts the user and respects `SEED_USER_PASSWORD` if provided. The seed user surfaces in both the API JWT flow and the NextAuth login page.

### Auth smoke tests
1. **API-only JWT flow**
   ```bash
   pnpm -C apps/api dev
   # in another shell (use curl if you do not have HTTPie installed)
   http POST :4000/api/taskforge/v1/auth/login email=demo@taskforge.dev password=Demo1234!
   http GET :4000/api/taskforge/v1/auth/me "Authorization:Bearer <token>"
   ```
   Replace `<token>` with the `accessToken` returned from the login response.
2. **Docker bridge test** – `make up` then run `make auth-smoke`. The script registers, logs in, and exercises the `/session-bridge` endpoint using the shared `SESSION_BRIDGE_SECRET` to ensure the Next.js container can exchange sessions with the API.
3. **NextAuth UI** – start the web app (`pnpm -C apps/web dev`) and visit [`http://localhost:3000/login`](http://localhost:3000/login). With provider credentials in place you should see GitHub/Google buttons; otherwise a helper callout explains how to enable them. After signing in you are redirected to the dashboard which confirms session state in the header.

Screenshots of the login flow and protected dashboard live in the design references inside the PRD and ADR linked above. Capture fresh UI snapshots for release notes or marketing updates as needed.

## Tasks API
The task routes live under `/api/taskforge/v1/tasks` and require the authenticated user's JWT. You can supply the token either as a Bearer header or via the shared `tf_session` cookie issued during login/registration.

```bash
# 1) Start the API locally
pnpm -C apps/api dev

# 2) Authenticate (see apps/api/tests/auth.http for detailed flows)

# 3) List the first page of tasks (defaults: page=1, pageSize=20)
curl -b "tf_session=$ACCESS_TOKEN" -H "Authorization: Bearer $ACCESS_TOKEN" \
  "http://localhost:4000/api/taskforge/v1/tasks?page=1&pageSize=10"

# 3b) Filter high priority in-progress docs tasks due this quarter
curl -b "tf_session=$ACCESS_TOKEN" -H "Authorization: Bearer $ACCESS_TOKEN" \
  "http://localhost:4000/api/taskforge/v1/tasks?q=release&status=IN_PROGRESS&priority=HIGH&tag=docs&dueFrom=2024-01-01T00:00:00.000Z&dueTo=2024-03-31T23:59:59.999Z"

# 4) Create a task for the signed-in user
curl -b "tf_session=$ACCESS_TOKEN" -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Draft release notes","tags":["docs"]}' \
  http://localhost:4000/api/taskforge/v1/tasks
```

Responses use the shared DTOs from `packages/shared`, returning timestamps, status/priority defaults, and the normalized tag list. The list endpoint accepts optional `status`, `priority`, repeated `tag` parameters, free-text search via `q`, and ISO `dueFrom`/`dueTo` ranges that map directly to repository-level filters. Validation failures mirror the auth endpoints by responding with `{"error":"Invalid payload","details":...}`.

## Continuous Integration
- The GitHub Actions workflow (`.github/workflows/ci.yml`) provisions a PostgreSQL service, runs `prisma generate`, and applies
  migrations via `prisma migrate deploy` before executing the auth-focused Jest suite in `apps/api`.
- Frontend auth tests should be exposed through `pnpm test` in `apps/web`; the CI job runs that script automatically when it is
  present so browser coverage can gate merges alongside the API checks.
- Configure repository secrets (`CI_JWT_SECRET`, `CI_JWT_REFRESH_SECRET`, `CI_SESSION_BRIDGE_SECRET`, `CI_NEXTAUTH_SECRET`) to
  override the CI-safe defaults used in the workflow when running against staging infrastructure.

### Accessing session state in code
- Server components read the active session via `getCurrentUser()` (`apps/web/lib/server-auth.ts`).
- Client components use `useAuth()` (`apps/web/lib/use-auth.ts`), a thin wrapper around `next-auth/react`’s `useSession()` hook.

## Scripts
- `make dev` – run api + web (assumes local dev, not cross-platform background mgmt).
- `make migrate` / `make seed` – DB ops (requires Prisma client and seed hooked up).
- `make swagger` – export OpenAPI (placeholder script in `apps/api/src/openapi.export.js`).

## Deploy Targets (free tiers)
- FE: Vercel
- BE: Render or Railway
- DB: Neon or Supabase
- Email (dev): MailHog; (prod) any free SMTP (e.g., Brevo, Resend, Postmark trial)

**Note:** Task data (including tag assignments) now persists through Prisma. Run `pnpm -C apps/api prisma migrate dev` before exercising the API locally to ensure the task repository has the required tables.
