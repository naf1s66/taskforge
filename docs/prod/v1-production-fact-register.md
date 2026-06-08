# v1 Production Fact Register

This register records non-secret production launch decisions for Milestone 7. Keep real secret values in provider secret managers only.

## Current State

- Status: pre-deployment register ready for human-owned account and domain facts.
- Register date: 2026-06-08.
- v1 deployment target: Vercel web, Render API, Neon Postgres, Resend SMTP, Vercel Cron.
- Fallbacks: Railway may replace Render and Supabase may replace Neon only if the launch owner records the change here before deployment.
- Production browser-auth topology: same-site custom subdomains under one owned parent domain.
- Raw default-domain topology: rejected for v1 browser auth.
- v1 scope freeze: accepted. Milestone 7 allows release blockers, production configuration, verification, docs, and responsive fixes only. Major product features move to post-launch tasks.

## Selected Topology

| Surface | v1 selection | Notes |
| --- | --- | --- |
| Web origin | `https://<APP_DOMAIN>` on Vercel | Use an owned custom subdomain, for example `app.example.com`. |
| API origin | `https://<API_DOMAIN>` on Render | Use a same-site custom subdomain, for example `api.example.com`. |
| API base path | `https://<API_DOMAIN>/api/taskforge` | Required by `API_BASE_URL` and `NEXT_PUBLIC_API_BASE_URL`. |
| Cookie domain | `COOKIE_DOMAIN=.<owned-parent-domain>` | Required for cross-subdomain `tf_session` cookies. Leave unset only if API is served behind the web origin later. |
| CORS | Exact web origin list only | `CORS_ALLOWED_ORIGINS` must include `https://<APP_DOMAIN>` and no paths. |
| OAuth callbacks | `https://<APP_DOMAIN>/api/auth/callback/<provider>` | Provider callbacks must match `NEXTAUTH_URL`. |
| Rate-limit topology | One API instance for v1 | Add a shared limiter store before horizontal scaling. |
| Trusted proxy | Render-specific proxy setting, usually `TRUST_PROXY=1` | Use `1` only after confirming Render is the single trusted scrubbing proxy hop. |
| API SMTP egress | Resend SMTP STARTTLS on port `2587` | Selected free-hosting path after provider-doc check: Render free blocks outbound `25`, `465`, and `587`; Resend supports `2587`. Task 04 must prove this from the deployed API host. |

Do not deploy v1 browser auth with raw unrelated provider domains such as `*.vercel.app` calling `*.onrender.com` or `*.up.railway.app`. Those domains are cross-site and are incompatible with the selected `SameSite=Lax` API cookie handoff.

## Non-Secret Facts To Fill

| Fact | Current value |
| --- | --- |
| Launch owner | `<TBD before deployment>` |
| Vercel account/team | `<TBD before deployment>` |
| Vercel web project name | `<TBD before deployment>` |
| Render account/team | `<TBD before deployment>` |
| Render API service name | `<TBD before deployment>` |
| Neon account/project/branch | `<TBD before deployment>` |
| Owned parent domain | `<TBD before deployment>` |
| Final web origin | `<TBD before deployment>` |
| Final API origin | `<TBD before deployment>` |
| Final `COOKIE_DOMAIN` | `<TBD before deployment>` |
| Final `CORS_ALLOWED_ORIGINS` | `<TBD before deployment>` |
| Final `NEXTAUTH_URL` | `<TBD before deployment>` |
| Final `API_BASE_URL` | `<TBD before deployment>` |
| Final `NEXT_PUBLIC_API_BASE_URL` | `<TBD before deployment>` |
| API runtime database URL shape | `<TBD before deployment>`; Neon pooled URL preferred for runtime if compatible with Prisma client |
| Migration database URL shape | `<TBD before deployment>`; Neon direct URL preferred for `prisma migrate deploy` |
| API SMTP egress result | `<TBD before deployment>`; prove `smtp.resend.com:2587` from deployed API host or document fallback |
| Branch and commit SHA deployed | `<TBD after deployment>` |
| OAuth providers enabled for v1 | GitHub and Google, provided both remain no-cost for basic sign-in with `openid`, email, and profile identity only |
| Digest scheduler status | Vercel Cron selected; real scheduled sends disabled until email gates pass |
| Production email status | Resend selected; real scheduled sends disabled until fact register and smoke pass |
| First production email monitoring owner | `<TBD before email enablement>` |
| Known launch limitations | Free-tier cold starts; one API instance; scheduled email disabled until gates pass |

## Provider Capability And Access Preflight

