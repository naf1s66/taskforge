# Task: Expand `.http` pack for board and tags

## Summary
- Extend the existing HTTP request collection with board fetch/move examples and tag CRUD scenarios for QA + demos.
- Include sample auth headers/cookies so the scripts can be replayed quickly against dev/staging.

**Status:** New.

## Acceptance Criteria
- [ ] New `.http` entries cover board fetch, board move, tag list, and tag create flows with inline docs.
- [ ] Requests reference environment variables (e.g., `@apiBaseUrl`) to avoid hard-coding hosts.
- [ ] CI or pre-commit automation validates the file (at least linting) to catch syntax mistakes.

## Notes
- Co-locate the pack with the existing `apps/api/tests/auth.http` file or start a new `kanban.http` file if separation improves clarity.
- Document how to import the pack into Bruno/Insomnia/Postman in README so contributors know it exists.
