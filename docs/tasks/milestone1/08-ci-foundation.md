# Task: Add CI foundation

## Summary
- Add GitHub Actions coverage for the workspace's core verification commands.
- Give later milestone branches a consistent merge gate.

**Status:** Completed.

## Acceptance Criteria
- [x] `.github/workflows/ci.yml` installs dependencies and runs project checks.
- [x] CI covers linting, typechecking, API tests, web tests, and app builds where configured.
- [x] Workflow uses deterministic package-manager setup for pnpm.
- [x] CI remains extensible for milestone-specific checks such as HTTP linting and Docker smoke tests.

## Notes
- Keep CI under the project time budget; expensive end-to-end checks should be explicit.
- Prefer adding targeted test jobs as new milestone surfaces ship.

## Implementation Notes
- Main CI workflow lives in `.github/workflows/ci.yml`.
- Additional Claude review workflows are present but are not the merge gate for product verification.
