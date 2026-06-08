# Milestones 1-6 Vetting Report

Date: 2026-06-08

## Scope
- Reviewed Milestones 1-6 task docs against the PRD, README, ADRs, production docs, testing docs, HTTP packs, OpenAPI source/artifact, Docker/CI configuration, API implementation, web implementation, Prisma schema/migrations, and shared package contracts.
- Confirmed completed task-doc coverage through Milestone 6: Milestone 1 has 10 task docs, Milestone 2 has 22, Milestone 3 has 14, Milestone 4 has 11, Milestone 5 has 12, and Milestone 6 has 8. No unchecked acceptance criteria remain in `docs/tasks/milestone1` through `docs/tasks/milestone6`.
- Treated manual checklist boxes in `docs/testing/*-manual-checklist.md` as runnable QA checklists, not incomplete task acceptance criteria.
- Treated Milestone 7 files as planned production-launch scope, not as missing Milestone 1-6 work.

## Executive Result
- No missing Milestone 1-6 product, architecture, security, test, or release-readiness requirement was found in the actual system.
- Milestones 1-5 remain complete against the current PRD and shipped implementation.
- Milestone 6 is complete as a release-candidate hardening milestone: security baseline, CORS/cookies/proxy behavior, rate limits and abuse controls, OpenAPI finalization, docs/ADRs/readmes, CI Docker/OpenAPI gates, security HTTP smoke coverage, and final local verification are in place.
- Remaining work belongs to Milestone 7 production launch: provision real FE/BE/DB infrastructure, configure real production facts and secrets, repeat deployed browser/device smoke, and decide production email scheduled-send enablement.

## Audit Method
- Checked task-doc completion state and searched for unchecked acceptance criteria in `docs/tasks/milestone1` through `docs/tasks/milestone6`.
- Compared PRD milestone claims to runtime API routes, web route handlers/pages, Prisma models/migrations, env templates, OpenAPI source/artifact, CI workflow, Docker files, and testing docs.
- Reviewed user-data route protection and secret-protected scheduler surfaces against Milestone 6 security claims.
- Reviewed the latest automated verification evidence from Task 3 of this cleanup pass: API/web lint, typecheck, tests, builds, OpenAPI generation drift check, Docker compose config, API/web Docker image builds, and `git diff --check`.
- Checked that deferred production work is explicitly captured in production docs and Milestone 7 task docs rather than hidden in chat history.

## Evidence By Milestone

## Milestone 1 - Foundation
- The monorepo workspace, package manager metadata, root scripts, TypeScript setup, shared package, API app, web app, Docker Compose stack, Prisma baseline, CI workflow, and initial docs/ADRs are present.
- Local infrastructure includes PostgreSQL, API, web, and MailHog wiring with environment examples under `infra/env`.
- CI and local commands cover dependency install, Prisma generation, migrations, lint, typecheck, tests, production builds, Docker compose validation, image builds, and generated OpenAPI drift checks.
- No missing foundation scope was found.

## Milestone 2 - Authentication
- API auth covers registration, login, refresh, logout, session lookup, web session bridging, and welcome-email dispatch hooks for created accounts.
- Prisma auth models cover users, accounts, sessions, and verification tokens for credentials and OAuth-backed login.
- Web auth integrates NextAuth providers, the Prisma adapter, protected layouts, credential forms, bridged API sessions, logout coordination, and local dev bypass behavior.
- The dev bypass path is explicitly gated away from production and documented as disabled for production launch.
- Auth tests, route tests, HTTP packs, Docker auth smoke guidance, and production browser-auth docs cover credentials, cookies, bridged sessions, provider configuration, and deployed cookie/CORS topology.
- No missing auth scope was found. Live OAuth remains a production/manual provider setup gate, not a missing implementation item.

