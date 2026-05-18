# Production Email Setup (Resend SMTP)

TaskForge uses Resend SMTP as the default production mail relay.

## Required environment variables

- `SMTP_HOST=smtp.resend.com`
- `SMTP_PORT=587`
- `SMTP_USER=resend`
- `SMTP_PASS=<RESEND_API_KEY>`
- `EMAIL_FROM=<verified sender>`

## Pre-launch manual checklist

1. Create/select the Resend account for TaskForge production email ownership.
2. Add a sending domain/subdomain (recommended: `mail.<your-domain>`).
3. Complete SPF + DKIM verification in Resend.
4. Add DMARC before enabling production sends.
5. Create a Resend SMTP API key and set it as `SMTP_PASS`.
6. Choose `EMAIL_FROM` using the verified domain (example: `TaskForge <noreply@mail.taskforge.example>`).

> Do not commit SMTP secrets to the repository.
