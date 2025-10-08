# Task: Add Zod validation for auth routes

## Summary
- Define Zod schemas for auth-related request payloads (register, login, logout, token refresh if applicable).
- Apply validation middleware to ensure invalid requests return descriptive 4xx responses.

## Acceptance Criteria
- [ ] Zod schemas live alongside existing validation utilities in `apps/api/src/schemas` (or a new auth directory).
- [ ] Register/login routes reject malformed payloads with actionable error messages.
- [ ] Validation errors are standardized via existing error-handling patterns.

## Notes
- Reuse shared DTOs/types from `packages/shared` when possible to keep client and server contracts aligned.
- Provide tests covering representative validation failure scenarios.
