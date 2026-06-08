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
| Branch and commit SHA deployed | `<TBD after deployment>` |
| OAuth providers enabled for v1 | `<TBD before deployed smoke>` |
| Digest scheduler status | Vercel Cron selected; real scheduled sends disabled until email gates pass |
| Production email status | Resend selected; real scheduled sends disabled until fact register and smoke pass |
| First production email monitoring owner | `<TBD before email enablement>` |
| Known launch limitations | Free-tier cold starts; one API instance; scheduled email disabled until gates pass |

## Secret Storage Locations

Record only locations, never values.

| Value | Storage location | Required in |
| --- | --- | --- |
| `DATABASE_URL` | Neon project connection string copied into Vercel and Render environment variables | Web, API, migration runner |
| `JWT_SECRET` | Render API service environment variable | API |
| `JWT_REFRESH_SECRET` | Render API service environment variable | API |
| `NEXTAUTH_SECRET` | Vercel web project production environment variable | Web |
| `SESSION_BRIDGE_SECRET` | Same generated value in Render API and Vercel web environment variables | API, web |
| `DIGEST_JOB_SECRET` | Same generated value in Render API and Vercel web environment variables | API, web cron proxy |
| `CRON_SECRET` | Vercel web project production environment variable only | Web cron proxy |
| GitHub OAuth client ID/secret | GitHub OAuth app dashboard; copied into Vercel web environment variables if enabled | Web |
| Google OAuth client ID/secret | Google Cloud OAuth client; copied into Vercel web environment variables if enabled | Web |
| `SMTP_PASS` / Resend API key | Resend API key copied into Render API service environment variable only | API |
| `EMAIL_FROM` | Non-secret sender address from verified Resend domain, stored in Render API env | API |
| `TF_DEV_BYPASS_CLIENT_SECRET` | Not stored for production | None |

## Manual Step Timing

### Before Agent

1. Approve the v1 scope freeze: release blockers, production configuration, verification, docs, and responsive fixes only.
2. Confirm account access for Vercel, Render, Neon, Resend, DNS registrar, GitHub OAuth, and Google Cloud OAuth if those OAuth providers are enabled.
3. Choose the owned parent domain and final app/API subdomains.
4. Create or select the Vercel web project, Render API service, and Neon Postgres project.
5. Generate production secrets directly in provider secret managers or a password manager; do not paste them into chat, docs, HTTP files, screenshots, or commits.
6. Create OAuth applications and configure callback URLs that match `NEXTAUTH_URL`.
7. Verify the Resend sending domain and DNS records before enabling real email sends.

### Agent After Human Provides Facts

1. Replace non-secret `<TBD before deployment>` values in this register.
2. Update `CORS_ALLOWED_ORIGINS`, `NEXTAUTH_URL`, API base URLs, cookie-domain notes, and OAuth provider status in docs without recording secrets.
3. Record the deployed branch SHA and provider project names.
4. Run or document deployment smoke checks from `docs/testing/milestone7-manual-checklist.md`.
5. Update `docs/prod/email-production-rollout.md` only after Resend and observability facts are known.

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
