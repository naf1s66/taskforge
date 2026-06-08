# Task: Production launch preflight and fact register

## Summary
- Convert Day 7 deployment notes into an explicit v1 launch plan.
- Decide the production browser-auth topology, provider accounts, secret locations, and sequencing before deployment work begins.

**Status:** Planned.

## Acceptance Criteria
- [ ] `docs/prod/README.md`, `docs/prod/browser-auth-deployment.md`, `docs/prod/email-production-rollout.md`, and env examples are reviewed for every required production value.
- [ ] Production topology is selected: same host/API behind web origin, or same-site custom subdomains with an intentional `COOKIE_DOMAIN`.
- [ ] Raw unrelated Vercel/Render/Railway default-domain browser auth is rejected or explicitly replaced before v1 launch.
- [ ] Secret storage locations are recorded for API, web, database, OAuth, session bridge, digest job, cron, and Resend values without committing real secrets.
- [ ] Manual provider/account steps are split into before-agent, after-agent, and human-only blocks.
- [ ] v1 scope freeze is recorded: no major product features land in Milestone 7 unless they are release blockers.

## Current Audit Inputs
- PRD Day 7 scope is production provisioning, real env facts, smoke testing, and v1 release.
- Milestone 6 verification left preview/deployed-browser smoke as a Day 7 gate.
- Production email scheduled sends remain gated on Resend verification, production fact-register completion, and observability checks.
- v1 rate limits use in-process state; production must run one API instance or add a shared store before horizontal scaling.

## Manual Step Timing
| Step | Timing | Owner | Notes |
| --- | --- | --- | --- |
| Select deployment accounts/projects | Before agent | Human | Vercel/Render/Railway/Neon/Supabase account access cannot be invented in repo code. |
| Choose production domains/subdomains | Before agent | Human | Required before final CORS, cookie-domain, OAuth callback, and browser-auth decisions. |
| Generate production secrets | Before agent or during deployment | Human | Store in provider secret managers only; do not paste into docs or commits. |
| Create OAuth apps and callbacks | Before deployed smoke | Human | Callback URLs must match `NEXTAUTH_URL`. |
| Fill non-secret fact register values | Agent after human provides facts | Agent | Domain names, selected topology, and storage locations can be documented without secret values. |
| Approve v1 scope freeze | Before implementation changes | Human | Prevents Milestone 7 from becoming feature expansion. |

## Verification
- Run `rg -n "<TBD before enablement>|<APP_DOMAIN>|<API_DOMAIN>|<MANAGED_POSTGRES_URL>|<ROTATED_|<RANDOM_" docs/prod infra/env README.md docs/PRD.md`.
- Confirm remaining placeholders are intentional pre-deployment inputs, not missing code changes.
- Confirm no real secret value appears in git diff, docs, PR comments, screenshots, or HTTP files.
