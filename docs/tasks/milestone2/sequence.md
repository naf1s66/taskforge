# Milestone 2 Task Sequence (Auth System)

**Status:** ✅ Feature-complete. Manual auth checklist still pending (owner to run separately).

1. [x] **01-prisma-auth-models-and-migrations.md** - Prisma schema + migrations checked in for Users/Accounts/Sessions, matching ADR 0001.
2. [x] **02-seed-user.md** - Deterministic demo user lives in `apps/api/prisma/seed.ts` and upserts safely.
3. [x] **03-password-hashing.md** - Bcrypt-based helper wraps registration/login with configurable rounds.
4. [x] **04-jwt-auth-endpoints.md** - `/auth/register|login|logout|me` return JWT payloads and set `tf_session`.
5. [x] **05-jwt-protected-route-middleware.md** - Auth middleware verifies cookies/headers and populates `res.locals.user`.
6. [x] **06-auth-input-validation-zod.md** - Zod schemas guard auth payloads and emit structured errors.
7. [x] **07-auth-api-tests.md** - Jest/Supertest + `.http` suites cover happy + sad paths, running in CI.
8. [x] **08-auth-swagger-documentation.md** - OpenAPI document (`apps/api/src/openapi.ts`) lists auth routes + security schemes.
9. [x] **09-frontend-auth-setup.md** - NextAuth provider registered with session bridge helpers.
10. [x] **10-nextauth-prisma-adapter.md** - Prisma adapter persists OAuth + credential sessions.
11. [x] **11-oauth-api-session-bridge.md** - `/auth/session-bridge` exchanges NextAuth users for API JWT cookies.
12. [x] **12-connect-frontend-auth-forms.md** - Login/Register forms post to API credentials endpoints with inline validation.
13. [x] **13-auth-context-hooks.md** - `useAuth` context exposes derived status + refresh handling.
14. [x] **14-login-register-pages.md** - `/login` and `/register` pages host the validated forms + provider CTAs.
15. [x] **15-auth-loading-error-states.md** - Forms and header surface loading indicators, alerts, and aria-live copy.
16. [x] **16-auth-redirect-logic.md** - Protected layout enforces redirects + session bridge refresh.
17. [x] **17-protected-dashboard-page.md** - Dashboard fetches per-user tasks and renders authenticated hero state.
18. [x] **18-google-oauth-integration.md** - Google provider wired via Prisma adapter; remember to set up Google Cloud Console credentials before enabling it.
19. [x] **19-docker-auth-setup.md** - docker-compose + `make auth-smoke` validate auth flows inside containers.
20. [x] **20-readme-auth-docs.md** - README ships env vars, OAuth guidance, smoke tests, and cross-links.
21. [x] **21-update-auth-docs.md** - PRD + ADR 0001 reflect the delivered auth lifecycle + deviations.
22. [x] **22-ci-auth-tests.md** - GitHub Actions job provisions Postgres, runs migrations, and executes auth suites.
