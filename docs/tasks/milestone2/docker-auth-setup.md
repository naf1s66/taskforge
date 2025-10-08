# Task: Ensure Docker setup supports auth flow

## Summary
- Update Dockerfiles and docker-compose configuration so the full auth stack (API, web, database) runs with the new requirements.
- Verify containers exchange secrets/env vars necessary for JWT and OAuth functionality.

## Acceptance Criteria
- [ ] Dockerized API includes dependencies for hashing/auth and serves the new auth endpoints.
- [ ] Web container can perform auth requests against the API using configured environment variables.
- [ ] Documented startup instructions confirm auth flows work inside Docker (e.g., via smoke test).

## Notes
- Coordinate with environment template updates to keep secrets synchronized.
- Consider adding Makefile targets or scripts to streamline auth-specific bootstrapping.
