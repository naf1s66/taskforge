# Task: Scaffold Express API app

## Summary
- Bootstrap the TypeScript Express API with a health endpoint, server entrypoint, and build tooling.
- Establish the route/middleware layout used by later auth, task, board, and tag work.

**Status:** Completed.

## Acceptance Criteria
- [x] `apps/api` has TypeScript, ESLint, build, dev, start, test, and typecheck scripts.
- [x] Express app and server entrypoints are separated for testability.
- [x] Health/docs routing can be mounted under the `/api/taskforge` API namespace.
- [x] API app is compatible with the root workspace commands and Docker build path.

## Notes
- Keep `src/app.ts` side-effect-light so tests can instantiate the app without binding a port.
- Keep runtime configuration environment-driven.

## Implementation Notes
- API entrypoints live in `apps/api/src/app.ts` and `apps/api/src/server.ts`.
- Later milestones layered auth, tasks, tags, OpenAPI, and middleware into this scaffold.
