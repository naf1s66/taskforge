# Task: Add security HTTP pack and smoke checks

## Summary
- Create repeatable checks for hardening behavior that reviewers can run locally or against a preview environment.
- Cover security-sensitive negative paths without relying on real production secrets.

**Status:** Completed - security HTTP examples and manual smoke guidance are in place with placeholder-only inputs.

## Acceptance Criteria
- [x] HTTP examples or documented curl commands cover unauthorized auth/task/tag/board/email/job requests.
- [x] Job endpoint examples prove missing and incorrect `DIGEST_JOB_SECRET` are rejected.
- [x] Cron proxy examples prove missing and incorrect `CRON_SECRET` are rejected where the web route can be exercised.
- [x] CORS and cookie checks are documented for browser/manual verification, since `.http` clients do not fully model browser preflight behavior.
- [x] Rate-limit smoke guidance is safe, bounded, and does not encourage hammering shared environments.
- [x] Examples use variables and placeholders only; no real secrets or production recipients are committed.

## Notes
- Prefer extending existing `.http` packs if the flow belongs with auth, tasks, Kanban, or email.
- Keep production-like real-send email examples disabled unless an operator intentionally opts in.
- Manual browser checks belong in `docs/testing/milestone6-manual-checklist.md`.

## Verification
- Run `pnpm -C apps/api run lint:http`.
- Exercise the HTTP examples against local Docker where applicable.

## Baseline Audit Follow-ups
- Add safe local examples for missing/incorrect API job secrets using both `Authorization: Bearer <wrong>` and `x-job-secret: <wrong>`.
- Add safe local examples for missing/incorrect web cron `CRON_SECRET`, with placeholders only and no real Vercel or production secret values.
- Include a browser/manual CORS preflight and credentialed-cookie checklist because `.http` clients cannot model browser CORS enforcement.
- Include a bounded rate-limit smoke that stops after the expected `429` and warns against running it against shared production environments.
- Include `/auth/session-bridge` checks for authenticated-user requirement, safe `from` redirect handling, API-cookie minting, and no-cache expectations if the local environment can run both apps.
- Include logout same-origin checks and cookie-expiry verification for the web route if the local environment can run both apps.

## Current Release-Candidate State
- `apps/api/tests/security.http` now covers unauthorized auth, task, board, tag, email snapshot, email preference update, digest preview, manual digest send, and protected digest job negative paths.
- Digest job examples include missing-secret checks plus incorrect `Authorization: Bearer <wrong>` and `x-job-secret: <wrong>` checks using placeholder variables only.
- Web cron examples cover missing and incorrect `CRON_SECRET` bearer values against the web proxy route with placeholder variables only.
- `docs/testing/milestone6-manual-checklist.md` now includes browser/manual CORS preflight, credentialed-cookie, unlisted-origin, session-bridge, logout, job/cron secret, and bounded rate-limit smoke guidance.
- Rate-limit smoke guidance is sequential, bounded to ten attempts, stops after the first expected `429`, and warns against use on shared production environments.
- Branch verification passed with `pnpm -C apps/api run lint:http`, focused API route tests for email preference/abuse controls, focused API job/email/auth route tests, focused web session-bridge/cron route tests, and `git diff --check`. Full local Docker/browser execution remains part of the Milestone 6 manual checklist for the target environment under review.
