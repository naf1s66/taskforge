# Task: Implement email adapter and SMTP config

## Summary
- Build a small Nodemailer-backed email adapter that supports local MailHog and Resend SMTP in production.
- Validate SMTP configuration at API startup without making local development brittle.

**Status:** Done.

## Acceptance Criteria
- [x] API exposes a reusable email adapter interface with `sendMail` and typed message inputs.
- [x] Nodemailer transport uses MailHog defaults in local Docker and env-based SMTP settings outside local dev.
- [x] Production docs and env examples use Resend SMTP defaults: `SMTP_HOST=smtp.resend.com`, `SMTP_PORT=587`, `SMTP_USER=resend`, `SMTP_PASS=<RESEND_API_KEY>`, and `EMAIL_FROM=<verified sender>`.
- [x] Missing production SMTP settings fail fast with actionable configuration errors.
- [x] Config validation requires a verified-domain sender address in production and refuses to start with placeholder Resend credentials.
- [x] Email templates render deterministic subject, plaintext, and HTML output.

## Manual Setup Required
Manual production setup is intentionally deferred to a future pre-launch issue. Keep the checklist below in the production runbook and complete it before enabling real outbound email.

- Create or choose the Resend account that will own TaskForge production email.
- Add a sending domain or subdomain in Resend, preferably a mail-specific subdomain such as `mail.taskforge.example`.
- Complete Resend DNS verification for SPF and DKIM, then add a DMARC record before enabling real production sends.
- Create a Resend API key for SMTP and store it as `SMTP_PASS`; do not commit the key or paste it into task docs.
- Choose the production `EMAIL_FROM` value after the domain verifies, for example `TaskForge <noreply@mail.taskforge.example>`.

## Notes
- Resend is the milestone 5 production default because it supports SMTP relay and a free daily sending limit suitable for early TaskForge usage.
- Do not couple business logic directly to Nodemailer or Resend; keep provider replacement possible.
- Avoid sending real email from tests unless explicitly configured for an integration smoke.
- Resend SMTP reference: https://resend.com/docs/send-with-smtp
- Resend domain verification reference: https://resend.com/docs/dashboard/domains/introduction

## Completion Notes
- Implementation and deterministic tests landed with the milestone 5 email adapter branch.
- Pre-launch manual setup is documented in `docs/prod/resend-email-setup.md`.
