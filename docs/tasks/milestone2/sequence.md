# Milestone 2 Task Sequence (Auth System)

1. **01-prisma-auth-models-and-migrations.md** – Extend Prisma schema + migrations for auth tables. ✅
2. **02-seed-user.md** – Ship deterministic demo user seeding for smoke tests. ✅
3. **03-password-hashing.md** – Add bcrypt hashing + verification throughout auth flows. ✅
4. 04-jwt-auth-endpoints.md – Build `/auth/register|login|logout|me` endpoints that return JWTs + user payloads.
5. **05-jwt-protected-route-middleware.md** – Enforce JWT verification on protected routes. ✅
6. **06-auth-input-validation-zod.md** – Harden auth payload validation with Zod + shared error envelopes. ✅
7. 07-auth-api-tests.md – Add Jest/Supertest + `.http` coverage for register/login/protected requests.
8. 08-auth-swagger-documentation.md – Document the auth endpoints + security schemes in OpenAPI/Swagger.
9. **09-frontend-auth-setup.md** – Configure NextAuth provider + session wiring in the Next.js app. ✅
10. 10-nextauth-prisma-adapter.md – Hook NextAuth into the Prisma adapter so OAuth + credentials share storage.
11. 11-oauth-api-session-bridge.md – Bridge NextAuth logins with API JWT cookies (`tf_session`) and shared sign-out.
12. 12-connect-frontend-auth-forms.md – Call the credential endpoints from forms and sync client auth state.
13. **13-auth-context-hooks.md** – Provide shared hooks/context for auth state + logout actions. ✅
14. 14-login-register-pages.md – Finish `/login` + `/register` layouts with validated forms and navigation.
15. 15-auth-loading-error-states.md – Surface loading indicators + inline error handling across auth flows.
16. **16-auth-redirect-logic.md** – Redirect based on auth state for protected vs. public routes. ✅
17. 17-protected-dashboard-page.md – Guard dashboard access and display the authenticated user context.
18. 18-google-oauth-integration.md – Complete Google OAuth linking + persistence in Prisma.
19. 19-docker-auth-setup.md – Validate Dockerized auth flows and document the workflow.
20. 20-readme-auth-docs.md – Update README with env vars, migrations/seeds, and auth smoke instructions.
21. 21-update-auth-docs.md – Refresh PRD/ADR content for the finalized auth experience.
22. 22-ci-auth-tests.md – Run auth tests/migrations inside GitHub Actions with proper secrets.
