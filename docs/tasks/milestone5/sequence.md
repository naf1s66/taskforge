# Milestone 5 Task Sequence (Email Notifications)

1. **01-email-preferences-schema.md** - Add user-scoped email preferences and notification audit tables.
2. **02-email-adapter-and-config.md** - Implement the Nodemailer adapter, MailHog dev defaults, Resend SMTP production defaults, and SMTP config validation.
3. **03-welcome-email-flow.md** - Send a welcome email after first successful registration or OAuth account creation.
4. **04-digest-query-service.md** - Build the daily digest read model for overdue, due-soon, and recently moved tasks.
5. **05-digest-scheduler.md** - Add a deterministic digest runner behind a protected job endpoint, local script, and CI smoke while respecting Resend free-tier send limits.
6. **06-digest-preview-and-send-api.md** - Expose protected preview/send endpoints for manual QA and future admin tooling.
7. **07-email-settings-ui.md** - Let users opt in/out of digest emails and choose digest timing from the web app.
8. **08-digest-preview-ui.md** - Add a dashboard preview surface so users can inspect the digest before enabling it.
9. **09-email-observability-and-safety.md** - Add structured logging, idempotency, rate limits, and failure handling.
10. **10-email-http-pack.md** - Extend HTTP collections with email preference, preview, and send flows.
11. **11-email-docs.md** - Update PRD, README, ADR notes, env docs, testing docs, and Resend setup/runbook notes for email behavior.
12. **12-email-tests.md** - Cover adapter, scheduler, API, and frontend email flows in automated tests and CI.