| Check | Status | Evidence |
| --- | --- | --- |
| Vercel project management | Confirmed | User confirmed project creation/settings access plus environment-variable and domain pages. |
| Render API service creation | Confirmed before service creation | User confirmed `+ New` and Web Service creation access; environment variables and custom domains require an actual service and will be verified during API service creation. |
| Neon Postgres capability | Confirmed from official docs | Neon supports projects, Postgres connection strings, and pooled connection strings; project creation is deferred to database provisioning. |
| DNS provider capability | Confirmed from official docs | Vercel and Render custom subdomains require DNS records at the domain provider; final records are deferred until domains are chosen. |
| Resend email capability | Confirmed from official docs | Resend supports verified sending domains, API key creation, and SMTP with `smtp.resend.com`, username `resend`, API key as password, and STARTTLS port `2587`. Real setup is deferred until API provisioning/email enablement. |
| Render free SMTP egress | Port-adjusted path selected | Render free web services block outbound `25`, `465`, and `587`; Resend `2587` is the selected no-cost SMTP path and must be proved in Task 04. |
| GitHub OAuth capability | Enabled for v1 | GitHub OAuth Apps can be registered from Developer settings; final callback is `https://<APP_DOMAIN>/api/auth/callback/github`. |
| Google OAuth capability | Enabled for v1 if no paid requirement appears during setup | Google Auth Platform supports OAuth 2.0 web clients with client ID/secret and redirect URIs; use only basic sign-in scopes. Disable Google for v1 if setup requires billing, paid verification, or sensitive/restricted scopes. |

## Secret Storage Locations

Record only locations, never values.

| Value | Storage location | Required in |
| --- | --- | --- |
| `DATABASE_URL` | Neon connection string copied into Vercel and Render environment variables | Web, API |
| Migration database URL | Neon direct connection string stored only for the migration runner/operator environment | Migration runner |
| `JWT_SECRET` | Render API service environment variable | API |
| `JWT_REFRESH_SECRET` | Render API service environment variable | API |
| `NEXTAUTH_SECRET` | Vercel web project production environment variable | Web |
| `SESSION_BRIDGE_SECRET` | Same generated value in Render API and Vercel web environment variables | API, web |
| `DIGEST_JOB_SECRET` | Same generated value in Render API and Vercel web environment variables | API, web cron proxy |
| `CRON_SECRET` | Vercel web project production environment variable only | Web cron proxy |
| GitHub OAuth client ID/secret | GitHub OAuth app dashboard; copied into Vercel web environment variables if enabled | Web |
| Google OAuth client ID/secret | Google Cloud OAuth client; copied into Vercel web environment variables if enabled | Web |
| `SMTP_PASS` / Resend API key | Resend API key copied into Render API service environment variable only | API |
| `SMTP_PORT` | Non-secret Render API env value, selected as `2587` for v1 | API |
| `EMAIL_FROM` | Non-secret sender address from verified Resend domain, stored in Render API env | API |
| `TF_DEV_BYPASS_CLIENT_SECRET` | Not stored for production | None |

## Manual Step Timing

This section defines launch ownership, but not every row is part of task 01. Task 01 is complete once decisions, capability checks, secret storage locations, and sequencing are recorded. Rows that require real projects, DNS, secrets, OAuth dashboards, deployment, smoke, or email sending are deferred to the later Milestone 7 tasks named below.

### Before Agent

1. Task 01: approve the v1 scope freeze: release blockers, production configuration, verification, docs, and responsive fixes only.
2. Task 01: confirm selected provider capability/access paths for Vercel, Render, Neon, DNS, Resend, GitHub OAuth, and Google OAuth.
3. Task 04: choose the owned parent domain and final app/API subdomains.
4. Task 04: create or select the Vercel web project, Render API service, and Neon Postgres project.
5. Task 04 or Task 06: generate production secrets directly in provider secret managers or a password manager; do not paste them into chat, docs, HTTP files, screenshots, or commits.
6. Task 04 or Task 05: create OAuth applications and configure callback URLs that match `NEXTAUTH_URL`.
7. Task 04: prove API startup and SMTP egress using Resend STARTTLS on `smtp.resend.com:2587`, or record a no-cost fallback before deployment smoke.
8. Task 06: verify the Resend sending domain and DNS records before enabling real email sends.

### Agent After Human Provides Facts

1. Task 04: replace non-secret `<TBD before deployment>` values in this register.
2. Task 04: update `CORS_ALLOWED_ORIGINS`, `NEXTAUTH_URL`, API base URLs, cookie-domain notes, database URL shape, SMTP egress result, and OAuth provider status in docs without recording secrets.
3. Task 04: record the deployed branch SHA and provider project names.
4. Task 05: run or document deployment smoke checks from `docs/testing/milestone7-manual-checklist.md`.
5. Task 06: update `docs/prod/email-production-rollout.md` only after Resend and observability facts are known.

### Human-Only

1. Account ownership, billing, plan, and team access decisions.
2. DNS registrar edits and provider domain verification.
3. Secret generation, rotation, and secret-manager entry.
4. OAuth consent-screen approval and provider dashboard changes.
5. Resend domain verification, API key creation, and provider alert destination setup.
6. Final launch approval and any decision to enable real scheduled email sends.

## Verification Rules

- Remaining placeholders are allowed only where the value depends on human-owned accounts, domains, or provider secrets.
- Real secrets must not appear in git diffs, docs, PR comments, screenshots, HTTP files, or terminal transcripts.
- Raw unrelated default domains remain rejected for production browser auth.
- Scheduled email sends remain disabled until `docs/prod/email-production-rollout.md` has no `<TBD before enablement>` values and the manual-only smoke passes.
