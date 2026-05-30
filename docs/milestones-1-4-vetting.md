# Milestones 1-4 Vetting Report

Date: 2026-05-18

## Scope
- Reviewed task docs for milestones 1-4 against the current repo structure, API/web implementation, OpenAPI export, HTTP packs, testing docs, Docker setup, and CI workflow.
- Confirmed milestone task acceptance criteria are complete: milestone 1 has 10 completed task docs, milestone 2 has 22, milestone 3 has 14, and milestone 4 has 11. No unchecked acceptance criteria remain in `docs/tasks/milestone1` through `docs/tasks/milestone4`.
- Treated manual checklist boxes in `docs/testing/*-manual-checklist.md` as runnable QA checklists, not incomplete task acceptance criteria.

## Issues Fixed During Vetting
- Docker auth smoke drift: `make up` now rebuilds app images before starting containers, matching the README and preventing stale images from hiding Dockerfile changes.
- Web Docker Prisma readiness: the web image now installs Prisma engine dependencies, includes the API Prisma schema/package metadata, and generates Prisma Client during image build.
- Web package tooling: `@taskforge/web` now declares the `prisma` CLI dev dependency required by its own `prisma:generate` script.
- Milestone 2 docs drift: auth automated docs now describe the Prisma/Testcontainers-backed suite instead of the old in-memory test harness.
- Milestone 2 manual checklist text: replaced malformed navigation separators and smart punctuation with stable ASCII wording.

## Verification Commands
- `make lint`
- `make typecheck`
- `pnpm -C apps/web test`
- `pnpm -C apps/api test`
- `make build`
- `pnpm -C apps/api gen:openapi`
- `docker compose -f infra/docker-compose.yml config --quiet`
- `make up`
- `make auth-smoke`
- `Invoke-WebRequest http://localhost:3000/api/auth/me`
- `make down`
- `git diff --check`

## Results
- API tests passed: 56 tests across auth, tasks, tags, and dev-bypass coverage.
- Web tests passed: 57 tests across auth UI, task client/hooks, tag normalization, tag selector, board ordering, and dashboard drag behavior.
- Lint, typecheck, production builds, OpenAPI export, HTTP linting, Docker compose config, Docker auth smoke, and web `/api/auth/me` smoke all passed.

## Residual Scope Notes
- Approved screenshots/GIFs are still intentionally documented as not committed; PR attachments remain the review path until assets are approved.
- UI pagination controls and dedicated tag administration remain explicitly documented limitations, not missing milestone 1-4 requirements.
- Historical note: at the time of this 2026-05-18 vetting, email delivery remained deferred and was planned in `docs/tasks/milestone5`. Milestone 5 later completed the email delivery infrastructure.
- Live third-party OAuth provider login still depends on real Google/GitHub credentials and should be exercised manually in environments where those credentials are configured.
