# Browser Auth, CORS, Cookies, and Trusted Proxies

Use this runbook for the deployed web/API browser path. Runtime code must not hard-code production domains; operators choose the exact origins and cookie topology for each environment.

## CORS origin policy

Task, tag, board, email preference, digest preview, and manual digest clients call the Express API directly from the browser or server using `NEXT_PUBLIC_API_BASE_URL` / `API_BASE_URL`. The web app does not provide a general task/tag/board proxy; it has auth/session routes and the cron proxy only. Treat CORS and cookie configuration as first-class production facts, not optional hardening.

- Set `CORS_ALLOWED_ORIGINS` on the API to the exact comma-separated browser origins that may call it with credentials, for example `https://app.example.com,https://admin.example.com`.
- Entries must be origins only: scheme, host, and optional port. Do not include paths, query strings, fragments, or trailing path segments such as `/dashboard`.
- Production fails closed when `CORS_ALLOWED_ORIGINS` is unset. No production fallback origin is assumed.
- Local defaults continue to allow `http://localhost:3000` and `http://127.0.0.1:3000` when `CORS_ALLOWED_ORIGINS` is unset outside production.
- Preview deployments are not implicitly trusted. Either add each preview origin explicitly or document that preview web deployments may only call matching preview APIs and not the production API.

## Cookie topology

TaskForge uses an API session cookie named `tf_session`. The API and web session bridge set it as `httpOnly`, `SameSite=Lax`, and seven days long. `Secure` is enabled when `NODE_ENV=production`.

The supported v1 browser-auth topology is same-site. Choose one of these before launch:

1. **Same host or API behind the web origin**: leave `COOKIE_DOMAIN` unset so the browser stores a host-only cookie.
2. **Same-site cross-subdomain production**, for example `app.example.com` and `api.example.com`: set the same parent domain in both API and web environments, for example `COOKIE_DOMAIN=.example.com`, so the browser can send the API cookie across the selected subdomains.
3. **Raw unrelated platform domains**: do not use this for production browser auth. A Vercel default host calling a Render/Railway default host is cross-site, so `SameSite=Lax` API cookies and the web `/auth/session-bridge` cookie handoff cannot reliably authorize browser API requests. Put the API behind the web origin or assign same-site custom domains first.
4. **Preview deployments**: leave `COOKIE_DOMAIN` unset unless the preview host is under a parent domain intentionally shared with the API. Do not point arbitrary preview URLs at the production API unless their origins are listed in `CORS_ALLOWED_ORIGINS` and the cookie-domain implications are accepted.

The `/auth/session-bridge` web route must remain `no-store`, sanitize `from` redirects to same-site paths, require an authenticated web user before minting a fresh API token, probe existing non-expired API cookies, and set the API session cookie with the same domain/SameSite/Secure policy selected above.

## TRUST_PROXY policy

- Leave `TRUST_PROXY` unset locally; Express will use the direct socket address and ignore arbitrary forwarded client IP headers.
- Set `TRUST_PROXY=false` explicitly only when documenting that the API is not behind a trusted forwarding proxy.
- Use `TRUST_PROXY=1` only when the API is exactly one trusted platform proxy hop away and that platform scrubs inbound `X-Forwarded-*` headers before adding its own values.
- Use an explicit proxy/CIDR list such as `loopback,10.0.0.0/8` only when those networks are actually controlled by the deployment platform.
- Do not use `TRUST_PROXY=true` in production unless every upstream hop is trusted; it allows clients to influence forwarded-header-derived values such as `req.ip`, which affects IP-based rate limits.

## Deployed browser smoke

1. Deploy the API with the complete production input set from `infra/env/api.prod.env.example`: `PORT`, `NODE_ENV=production`, `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `SESSION_BRIDGE_SECRET`, explicit `CORS_ALLOWED_ORIGINS`, `API_JSON_BODY_LIMIT`, `DIGEST_JOB_SECRET`, selected same-site host/domain topology, selected `COOKIE_DOMAIN`, chosen `TRUST_PROXY`, `TF_DEV_BYPASS_AUTH=false`, blank `TF_DEV_BYPASS_CLIENT_SECRET`, and the Resend values `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`, and `EMAIL_DAILY_SEND_LIMIT` when production email is enabled.
2. Deploy the web app with the complete production input set from `infra/env/web.prod.env.example`: `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `DATABASE_URL`, `API_BASE_URL`, `NEXT_PUBLIC_API_BASE_URL`, `SESSION_BRIDGE_SECRET`, `CRON_SECRET`, `DIGEST_JOB_SECRET`, `TF_DEV_BYPASS_AUTH=false`, blank `TF_DEV_BYPASS_CLIENT_SECRET`, selected `COOKIE_DOMAIN`, and any enabled OAuth provider credentials (`GITHUB_ID`/`GITHUB_SECRET`, `GOOGLE_ID`/`GOOGLE_SECRET`) with callbacks matching `NEXTAUTH_URL`.
3. In a real browser at the deployed web origin, sign in or register.
4. Open DevTools Network and confirm the authenticated API request includes credentials, passes preflight when applicable, and receives JSON rather than a browser CORS failure.
5. Confirm the `tf_session` cookie attributes match the selected topology: `HttpOnly`, `SameSite=Lax`, `Secure` in production, and either host-only or the configured parent domain.
6. From an unlisted origin or controlled curl/preflight check, confirm the API does not return `Access-Control-Allow-Origin` for that origin.


## Placeholder locations

- API placeholders: `infra/env/api.prod.env.example` contains `PORT=4000`, `CORS_ALLOWED_ORIGINS=https://<APP_DOMAIN>`, `API_JSON_BODY_LIMIT=64kb`, `DATABASE_URL=<MANAGED_POSTGRES_URL>`, `JWT_SECRET=<ROTATED_API_JWT_SECRET>`, `JWT_REFRESH_SECRET=<ROTATED_API_REFRESH_SECRET>`, `SESSION_BRIDGE_SECRET=<ROTATED_SESSION_BRIDGE_SECRET>`, `TF_DEV_BYPASS_AUTH=false`, blank `TF_DEV_BYPASS_CLIENT_SECRET=`, Resend SMTP placeholders, `DIGEST_JOB_SECRET=<RANDOM_DIGEST_JOB_SECRET>`, `NODE_ENV=production`, `TRUST_PROXY=1` with comments, and the optional `# COOKIE_DOMAIN=.example.com` line.
- Web placeholders: `infra/env/web.prod.env.example` contains `NEXTAUTH_URL=https://<APP_DOMAIN>`, `NEXTAUTH_SECRET=<ROTATED_NEXTAUTH_SECRET>`, `DATABASE_URL=<MANAGED_POSTGRES_URL>`, OAuth provider placeholders, `SESSION_BRIDGE_SECRET=<ROTATED_SESSION_BRIDGE_SECRET>`, `API_BASE_URL=https://<API_DOMAIN>/api/taskforge`, `NEXT_PUBLIC_API_BASE_URL=https://<API_DOMAIN>/api/taskforge`, `CRON_SECRET=<RANDOM_VERCEL_CRON_SECRET>`, `DIGEST_JOB_SECRET=<RANDOM_DIGEST_JOB_SECRET>`, `TF_DEV_BYPASS_AUTH=false`, blank `TF_DEV_BYPASS_CLIENT_SECRET=`, and the optional `# COOKIE_DOMAIN=.example.com` line.
