# Task: Add secure password hashing

## Summary
- Introduce password hashing for credential-based users using bcrypt or argon2.
- Ensure hashes are applied during registration and verified during login.

**Status:** Completed (merged).

## Acceptance Criteria
- [x] Passwords are never stored in plaintext in the database.
- [x] Registration flow hashes incoming passwords before persistence.
- [x] Login flow verifies provided passwords against stored hashes.
- [x] Hashing cost parameters are configurable via environment variables when applicable.

## Notes
- Update shared DTOs/types if password fields need to be excluded from responses.
- Consider wrapping the hashing logic in a dedicated utility/service for easier testing.
