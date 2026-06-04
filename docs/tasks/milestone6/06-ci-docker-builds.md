# Task: Add CI Docker build coverage

## Summary
- Ensure CI can build the API and web Docker images before deployment work begins.
- Validate compose configuration without requiring real production secrets.

**Status:** Pending release gate.

## Acceptance Criteria
- [ ] CI builds the API Docker image from the repo root or documented build context.
- [ ] CI builds the web Docker image from the repo root or documented build context.
- [ ] Docker build steps use safe placeholder environment values and never require Resend, OAuth, or production secrets.
- [ ] `docker compose -f infra/docker-compose.yml config --quiet` runs in CI or an equivalent validation step exists.
- [x] Build cache strategy is documented or intentionally left simple.
- [x] README documents the local equivalent commands for debugging Docker build failures.

## Notes
- Keep Docker build validation separate from deploy credentials.
- If full image builds are too slow for every PR, document the chosen trigger and why it is acceptable.
- CI should keep running lint, typecheck, tests, OpenAPI generation checks, and HTTP lint alongside Docker validation.

## Verification
- Run local Docker builds when Docker is available.
- Confirm GitHub Actions fails if either Dockerfile becomes invalid.


## Current Release-Candidate State
- CI currently runs dependency install, Prisma generation/migrations, lint, typecheck, API tests, frontend tests, and package builds.
- CI Docker image-build validation is not yet proven in `.github/workflows/ci.yml`; do not mark this task complete until the workflow builds both images or the release log records equivalent local builds.
- Build cache is intentionally simple for v1: rely on Docker layer caching from manifest-first Dockerfile copies and revisit registry/BuildKit cache only if build time becomes a release blocker.
- Local debug commands are documented in README: `docker compose -f infra/docker-compose.yml config --quiet`, `docker build -f apps/api/Dockerfile -t taskforge-api:local .`, and `docker build -f apps/web/Dockerfile -t taskforge-web:local .`.
- Current Alpine Docker builds can emit non-fatal optional native binding failures from transitive packages such as `cpu-features` or `ssh2` when Python/compiler tooling is absent. The release gate is the final build exit code plus successful image export; revisit the Dockerfiles only if those optional failures become fatal or CI log clarity becomes a blocker.
