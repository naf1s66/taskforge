# Task: Production launch preflight and fact register

## Summary
- Convert Day 7 deployment notes into an explicit v1 launch plan.
- Decide the production browser-auth topology, provider accounts, secret locations, and sequencing before deployment work begins.

**Status:** Completed.

## Acceptance Criteria
- [x] `docs/prod/README.md`, `docs/prod/browser-auth-deployment.md`, `docs/prod/email-production-rollout.md`, and env examples are reviewed for every required production value.
- [x] Production topology is selected: same-site custom subdomains with an intentional `COOKIE_DOMAIN`.
- [x] Raw unrelated Vercel/Render/Railway default-domain browser auth is rejected before v1 launch.
- [x] Secret storage locations are recorded for API, web, database, OAuth, session bridge, digest job, cron, and Resend values without committing real secrets.
- [x] Manual provider/account steps are split into before-agent, after-agent, and human-only blocks.
- [x] v1 scope freeze is recorded: no major product features land in Milestone 7 unless they are release blockers.

## Implementation Notes

- Added `docs/prod/v1-production-fact-register.md` as the Milestone 7 source of truth for selected provider shape, same-site custom-subdomain topology, non-secret launch facts, secret storage locations, manual step timing, and v1 scope freeze.
- Selected the v1 browser-auth topology as owned same-site custom subdomains, for example `app.example.com` and `api.example.com`, with a deliberate shared `COOKIE_DOMAIN` such as `.example.com`.
- Rejected raw unrelated default-domain browser auth for v1. Vercel default web origins calling Render/Railway default API origins remain invalid for production auth.
- Recorded secret storage locations without secret values: Render API env for API/JWT/session/digest/Resend values, Vercel web env for NextAuth/session/digest/cron/OAuth values, Neon as database source, and OAuth provider dashboards as provider sources.
- Split launch work into before-agent, agent-after-facts, and human-only blocks in the fact register and linked checklist.
- Recorded the v1 scope freeze in production docs: release blockers, production configuration, verification, docs, and responsive fixes only.

## Current Audit Inputs
- PRD Day 7 scope is production provisioning, real env facts, smoke testing, and v1 release.
- Milestone 6 verification left preview/deployed-browser smoke as a Day 7 gate.
- Production email scheduled sends remain gated on Resend verification, production fact-register completion, and observability checks.
- v1 rate limits use in-process state; production must run one API instance or add a shared store before horizontal scaling.

## Manual Step Timing
Task 01 does not execute production provisioning, DNS changes, secret generation, OAuth app creation, deployed smoke, or real email enablement. It only records the launch decisions, capability checks, owner sequencing, and secret storage locations needed before those later tasks begin.

| Step | Timing | Owner | Notes |
| --- | --- | --- | --- |
| Approve v1 scope freeze | Task 01 | Human | Completed. Prevents Milestone 7 from becoming feature expansion. |
| Select provider shape and v1 OAuth intent | Task 01 | Human/agent | Completed. Vercel, Render, Neon, Resend, Vercel Cron, GitHub OAuth, and Google OAuth are selected with no-paid-requirement guardrails. |
| Confirm provider capabilities/access path | Task 01 | Human/agent | Completed. Capability checks are recorded in `docs/prod/v1-production-fact-register.md`; service-specific env/domain checks move to provisioning. |
| Choose exact production domains/subdomains | Task 04 | Human | Needed during hosting/domain setup before final CORS, cookie-domain, and OAuth callback values can be filled. |
| Create production projects and database | Task 04 | Human/agent | Deferred to production hosting and migrations. |
| Generate production secrets | Task 04 or Task 06 | Human | Deferred. Store in provider secret managers only; do not paste into docs or commits. |
| Create OAuth apps and callbacks | Task 04 or Task 05 | Human | Deferred until final `NEXTAUTH_URL` exists. Callback URLs must match the deployed web origin. |
| Verify Resend domain and enable real sends | Task 06 | Human | Deferred until email enablement gates and observability checks. |

## Verification
- Run `rg -n "<TBD before enablement>|<TBD before deployment>|<TBD after deployment>|<APP_DOMAIN>|<API_DOMAIN>|<MANAGED_POSTGRES_URL>|<ROTATED_|<RANDOM_" docs/prod infra/env README.md docs/PRD.md`.
- Confirm remaining placeholders are intentional pre-deployment inputs, not missing code changes.
- Confirm no real secret value appears in git diff, docs, PR comments, screenshots, or HTTP files.

Current verification:
- Runtime/env audit checked API CORS/trust-proxy parsing, web API base-url resolution, cookie-domain helper, OAuth provider enablement, cron proxy secrets, production env examples, and linked production docs.
- Remaining placeholders are intentional account/domain/secret inputs for deployment or email enablement.
- Real secret values were not added.
