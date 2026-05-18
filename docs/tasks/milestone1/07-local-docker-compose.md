# Task: Add local Docker setup

## Summary
- Provide containerized local services for the API, web app, database, and development dependencies.
- Document environment defaults without committing secrets.

**Status:** Completed.

## Acceptance Criteria
- [x] API and web Dockerfiles exist and can build their respective apps.
- [x] `infra/docker-compose.yml` defines local services needed for development.
- [x] Example env files exist for API and web configuration.
- [x] Local Docker setup supports Postgres and future MailHog email testing.

## Notes
- Keep checked-in env files as examples only; real secrets stay in local `.env` files or host settings.
- Compose should prioritize fast onboarding over production parity.

## Implementation Notes
- Dockerfiles live at `apps/api/Dockerfile` and `apps/web/Dockerfile`.
- Compose and env examples live under `infra`.