## Milestone 3 - Task Management
- Task persistence supports user-scoped title, description, status, priority, due date, board order, timestamps, and tags.
- API task routes cover list, create, read, update, delete, filters, search, pagination parameters, validation, and ownership scoping.
- Search/filter coverage includes status, priority, tag, text query, `dueFrom`, and `dueTo`.
- Dashboard and task hooks support task creation/editing, optional-field clearing, status/priority changes, due dates, tags, filters, search, and optimistic updates through typed web clients/hooks.
- OpenAPI docs, task HTTP packs, API e2e tests, and web tests exercise the shipped task workflows.
- No missing task-management scope was found. UI pagination controls remain a documented limitation, not a Milestone 3 acceptance gap.

## Milestone 4 - Kanban And Tags
- Board APIs provide grouped task reads and deterministic task movement with board ordering.
- Dashboard board UI uses drag and drop, visible columns, ordering utilities, sorted/manual modes, optimistic updates, and rollback behavior on failed moves.
- Tag APIs and shared tag validation normalize labels and keep tag data user-scoped.
- UI exposes tag assignment and board/list filters for text, due date, priority, status, and tag selection.
- Kanban/tag docs, HTTP packs, API tests, and web tests are present and aligned with implementation.
- No missing Kanban/tag scope was found. Dedicated tag administration remains outside the accepted scope.

## Milestone 5 - Email Notifications
- Data model additions include email preferences, notification deliveries, delivery attempts, delivery type, and delivery status.
- SMTP configuration supports MailHog local defaults, Resend production defaults, sender validation, and placeholder rejection.
- Welcome email dispatch is connected to credential registration and OAuth-created accounts through API/web bridge paths.
- Daily digest support includes preference storage, timezone-aware digest query grouping, preview API, guarded manual send API, protected job API, scheduler runner, idempotency keys, delivery attempts, provider metadata sanitization, failure classification, and send-budget controls.
- Web app includes email preference and digest preview clients/hooks plus dashboard opt-in/out and preview UI states.
- Vercel Cron proxy and API scheduler route derive each user's local digest date unless an explicit override is provided.
- Email docs cover local MailHog review, Resend setup, scheduler setup, observability, rollout gates, and production safety controls.
- Email HTTP packs, API tests, web tests, linting, typechecking, and build checks cover shipped behavior.
- No missing email scope was found. Real production sends remain intentionally gated by Resend DNS/domain verification, secret-manager setup, dry-run/manual-send validation, observability, and first-rollout review.

## Milestone 6 - Security Hardening And Release Readiness
- Security baseline audit is completed and follow-ups were either implemented or converted into explicit release/deployment gates.
- API hardening includes Helmet, configured CORS with production fail-closed behavior, JSON body limits, trusted-proxy parsing, cookie handling, structured JSON errors, 404 handling, and route-specific validation bounds.
- Auth/session hardening includes explicit cookie-domain behavior, same-site session bridge redirects, `no-store` session-bridge responses, unsafe return-path sanitization, same-origin logout protection, production-disabled dev bypass, and tests for hostile redirect inputs.
- Abuse controls include global limits, auth attempt limits, session-bridge limits, manual digest send limits, protected job rate limits, unauthorized job-secret throttling, and documented single-instance/shared-store production assumptions.
- API auth surfaces are behind the intended barriers: task/tag/me/email routes use shared auth middleware, digest jobs require `DIGEST_JOB_SECRET`, web cron requires `CRON_SECRET`, and public auth/docs/health routes are intentional.
- OpenAPI source and `docs/openapi.json` are aligned, include cookie/bearer auth where appropriate, document rate-limit responses, and are enforced by a CI drift check.
- CI now validates Docker compose config, API and web Docker image builds, lint/typecheck/tests/builds, HTTP pack linting, and generated OpenAPI artifact freshness.
- Security HTTP smoke coverage includes unauthorized auth/task/board/tag/email/job paths and placeholder-only inputs.
- Final local Milestone 6 verification and Task 3 cleanup checks passed, including full API and web automated suites, API/web production builds, Docker compose config, API/web Docker image builds, OpenAPI generation drift check, and `git diff --check`.
- No missing Milestone 6 hardening or release-candidate scope was found.

