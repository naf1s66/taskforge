# Milestone 5 Automated Checks

Use these checks while implementing email notification tasks.

## Commands

```bash
pnpm -C apps/api lint
pnpm -C apps/api run lint:http
pnpm -C apps/api typecheck
pnpm -C apps/api test
pnpm -C apps/web lint
pnpm -C apps/web typecheck
pnpm -C apps/web test
```

API tests use Testcontainers unless `DATABASE_URL` points at an existing test database. Start Docker before running the API Jest suite locally.

The default automated path uses fake SMTP transports or adapter mocks only. CI must not require a Resend account, Resend secrets, or any external email provider.

## Digest Scheduler Coverage

- `apps/api/tests/daily-digest-runner.test.ts` covers dry runs, idempotency, send-budget exhaustion, persisted `SKIPPED` records, provider quota halts, transient retries, failure classification, preference skips, no-content skips, and pending duplicate attempts.
- `apps/api/tests/email-digest-route.test.ts` covers digest preview/manual-send validation, stricter manual-send rate limits, and the returned logical idempotency key.
- `apps/api/tests/auth.e2e.test.ts` covers welcome-email delivery history and classified provider failures.
- `apps/api/tests/digest-config.test.ts` covers digest job budget parsing, production `DIGEST_JOB_SECRET` requirements, placeholder rejection, and local optional-secret behavior.
- `apps/api/tests/smtp-config.test.ts` covers local MailHog defaults, Resend production SMTP settings, missing SMTP configuration, placeholder credentials, and unsafe sender domains.
- `apps/api/tests/jobs-route.test.ts` covers protected job endpoint auth, GET/POST invocation, default budget passing, and invalid digest dates.
- `apps/api/tests/email-adapter.test.ts` covers Nodemailer transport construction, sanitized provider metadata, and deterministic welcome/digest template essentials.
- `apps/web/app/api/cron/digest/route.test.ts` covers the Vercel Cron proxy route and forwarding to the protected API endpoint.
- `apps/web/app/(protected)/dashboard/dashboard-content.test.tsx` covers digest preference toggles and digest preview enabled, disabled, loading, error, and empty states.
- `apps/web/lib/email-preferences-hooks.test.tsx` covers preference query loading plus optimistic update success and rollback behavior.

## Focused Checks

```bash
pnpm -C apps/api test -- daily-digest-runner.test.ts email-digest-route.test.ts auth.e2e.test.ts jobs-route.test.ts digest-config.test.ts smtp-config.test.ts email-adapter.test.ts
pnpm -C apps/web test -- app/api/cron/digest/route.test.ts 'app/(protected)/dashboard/dashboard-content.test.tsx' lib/email-preferences-hooks.test.tsx
```
