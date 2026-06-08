# Milestone 7 Automated Checks

Use these checks after responsive fixes, auth-barrier updates, deployment-doc changes, or final v1 release updates. CI evidence can satisfy the same commands when it runs against the final branch SHA.

## Required Local Commands

```bash
pnpm -C apps/api lint
pnpm -C apps/api run lint:http
pnpm -C apps/api typecheck
pnpm -C apps/api test
pnpm -C apps/api gen:openapi
git diff --exit-code -- docs/openapi.json
pnpm -C apps/web lint
pnpm -C apps/web typecheck
pnpm -C apps/web test
pnpm -C apps/api build
pnpm -C apps/web build
docker compose -f infra/docker-compose.yml config --quiet
docker build -f apps/api/Dockerfile -t taskforge-api:local .
docker build -f apps/web/Dockerfile -t taskforge-web:local .
git diff --check
```

## Focused Commands

```bash
pnpm -C apps/api exec jest --runInBand --runTestsByPath tests/app.test.ts tests/auth.e2e.test.ts tests/jobs-route.test.ts tests/email-digest-route.test.ts
pnpm -C apps/web test -- app/auth/session-bridge/route.test.ts app/api/cron/digest/route.test.ts app/api/auth/me/route.test.ts lib/auth-return-path.test.ts lib/cookie-domain.test.ts
pnpm -C apps/api run lint:http
```

## Optional Browser Automation

If a browser runner is added in Milestone 7, include mobile and desktop coverage for:

- `/login`
- `/register`
- `/dashboard`
- task create/edit dialogs
- tag selector and due-date picker
- email settings and digest preview
- protected route redirect/session bridge behavior

Record screenshots or traces as artifacts only when they do not contain real secrets, real customer data, production tokens, or private provider account details.