## Cross-Cutting Product And Architecture Checks
- API routes, OpenAPI docs, and PRD API list match the shipped v1 surface: health, auth, user account/preferences, tasks, board, tags, email digest preview/send, digest jobs, cron proxy, and docs.
- Web route surface is limited to public auth pages, protected dashboard/demo pages, NextAuth handlers, logout, auth session lookup, session bridge, and cron proxy. The web app does not grow general task/tag/board proxy routes; browser clients call the Express API directly.
- Prisma migrations cover auth models, board order, user-scoped tags, email preferences/delivery attempts, digest timezone, and skipped delivery status.
- Environment docs and templates cover local and production API/web inputs, including CORS, body limits, JWT/NextAuth/session bridge secrets, digest/cron secrets, trust proxy, cookie domain, dev bypass, OAuth, and SMTP/Resend values.
- Production docs preserve the local-implemented versus production-enabled distinction for OAuth, Resend, digest scheduling, cross-subdomain cookies, and real deployed browser behavior.

## Findings
- No release-blocking missing Milestone 1-6 scope remains from this audit.
- The old vetting range was stale after Milestone 6 completion; this report replaces `docs/milestones-1-5-vetting.md` with `docs/milestones-1-6-vetting.md`.
- Newly planned Milestone 7 tasks now cover the remaining production launch questions that are not Milestone 6 gaps:
  - all-screen responsiveness and real-device confidence;
  - endpoint-by-endpoint deployed auth-barrier negative smoke;
  - production hosting, real env facts, migrations, and deployed browser smoke;
  - v1 release sign-off and production email enablement decision.

## Carry-Forward Scope
- Milestone 7 must provision web/API/database, configure real production environment facts, run migrations, and record non-secret deployment evidence.
- Deployed browser smoke must be repeated for CORS, cookies, OAuth callbacks, session bridge, protected API calls, Swagger, cron/job paths, and primary product workflows.
- Responsiveness must be verified across mobile, tablet, laptop, desktop, dialogs, popovers, toasts, board lanes, forms, and real touch interactions.
- Production email scheduled sends remain disabled until Resend domain/DNS verification, production secrets, dry-run/manual-send validation, monitoring, and first-rollout review are complete.
- v1 rate limits use in-process state; production must run one API instance or add a shared limiter store before horizontal scaling.
- Live Google/GitHub OAuth still requires real provider credentials and configured callback URLs in the target environment.
- Approved screenshots or GIFs are still intentionally not committed; PR attachments remain the review path until assets are approved.
- UI pagination controls and dedicated tag administration remain documented limitations, not missing Milestone 1-6 requirements.

## Verification Baseline
- Latest full automated cleanup verification passed on 2026-06-07:
  - `pnpm -C apps/api lint`
  - `pnpm -C apps/api run lint:http`
  - `pnpm -C apps/api typecheck`
  - `pnpm -C apps/api test` - 15 suites, 167 tests passed.
  - `pnpm -C apps/api gen:openapi`
  - `git diff --exit-code -- docs/openapi.json`
  - `pnpm -C apps/web lint`
  - `pnpm -C apps/web typecheck`
  - `pnpm -C apps/web test` - 17 files, 103 tests passed.
  - `pnpm -C apps/api build`
  - `pnpm -C apps/web build`
  - `docker compose -f infra/docker-compose.yml config --quiet`
  - `docker build -f apps/api/Dockerfile -t taskforge-api:local .`
  - `docker build -f apps/web/Dockerfile -t taskforge-web:local .`
  - `git diff --check`
- This vetting pass added a static docs/code/architecture audit over Milestones 1-6 and did not re-run the full suite because Task 3 already established the branch-wide automated baseline after the Milestone 6 cleanup commits.

## Conclusion
- Milestones 1-6 are complete against the current PRD, task docs, runtime implementation, tests, and release-candidate documentation.
- No hidden missing feature, API endpoint, auth barrier, CI/Docker gate, OpenAPI requirement, or production-doc requirement was found for Milestones 1-6.
- The remaining work is correctly scoped to Milestone 7 production v1 launch and is now documented as explicit task, testing, and production checklist material.
