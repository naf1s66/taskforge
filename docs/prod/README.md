# Production Docs

Production and pre-launch operations docs live here. Milestone/task planning files stay under `docs/tasks`.

## Runbooks and ADRs

- `resend-email-setup.md` - Resend SMTP account, DNS, sender, and smoke-test checklist for pre-launch email enablement.
- `email-production-rollout.md` - production email fact register, enablement gates, manual production smoke, and post-production TODOs.
- `digest-scheduler.md` - protected digest job endpoint, Vercel Cron proxy, dry-run, and rollout checklist.
- `email-observability-runbook.md` - first-rollout review procedure, failure codes, delivery statuses, and post-production follow-up items.
- `database-migration-squash.md` - rules for squashing development Prisma migrations before the first production database exists.
- `dev-auth-bypass.md` - development bypass behavior and the production expectation that it stays disabled.
- `browser-auth-deployment.md` - deployed browser CORS, cookie-domain, session-bridge, and trusted-proxy runbook.
- `ci-release-coverage.md` - CI Docker/OpenAPI gate behavior and the v1 requirement to cover all pull requests.
- `v1-launch-checklist.md` - Milestone 7 production launch order, sign-off facts, and secret-handling rules.
- `v1-production-fact-register.md` - selected v1 provider shape, same-site topology, secret storage locations, manual step timing, and scope freeze.
- `adr/0004-hosting-vercel-render-neon.md` - accepted hosting topology decision.
- `adr/0006-digest-scheduler-invocation.md` - accepted free-tier digest scheduler invocation decision.
- `adr/0007-email-observability-rollout-decisions.md` - accepted monitoring, budget exhaustion, and scheduled-send enablement decisions for production email rollout.
- `adr/0008-release-candidate-security-and-deployment-gates.md` - accepted Milestone 6 release-candidate security/deployment gate decisions.

## Production placeholder map

Do not commit real secrets. Replace these placeholders in the deployment provider secret managers or production environment forms, not in git-tracked files.

Milestone 7 uses the non-secret launch register in `v1-production-fact-register.md` as the source of truth for selected provider targets, same-site browser-auth topology, secret storage locations, and manual step ownership.

## Selected v1 launch topology

- Web: Vercel with an owned custom web subdomain.
- API: Render with an owned custom API subdomain under the same parent domain.
- Database: Neon Postgres.
- Email: Resend SMTP, with scheduled sends disabled until the email enablement gates pass.
- Browser auth: same-site custom subdomains with an intentional shared `COOKIE_DOMAIN`.
- Rejected for v1: raw unrelated provider default domains such as Vercel default web origins calling Render/Railway default API origins.
- Scope freeze: Milestone 7 is limited to release blockers, production configuration, verification, docs, and responsive fixes. Major product features are post-launch work.

