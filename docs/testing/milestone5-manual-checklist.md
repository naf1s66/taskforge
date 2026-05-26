# Milestone 5 Manual Checklist

Use this checklist before enabling real email sends in any shared environment.

- [ ] MailHog receives local welcome emails.
- [ ] `apps/api/tests/email.http` runs against the seeded `demo@taskforge.dev` user after `make up`, `docker compose -f infra/docker-compose.yml exec api pnpm prisma migrate deploy`, and `docker compose -f infra/docker-compose.yml exec api pnpm tsx prisma/seed.ts`.
- [ ] Digest dry run reports attempted, sent, skipped, failed, and skip reason counts.
- [ ] Digest dry run does not create `NotificationDelivery` or `NotificationDeliveryAttempt` records.
- [ ] Protected API job endpoint rejects missing or incorrect `DIGEST_JOB_SECRET`.
- [ ] Web cron proxy rejects missing or incorrect `CRON_SECRET`.
- [ ] Users with disabled digest preferences, unverified email, placeholder email domains, or off-hour preferences are skipped.
- [ ] Re-running the same digest date does not send duplicate emails to users with `SENT` or `PENDING` attempts.
- [ ] Budget exhaustion reports `budgetSkipped`, records `SKIPPED` attempts with `BUDGET_SKIPPED`, and does not exceed the configured send limit.
- [ ] Provider quota exhaustion stops same-run sends, reports `providerQuotaSkipped`, and records remaining eligible digests as `SKIPPED`.
- [ ] Delivery logs include notification type, user id, delivery status, provider, provider message id when available, and sanitized provider metadata without rendered email bodies.
- [ ] Manual digest sends return `x-taskforge-idempotency-key` and repeated sends for the same user/date do not send duplicate MailHog emails after `SENT` or `PENDING` attempts.
- [ ] Real Resend sends remain disabled/commented in HTTP packs unless the verified domain, production-like secrets, and recipient safety checks are explicitly confirmed.
- [ ] First production schedule is confirmed with a dry run before real sends are enabled.
