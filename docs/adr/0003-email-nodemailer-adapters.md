# ADR 0003 - Email (Nodemailer adapters)

**Status:** Accepted, implementation deferred

## Context
We need basic emails (welcome, daily digest) on free setup for dev/prod. The adapter is planned future scope; it has not shipped in milestones 1-4.

## Decision
Use **Nodemailer** when email work starts. Dev uses **MailHog** (docker). Production defaults to **Resend SMTP** for milestone 5, with credentials supplied via env.

Expected production SMTP shape:

- `SMTP_HOST=smtp.resend.com`
- `SMTP_PORT=587`
- `SMTP_USER=resend`
- `SMTP_PASS=<RESEND_API_KEY>`
- `EMAIL_FROM=<verified sender on a Resend-verified domain>`

The email adapter remains provider-neutral so TaskForge can move to another SMTP provider if pricing, deliverability, or compliance needs change.

## Consequences
- Zero cost dev setup; easy local testing.
- Resend requires a verified sending domain before production sends; SPF and DKIM are mandatory, and DMARC should be configured before launch.
- Resend's free plan has a daily send limit, so digest delivery needs an explicit send-budget guard.
- SMTP provider variance remains; keep all provider details behind configuration and the adapter.
