# Production Docs

Production and pre-launch operations docs live here. Milestone/task planning files stay under `docs/tasks`.

- `resend-email-setup.md` - Resend SMTP account, DNS, sender, and smoke-test checklist for pre-launch email enablement.
- `email-production-rollout.md` - production email fact register, enablement gates, manual production smoke, and post-production TODOs.
- `digest-scheduler.md` - protected digest job endpoint, Vercel Cron proxy, dry-run, and rollout checklist.
- `email-observability-runbook.md` - first-rollout review procedure, failure codes, delivery statuses, and post-production follow-up items.
- `database-migration-squash.md` - rules for squashing development Prisma migrations before the first production database exists.
- `dev-auth-bypass.md` - development bypass behavior and the production expectation that it stays disabled.
- `browser-auth-deployment.md` - deployed browser CORS, cookie-domain, session-bridge, and trusted-proxy runbook.
- `adr/0004-hosting-vercel-render-neon.md` - accepted hosting topology decision.
- `adr/0006-digest-scheduler-invocation.md` - accepted free-tier digest scheduler invocation decision.
- `adr/0007-email-observability-rollout-decisions.md` - accepted monitoring, budget exhaustion, and scheduled-send enablement decisions for production email rollout.
