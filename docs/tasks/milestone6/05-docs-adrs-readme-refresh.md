# Task: Refresh docs, ADRs, and README for release readiness

## Summary
- Bring project documentation into alignment with the release-candidate implementation.
- Make deployment, verification, and known gates clear enough for a reviewer to operate without private context.

**Status:** Planned.

## Acceptance Criteria
- [ ] README reflects the current setup, env vars, Docker workflow, test commands, HTTP packs, and production caveats.
- [ ] PRD milestone status matches shipped behavior through Milestone 6 and clearly separates pending Day 7 deployment work.
- [ ] ADRs capture any final security, deployment, CORS, trusted proxy, Docker build, or release-gate decisions.
- [ ] Production docs include exact placeholder locations for deployment facts without committing real secrets.
- [ ] Milestone task docs for Milestones 1-6 are internally consistent and do not advertise unshipped behavior as complete.
- [ ] Testing docs include Milestone 6 automated and manual verification steps.

## Notes
- Preserve the distinction between "implemented locally" and "enabled in production", especially for email scheduling.
- If docs disagree with code, fix the docs only when it is true drift; otherwise create or update task scope.
- Keep screenshots optional unless the release review explicitly needs them.

## Verification
- Review README, PRD, `docs/prod`, `docs/adr`, `docs/tasks`, and `docs/testing`.
- Run `rg` for stale terms after edits, especially hard-coded domains, obsolete endpoint examples, and old milestone status language.
