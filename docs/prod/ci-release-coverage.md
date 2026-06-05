# CI Release Coverage

## Current release-candidate gate

Milestone 6 CI validates Docker as a release gate without deploy credentials:

- `docker compose -f infra/docker-compose.yml config --quiet`
- API image build from the repository root with `apps/api/Dockerfile`
- web image build from the repository root with `apps/web/Dockerfile`

These checks must continue to use safe placeholder values. They must not require Resend, OAuth, production database, scheduler, or deployment-provider secrets.

## v1 production trigger requirement

Before the production v1 release process starts, CI should target any and all pull requests, regardless of destination branch naming. Branch filters that only match `main`, `milestone*`, or another limited release-candidate pattern are acceptable only before that v1 release gate.

The v1-ready workflow should either remove the `pull_request.branches` filter entirely or use an explicitly reviewed pattern set that covers every supported release, hotfix, milestone, and production branch. This avoids losing required Docker, lint, typecheck, test, OpenAPI, and HTTP-pack coverage when production branches use slash-delimited names.
