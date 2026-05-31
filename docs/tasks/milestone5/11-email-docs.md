# Task: Update email documentation

## Summary
- Update project docs so the email feature can be configured, tested, and reviewed consistently.
- Reconcile ADR 0003's deferred implementation note with the shipped milestone behavior.

**Status:** Completed.

## Acceptance Criteria
- [x] README documents MailHog, Resend SMTP production setup, SMTP env vars, digest behavior, and local verification steps.
- [x] PRD reflects the implemented email scope and any remaining limitations.
- [x] ADR 0003 is updated or superseded with Resend as the production default while preserving the provider-neutral adapter decision.
- [x] Manual and automated testing docs exist for Milestone 5.
- [x] Deployment docs include Resend DNS prerequisites, API key handling, `EMAIL_FROM`, and the free daily send budget.

## Manual Setup Required
- Document the exact production sending domain after it is selected and verified.
- Document where the Resend API key is stored for each deployment target, without exposing the secret value.
- Record the production digest schedule, send budget, and escalation path for delivery failures.
- Update docs again if the Resend account moves from the free plan to a paid plan.

## Notes
- Include free-tier deployment constraints and Resend-specific caveats.
- Keep screenshots optional until the settings and preview UI are stable.

## Completion Notes
- Updated the README with MailHog defaults, Resend SMTP production variables, digest behavior, Docker-safe local verification, the email HTTP pack, and a guarded MailHog real-send step.
- Updated the PRD data model/API sketch to include email preferences, notification delivery audit records, digest preview/manual-send routes, the protected digest job endpoint, and the web cron proxy.
- Kept ADR 0003 accepted while clarifying the shipped Resend SMTP default and preserving the provider-neutral Nodemailer adapter decision.
- Confirmed Milestone 5 manual and automated testing docs exist and updated the manual checklist to use Docker-safe migrate/seed commands.
- Added production rollout documentation in `docs/prod/email-production-rollout.md`, tightened Resend secret placement guidance, and added a web production env example that excludes SMTP credentials.
- Production-specific facts remain intentionally marked as `<TBD before enablement>` until the sending domain, secret manager locations, digest schedule, budget owner, and escalation path are selected.
