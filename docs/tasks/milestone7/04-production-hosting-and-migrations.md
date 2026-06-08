# Task: Production hosting, environment, and migrations

## Summary
- Provision the v1 production stack on the selected free-tier providers.
- Deploy API, web, and database with real production environment facts and migration evidence.

**Status:** Planned.

## Acceptance Criteria
- [ ] Managed Postgres is provisioned and `DATABASE_URL` storage locations are recorded for API, web NextAuth, and migration execution, with pooled runtime and direct migration connection choices documented.
- [ ] API service is deployed with `NODE_ENV=production`, exact `CORS_ALLOWED_ORIGINS`, trusted proxy setting, body limit, JWT secrets, session bridge secret, digest job secret, dev bypass disabled, selected cookie domain, and email variables as appropriate.
- [ ] Web service is deployed with `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, API base URLs, database URL, session bridge secret, cron/digest secrets, dev bypass disabled, selected cookie domain, and enabled OAuth provider credentials.
- [ ] API startup email configuration is deployment-ready: Resend SMTP uses `SMTP_PORT=2587` on Render free, or a documented no-cost fallback is selected before the API is treated as launchable.
- [ ] SMTP egress from the deployed API host is proved with a dry-run or controlled provider connectivity check before any real production send is enabled.
- [ ] Prisma migrations are applied exactly once against the production database before smoke.
- [ ] Production seed policy is explicit: no development seed data unless an approved demo account/data set is intentionally created.
- [ ] Deployment URLs, provider projects, env storage locations, migration command, and deployment commit SHA are recorded in production docs without secrets.

## Manual Step Timing
| Step | Timing | Owner | Notes |
| --- | --- | --- | --- |
| Create provider projects | Before agent deploys | Human | Requires account access and provider choices. |
| Add secrets to provider env managers | Before deployment | Human | Agent can list required keys but must not receive raw secrets in committed files. |
| Configure custom domains | Before final browser-auth smoke | Human | Needed for same-site cookie topology. |
| Verify API SMTP egress | During API provisioning | Agent or human | Render free blocks common SMTP ports `25`, `465`, and `587`; selected free path is Resend STARTTLS on `2587`. |
| Run migrations | During deployment | Agent or human | Must use production database URL from secret manager or approved local environment. |
| Record deployment facts | After deployment | Agent | Record locations, URLs, SHA, and non-secret settings only. |

## Verification
- Run provider build logs and confirm API/web deploys use this branch SHA.
- Run `prisma migrate deploy` against production once and capture non-secret output.
- Record whether API/web runtime use Neon pooled URLs and whether migrations use a direct Neon URL. Do not reuse a pooled URL for migrations unless Prisma/Neon compatibility has been explicitly verified in the deployment evidence.
- Confirm API startup succeeds with `SMTP_HOST=smtp.resend.com`, `SMTP_PORT=2587`, `SMTP_USER=resend`, real `SMTP_PASS`, and verified-domain `EMAIL_FROM`, or record a selected no-cost fallback before deployment smoke.
- Hit API health over HTTPS.
- Confirm web root/login loads over HTTPS.
- Confirm no development bypass env is enabled in production.
- Confirm Docker/CI release gates are still green before final deployment.
