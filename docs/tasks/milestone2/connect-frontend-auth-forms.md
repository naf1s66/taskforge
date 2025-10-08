# Task: Connect frontend auth forms to backend API

## Summary
- Wire login and registration forms to call the backend REST endpoints and handle responses.
- Persist returned tokens/session data using the chosen auth framework.

## Acceptance Criteria
- [ ] Form submissions trigger fetch/Axios calls to `/auth/register` and `/auth/login` endpoints.
- [ ] Successful responses update client auth state and navigate to the dashboard.
- [ ] Failed responses display validation or server errors without crashing the UI.

## Notes
- Coordinate with backend team on request/response payload contracts.
- Ensure CSRF/token storage strategy aligns with security best practices (httpOnly cookies or secure storage).
