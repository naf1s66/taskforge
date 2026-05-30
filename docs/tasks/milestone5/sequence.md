# Milestone 5 Task Sequence (Email Notifications)

Scope note: search, due-range filters, and priority filtering were delivered before this milestone: list filtering shipped in Milestone 3, and board filtering/search shipped in Milestone 4. Milestone 5 is intentionally scoped to email notification capability.

1. **01-email-preferences-schema.md** - Add user-scoped email preferences and notification audit tables.
2. **02-email-adapter-and-config.md** - Implement the Nodemailer adapter, MailHog dev defaults, Resend SMTP production defaults, and SMTP config validation.
3. **03-welcome-email-flow.md** - Send a welcome email after first successful registration or OAuth account creation.
4. **04-digest-query-service.md** - Build the daily digest read model for overdue, due-soon, and recently moved tasks.
5. **05-digest-scheduler.md** - Completed: deterministic digest runner behind a protected job endpoint, Vercel Cron proxy, local script, and CI smoke path while respecting Resend free-tier send limits.
6. **06-digest-preview-and-send-api.md** - Expose protected preview/send endpoints for manual QA and future admin tooling.
7. **07-email-settings-ui.md** - Let users opt in/out of digest emails and choose digest timing from the web app.
8. **08-digest-preview-ui.md** - Add a dashboard preview surface so users can inspect the digest before enabling it.
9. **09-email-observability-and-safety.md** - Add structured logging, idempotency, rate limits, and failure handling.
10. **10-email-http-pack.md** - Completed: HTTP collections now cover seeded email auth, preference reads/updates, digest preview, safe dry-run, and guarded MailHog manual-send verification.
11. **11-email-docs.md** - Completed: README, PRD, ADR notes, env docs, testing docs, Resend setup, production rollout, and runbook notes now reflect shipped email behavior.
12. **12-email-tests.md** - Completed: automated API, adapter/template, config, scheduler, frontend digest UI, and email preference hook coverage now runs through mocked/fake email paths.
