# v1 Launch Checklist

This checklist coordinates Milestone 7 production launch work. It links the existing production runbooks into one sign-off path without storing real secrets.

## Source Documents

- `docs/tasks/milestone7/sequence.md`
- `docs/testing/milestone7-automated.md`
- `docs/testing/milestone7-manual-checklist.md`
- `docs/prod/README.md`
- `docs/prod/browser-auth-deployment.md`
- `docs/prod/email-production-rollout.md`
- `docs/prod/digest-scheduler.md`
- `docs/prod/email-observability-runbook.md`
- `docs/prod/ci-release-coverage.md`
- `docs/prod/v1-production-fact-register.md`

## Launch Order

1. Complete production launch preflight and record which provider/account manual steps are deferred.
2. Finish responsive audit/fixes for every shipped screen.
3. Finish API auth-barrier matrix and local negative smokes.
4. Provision web, API, and database.
5. Prove API SMTP egress, deploy the final branch SHA, and run migrations.
6. Run deployed browser, device, CORS, cookie, and auth smokes.
7. Decide production email scheduled-send status.
8. Complete v1 sign-off and document accepted post-launch tasks.

## Required Non-Secret Facts To Record

Record these in `docs/prod/v1-production-fact-register.md` unless a linked runbook names a narrower fact register.

- Final deployed web origin.
- Final deployed API origin.
- Production database provider/project name.
- Deployment provider project names.
- Branch and commit SHA deployed.
- Selected cookie topology and whether `COOKIE_DOMAIN` is unset or set to a shared parent domain.
- `TRUST_PROXY` setting rationale.
- Selected API SMTP path and deployed-host egress result.
- Runtime database connection choice and migration database connection choice.
- OAuth providers enabled for v1.
- Scheduler path selected for digest jobs, or explicit scheduled-send deferral.
- Owner for first production email/digest monitoring window.

## Manual Step Blocks

- Before agent: approve scope freeze and identify which account, project, domain, secret, OAuth, and Resend DNS steps are human-owned.
- Agent after human provides facts: update non-secret register values, deploy or document deploy evidence, run smoke checks, and record the deployed SHA.
- Human-only: account ownership, billing, DNS registrar changes, secret generation/rotation, OAuth provider dashboards, Resend API key creation, and final launch approval.

## Secret Handling Rules

- Do not commit secret values.
- Do not paste secret values into PR comments, screenshots, `.http` files, markdown docs, or terminal transcripts.
- Record only provider secret-manager locations and non-secret configuration choices.
- Rotate any value that is accidentally exposed during launch work.
