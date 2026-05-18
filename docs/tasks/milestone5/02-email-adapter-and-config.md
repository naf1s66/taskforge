# Task: Implement email adapter and SMTP config

## Summary
- Build a small Nodemailer-backed email adapter that supports local MailHog and production SMTP providers.
- Validate SMTP configuration at API startup without making local development brittle.

**Status:** New.

## Acceptance Criteria
- [ ] API exposes a reusable email adapter interface with `sendMail` and typed message inputs.
- [ ] Nodemailer transport uses MailHog defaults in local Docker and env-based SMTP settings outside local dev.
- [ ] Missing production SMTP settings fail fast with actionable configuration errors.
- [ ] Email templates render deterministic subject, plaintext, and HTML output.

## Notes
- Do not couple business logic directly to Nodemailer; keep provider replacement possible.
- Avoid sending real email from tests unless explicitly configured for an integration smoke.
