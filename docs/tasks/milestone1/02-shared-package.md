# Task: Create shared TypeScript package

## Summary
- Add a shared package for DTOs, enums, auth constants, and cross-app helpers.
- Make the API and web app depend on the same contract surface instead of duplicating shapes.

**Status:** Completed.

## Acceptance Criteria
- [x] `packages/shared` has its own `package.json`, `tsconfig.json`, and source entrypoint.
- [x] Shared exports include task, board, tag, auth, and cookie contracts used by both apps.
- [x] Package compiles under the root build/typecheck workflow.
- [x] Apps import shared contracts through the workspace package boundary.

## Notes
- Keep runtime dependencies minimal so the package remains safe to use in both server and browser code.
- Prefer shared types for API payloads before introducing frontend-only copies.

## Implementation Notes
- Main exports live in `packages/shared/src/index.ts`.
- Auth cookie constants live in `packages/shared/src/auth/cookies.ts`.
