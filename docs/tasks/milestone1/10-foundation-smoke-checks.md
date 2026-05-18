# Task: Verify foundation smoke checks

## Summary
- Confirm the newly scaffolded workspace can install, build, lint, and run basic app checks.
- Leave repeatable commands for future milestone regressions.

**Status:** Completed.

## Acceptance Criteria
- [x] Root install and workspace scripts complete on a clean checkout.
- [x] API build/typecheck path works against the TypeScript and Prisma scaffold.
- [x] Web build/typecheck path works against the Next.js and Tailwind scaffold.
- [x] Docker compose can start the local development dependencies required by later milestones.

## Notes
- Later milestones added deeper API/frontend automated coverage; this task only certifies the foundation.
- Any new required environment variable should be reflected in the relevant `infra/env/*.example` file.

## Implementation Notes
- Current verification commands are documented in `README.md`.
- CI now carries most repeatable smoke coverage for PRs.