| Fact | Placeholder/location | Required production value |
| --- | --- | --- |
| API runtime port | `infra/env/api.prod.env.example`: `PORT=4000` | Platform service port, or the platform-provided override if the host requires one. |
| Browser origins allowed by API | `infra/env/api.prod.env.example`: `CORS_ALLOWED_ORIGINS=https://<APP_DOMAIN>` | Exact deployed web origin list, comma-separated, origins only. |
| API JSON body limit | `infra/env/api.prod.env.example`: `API_JSON_BODY_LIMIT=64kb` | Keep the low default unless a reviewed production payload need requires a larger cap. |
| Managed database URL | `infra/env/api.prod.env.example` and `infra/env/web.prod.env.example`: `DATABASE_URL=<MANAGED_POSTGRES_URL>` | Same managed Postgres connection string or provider-specific pooled/direct values for API, web NextAuth, and migrations. |
| API JWT signing secrets | `infra/env/api.prod.env.example`: `JWT_SECRET=<ROTATED_API_JWT_SECRET>`, `JWT_REFRESH_SECRET=<ROTATED_API_REFRESH_SECRET>` | Strong random values stored only in the API secret manager. |
| API runtime mode | `infra/env/api.prod.env.example`: `NODE_ENV=production` | Must be production for secure cookies, production CORS behavior, and production-only guardrails. |
| Web public URL | `infra/env/web.prod.env.example`: `NEXTAUTH_URL=https://<APP_DOMAIN>` | Exact HTTPS web origin used by browsers and OAuth callbacks. |
| Web auth secret | `infra/env/web.prod.env.example`: `NEXTAUTH_SECRET=<ROTATED_NEXTAUTH_SECRET>` | 32+ random bytes, stored only in web secret manager. |
| OAuth provider apps | `infra/env/web.prod.env.example`: `GITHUB_ID=`, `GITHUB_SECRET=`, `GOOGLE_ID=`, `GOOGLE_SECRET=` | Real provider client IDs/secrets only after callback URLs match `NEXTAUTH_URL`; leave blank to keep a provider disabled. |
| API/web session bridge secret | `infra/env/api.prod.env.example` and `infra/env/web.prod.env.example`: `SESSION_BRIDGE_SECRET=<ROTATED_SESSION_BRIDGE_SECRET>` | Same strong random value in API and web only. |
| Digest job secret | `infra/env/api.prod.env.example` and `infra/env/web.prod.env.example`: `DIGEST_JOB_SECRET=<RANDOM_DIGEST_JOB_SECRET>` | Same strong random value; authorizes API job endpoint. |
| Vercel cron secret | `infra/env/web.prod.env.example`: `CRON_SECRET=<RANDOM_VERCEL_CRON_SECRET>` | Strong random value used only by Vercel Cron/web route. |
| Cookie domain | `infra/env/api.prod.env.example` and `infra/env/web.prod.env.example`: commented `# COOKIE_DOMAIN=.example.com` | Leave unset for host-only cookies; set the shared parent domain only for deliberate same-site cross-subdomain auth. |
| Dev auth bypass | `infra/env/api.prod.env.example` and `infra/env/web.prod.env.example`: `TF_DEV_BYPASS_AUTH=false` | Must remain false in production; do not configure bypass client secrets. |
| Dev bypass client secret | `infra/env/api.prod.env.example` and `infra/env/web.prod.env.example`: `TF_DEV_BYPASS_CLIENT_SECRET=` | Must remain blank in production. |
| Trusted proxy chain | `infra/env/api.prod.env.example`: `TRUST_PROXY=1` with comments | Match the real platform proxy chain. Use `1` only when exactly one trusted proxy scrubs forwarded headers. |
| API base URLs used by web | `infra/env/web.prod.env.example`: `API_BASE_URL=https://<API_DOMAIN>/api/taskforge`, `NEXT_PUBLIC_API_BASE_URL=https://<API_DOMAIN>/api/taskforge` | Exact API origin plus `/api/taskforge`; browser calls task/tag/board routes directly. |
| Resend SMTP transport | `infra/env/api.prod.env.example`: `SMTP_HOST=smtp.resend.com`, `SMTP_PORT=587`, `SMTP_USER=resend`, `SMTP_PASS=<RESEND_API_KEY>` | API secret manager only for `SMTP_PASS`; never web/browser/repository. |
| Production email sender and budget | `infra/env/api.prod.env.example`: `EMAIL_FROM=<VERIFIED_SENDER_ON_RESEND_DOMAIN>`, `EMAIL_DAILY_SEND_LIMIT=90` | Sender on the verified Resend domain; keep the conservative budget unless the account/rollout plan changes. |

## Production enablement boundaries

- OAuth providers are implemented but production-enabled only after real provider apps, callback URLs, and secrets are configured.
- Digest scheduling is implemented but real scheduled sends remain disabled until `email-production-rollout.md` has no `<TBD before enablement>` values and manual-only Resend/observability checks pass.
- Resend is the production SMTP default, but real provider sends require a verified sending domain and safe sender/recipient checks.
- Cross-subdomain cookies are supported only when `COOKIE_DOMAIN` is deliberately set to a shared parent domain; unrelated platform domains are not a supported production browser-auth topology.
- Rate limits use in-process state for v1. Run one API instance or add a shared rate-limit store before horizontal scaling.
