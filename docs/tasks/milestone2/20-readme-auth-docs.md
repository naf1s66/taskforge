# Task: Update README with auth guidance

## Summary
- Expand the project README to include setup and usage instructions for the new authentication system.
- Document environment variables, dev workflows, and testing steps related to auth.

**Status:** Completed — README now documents env vars, auth workflows, smoke tests, and OAuth setup.

## Acceptance Criteria
- [x] README outlines how to configure JWT secrets and OAuth credentials for local and production environments.
- [x] Instructions cover running migrations/seeds and performing basic auth smoke tests.
- [x] Screenshots or references to auth UI added if applicable.

## Notes
- Cross-link to PRD/ADR sections for deeper architectural context.
- Ensure docs stay in sync with `.env.example` defaults and Docker instructions.
- `README.md` now includes the dedicated "Authentication Reference" section with env var tables, OAuth provider notes (including Google console steps), migration/seed commands, and smoke test instructions for API, Docker, and NextAuth UI flows.
- Links to PRD + ADR 0001 plus script references (`make auth-smoke`, `.http` suites) keep the documentation aligned with the other source files.
