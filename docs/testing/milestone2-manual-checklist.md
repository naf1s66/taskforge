# Milestone 2 Manual Auth Checklist

Use this list whenever you need to certify that the authentication stack still works end-to-end. Mark each item as you go—if any step fails, capture logs and file a ticket before claiming the milestone is complete.

## 1. Pre-flight setup
- [ ] Copy env templates: `cp infra/env/api.env.example apps/api/.env` and `cp infra/env/web.env.example apps/web/.env` (or update existing files).
- [ ] Fill in secrets (`JWT_SECRET`, `SESSION_BRIDGE_SECRET`, `NEXTAUTH_SECRET`, `API_BASE_URL`, `NEXT_PUBLIC_API_BASE_URL`) and keep values in sync between apps.
- [ ] Install deps + generate Prisma client: `pnpm install && pnpm --filter @taskforge/api exec prisma generate`.
- [ ] Apply migrations + seed demo user: `pnpm -C apps/api prisma migrate deploy` then `pnpm -C apps/api tsx prisma/seed.ts`.

## 2. API credential flow
- [ ] Start the API locally: `pnpm -C apps/api dev`.
- [ ] Register a user via HTTP: `http POST :4000/api/taskforge/v1/auth/register email=tester@example.com password=Taskforge!1`.
- [ ] Confirm the response includes `tokens.accessToken`, `tokens.refreshToken`, and `set-cookie: tf_session=...` headers.
- [ ] Call `/auth/me` with the returned bearer token: `http GET :4000/api/taskforge/v1/auth/me "Authorization:Bearer <token>"` and verify the user payload matches the registration email.
- [ ] Attempt a bad login to confirm validation (expect `401` with `{ error: "Invalid credentials" }`).

## 3. Session bridge + logout
- [ ] With the API running, start the web app: `pnpm -C apps/web dev`.
- [ ] Visit `http://localhost:3000/login`, sign in with the seeded credentials, and ensure you are redirected to `/dashboard`.
- [ ] Hit `http://localhost:3000/auth/session-bridge?from=/dashboard` while signed in and confirm it redirects back without prompting again (cookie already valid).
- [ ] From the header avatar menu, click **Sign out** and verify that both the NextAuth session and the API `tf_session` cookie disappear (check devtools > Application > Cookies).

## 4. Google OAuth provisioning (one-time per environment)
- [ ] Go to [Google Cloud Console ? APIs & Services ? Credentials](https://console.cloud.google.com/apis/credentials) and create an OAuth consent screen (External ? Testing is fine for dev).
- [ ] Create an OAuth Client ID (Web application) with **Authorized JavaScript origins** = `http://localhost:3000` and **Authorized redirect URIs** = `http://localhost:3000/api/auth/callback/google`.
- [ ] Copy the generated `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` into `apps/web/.env` as `GOOGLE_ID`/`GOOGLE_SECRET`.
- [ ] Restart `pnpm -C apps/web dev` and confirm the Login page now shows a “Continue with Google” button.
- [ ] Complete a Google sign-in flow; after returning to TaskForge, confirm you land on `/dashboard` and the API `tf_session` cookie exists.

## 5. Docker auth smoke
- [ ] Run `make up` from the repo root and wait for `db`, `api`, and `web` containers to become healthy.
- [ ] Execute `make auth-smoke`—the script registers/logs in from inside the web container, calls the session bridge, and asserts `/v1/me` returns the same user.
- [ ] Tear down the stack when finished: `make down`.

## 6. Documentation spot-check
- [ ] Scan `README.md` ? Authentication Reference to ensure secrets + workflows match the current env.
- [ ] Verify `docs/PRD.md` (Auth sections) and `docs/adr/0001-*.md` still describe the delivered flows; update if any deviations were introduced.
- [ ] Update this checklist with any new edge cases you encounter so future runs stay accurate.
