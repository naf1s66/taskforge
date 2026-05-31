# Task: Add security HTTP pack and smoke checks

## Summary
- Create repeatable checks for hardening behavior that reviewers can run locally or against a preview environment.
- Cover security-sensitive negative paths without relying on real production secrets.

**Status:** Planned.

## Acceptance Criteria
- [ ] HTTP examples or documented curl commands cover unauthorized auth/task/tag/board/email/job requests.
- [ ] Job endpoint examples prove missing and incorrect `DIGEST_JOB_SECRET` are rejected.
- [ ] Cron proxy examples prove missing and incorrect `CRON_SECRET` are rejected where the web route can be exercised.
- [ ] CORS and cookie checks are documented for browser/manual verification, since `.http` clients do not fully model browser preflight behavior.
- [ ] Rate-limit smoke guidance is safe, bounded, and does not encourage hammering shared environments.
- [ ] Examples use variables and placeholders only; no real secrets or production recipients are committed.

## Notes
- Prefer extending existing `.http` packs if the flow belongs with auth, tasks, Kanban, or email.
- Keep production-like real-send email examples disabled unless an operator intentionally opts in.
- Manual browser checks belong in `docs/testing/milestone6-manual-checklist.md`.

## Verification
- Run `pnpm -C apps/api run lint:http`.
- Exercise the HTTP examples against local Docker where applicable.
