# ADR 0003 - Email (Nodemailer adapters)

**Status:** Accepted, implementation deferred

## Context
We need basic emails (welcome, daily digest) on free setup for dev/prod. The adapter is planned future scope; it has not shipped in milestones 1-4.

## Decision
Use **Nodemailer** when email work starts. Dev uses **MailHog** (docker). Production uses any free SMTP provider; credentials via env.

## Consequences
- Zero cost dev setup; easy local testing.
- SMTP provider variance; abstract behind adapter if needed.
