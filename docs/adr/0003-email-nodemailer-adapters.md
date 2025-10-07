# ADR 0003 — Email (Nodemailer adapters)

**Status:** Accepted

## Context
We need basic emails (welcome, daily digest) on free setup for dev/prod.

## Decision
Use **Nodemailer**. Dev uses **MailHog** (docker). Production uses any free SMTP provider; credentials via env.

## Consequences
- Zero cost dev setup; easy local testing.
- SMTP provider variance; abstract behind adapter if needed.
