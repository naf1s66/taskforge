# Task: Add CI Docker build coverage

## Summary
- Ensure CI can build the API and web Docker images before deployment work begins.
- Validate compose configuration without requiring real production secrets.

**Status:** Planned.

## Acceptance Criteria
- [ ] CI builds the API Docker image from the repo root or documented build context.
- [ ] CI builds the web Docker image from the repo root or documented build context.
- [ ] Docker build steps use safe placeholder environment values and never require Resend, OAuth, or production secrets.
- [ ] `docker compose -f infra/docker-compose.yml config --quiet` runs in CI or an equivalent validation step exists.
- [ ] Build cache strategy is documented or intentionally left simple.
- [ ] README documents the local equivalent commands for debugging Docker build failures.

## Notes
- Keep Docker build validation separate from deploy credentials.
- If full image builds are too slow for every PR, document the chosen trigger and why it is acceptable.
- CI should keep running lint, typecheck, tests, OpenAPI generation checks, and HTTP lint alongside Docker validation.

## Verification
- Run local Docker builds when Docker is available.
- Confirm GitHub Actions fails if either Dockerfile becomes invalid.
