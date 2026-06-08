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

## Launch Order

1. Complete production launch preflight and provider/account manual steps.
2. Finish responsive audit/fixes for every shipped screen.
3. Finish API auth-barrier matrix and local negative smokes.
4. Provision web, API, and database.
5. Deploy the final branch SHA and run migrations.
6. Run deployed browser, device, CORS, cookie, and auth smokes.
7. Decide production email scheduled-send status.
8. Complete v1 sign-off and document accepted post-launch tasks.

## Required Non-Secret Facts To Record

- Final deployed web origin.
- Final deployed API origin.
- Production database provider/project name.
- Deployment provider project names.
- Branch and commit SHA deployed.
- Selected cookie topology and whether `COOKIE_DOMAIN` is unset or set to a shared parent domain.
- `TRUST_PROXY` setting rationale.
- OAuth providers enabled for v1.
- Scheduler path selected for digest jobs, or explicit scheduled-send deferral.
- Owner for first production email/digest monitoring window.

## Secret Handling Rules

- Do not commit secret values.
- Do not paste secret values into PR comments, screenshots, `.http` files, markdown docs, or terminal transcripts.
- Record only provider secret-manager locations and non-secret configuration choices.
- Rotate any value that is accidentally exposed during launch work.
