# Task: Add digest scheduler

## Summary
- Add a deterministic daily digest runner that can be called by a hosted scheduler, local script, or CI smoke.
- Ensure every eligible user is processed once per digest window.

**Status:** New.

## Acceptance Criteria
- [ ] A CLI/script or protected job endpoint can run digest delivery for a target date window.
- [ ] Runner respects user email preferences and skips users without a verified or deliverable email.
- [ ] Idempotency prevents duplicate sends for the same user and digest date.
- [ ] Job output reports attempted, sent, skipped, and failed counts.

## Notes
- Prefer an explicit invocation path over an always-running worker so free-tier hosting remains viable.
- Make scheduler behavior testable without waiting for wall-clock time.
