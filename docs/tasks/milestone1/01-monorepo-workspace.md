# Task: Set up monorepo workspace

## Summary
- Create the root workspace structure for web, API, shared packages, infrastructure, and docs.
- Standardize package management and top-level scripts so later milestones can build on one command surface.

**Status:** Completed.

## Acceptance Criteria
- [x] Root `package.json` defines the project metadata, Node engine, pnpm package manager, workspaces, and aggregate scripts.
- [x] `pnpm-workspace.yaml` includes `apps/*` and `packages/*`.
- [x] Repository layout includes `apps/web`, `apps/api`, `packages/shared`, `infra`, and `docs`.
- [x] Common commands exist for build, lint, typecheck, and development.

## Notes
- Keep workspace boundaries explicit: app-specific code stays under `apps/*`, reusable contracts stay under `packages/*`.
- Future milestones should prefer package scripts over ad hoc root commands.

## Implementation Notes
- Root scripts in `package.json` delegate to pnpm recursive commands.
- The workspace currently uses Node 20 and pnpm 8.15.4.
