# Task: Ensure Docker setup supports auth flow

## Summary
- Update Dockerfiles and docker-compose configuration so the full auth stack (API, web, database) runs with the new requirements.
- Verify containers exchange secrets/env vars necessary for JWT and OAuth functionality.

**Status:** Completed — docker-compose boots db/api/web/mailhog with shared secrets, and the scripted auth smoke validates cross-container flows.

## Acceptance Criteria
- [x] Dockerized API includes dependencies for hashing/auth and serves the new auth endpoints.
- [x] Web container can perform auth requests against the API using configured environment variables.
- [x] Documented startup instructions confirm auth flows work inside Docker (e.g., via smoke test).

## Notes
- Coordinate with environment template updates to keep secrets synchronized.
- Consider adding Makefile targets or scripts to streamline auth-specific bootstrapping.
- `infra/docker-compose.yml` builds both apps, mounts env templates, wires `SESSION_BRIDGE_SECRET`, and health-checks Postgres before the API starts so auth endpoints are available immediately.
- `apps/web/scripts/docker-auth-smoke.mjs` plus `make auth-smoke` exercise register/login + `/session-bridge` from inside the web container, proving the API + session secret exchange works under Docker networking.
- README + `infra/env/*.env.example` now document the env vars that must stay in sync between containers.
