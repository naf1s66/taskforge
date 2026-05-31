# Milestones 1-5 Vetting Report

Date: 2026-05-31

## Scope
- Reviewed Milestones 1-5 task docs against the PRD, README docs, testing docs, ADRs, HTTP packs, OpenAPI export, Docker and CI configuration, API implementation, web implementation, and shared package contracts.
- Confirmed completed task-doc coverage through Milestone 5: Milestone 1 has 10 task docs, Milestone 2 has 22, Milestone 3 has 14, Milestone 4 has 11, and Milestone 5 has 12. No unchecked acceptance criteria remain in `docs/tasks/milestone1` through `docs/tasks/milestone5`.
- Treated manual checklist boxes in `docs/testing/*-manual-checklist.md` as runnable QA checklists, not incomplete task acceptance criteria.
- Excluded newly planned Milestone 6 docs from completion scoring. Those files define the next security and release-readiness pass.

## Executive Result
- No missing Milestone 1-5 product requirement was found in the actual system.
- Day 3 search, due-range, priority, status, and tag list filtering are implemented in the API and dashboard task list flows.
- Day 4 board search, board filters, Kanban movement, ordering, optimistic UI behavior, and tag surfaces are implemented.
- Day 5 email notifications are implemented across data model, API, scheduler, web UI, docs, tests, and local HTTP packs. Production real sends remain intentionally gated by provider verification, secrets, dry-run/manual-send validation, and first-rollout review.
- Remaining work belongs to Milestone 6 and Milestone 7 release readiness, not to missing Milestones 1-5 scope.

## Evidence By Milestone

## Milestone 1 - Foundation
- The monorepo workspace, root scripts, TypeScript configuration, shared package, API app, web app, Docker Compose stack, CI workflow, Prisma baseline, and initial project docs are present.
- Docker local infrastructure includes PostgreSQL, API, and web services, with environment examples under `infra/`.
- CI runs install, Prisma generation, migrations, lint, typecheck, tests, and production builds.
- ADR and planning docs establish the product, architecture, environment, and workflow foundation used by later milestones.

## Milestone 2 - Authentication
- API auth covers registration, login, refresh, logout, session lookup, web session bridging, and welcome-email dispatch hooks for created accounts.
- Prisma auth models include users, accounts, sessions, and verification tokens for credentials and OAuth-backed login.
- Web auth integrates NextAuth providers, the Prisma adapter, bridged API sessions, protected layouts, login/register UI, and the local dev bypass path.
- The dev bypass path is explicitly gated away from production.
- Auth tests and HTTP packs cover credentials, cookies, bridged sessions, OAuth-related configuration, and Docker smoke behavior.

## Milestone 3 - Task Management
- Task persistence supports user-scoped tasks with status, title, description, due date, priority, creation/update timestamps, board order, and tags.
- API task routes cover list, create, read, update, delete, filtered reads, and validation through shared schemas.
- Search and filter coverage includes status, priority, tag, text query, `dueFrom`, and `dueTo`.
- Dashboard task list flows include task creation/editing, status and priority changes, due dates, search and filters, and optimistic data updates through web clients/hooks.
- OpenAPI docs, HTTP packs, API e2e tests, and web tests exercise task workflows.

## Milestone 4 - Kanban And Tags
- Board APIs provide grouped task reads and deterministic task movement with board ordering.
- Dashboard board UI uses drag and drop, visible columns, ordering utilities, optimistic updates, and rollback handling on failed moves.
- Tag APIs and shared tag validation normalize labels and keep tag data user-scoped.
- The UI exposes tag assignment and board/list filters for text, due date, priority, status, and tag selection.
- Kanban and tag docs, HTTP packs, API tests, and web tests are present and aligned with implementation.

## Milestone 5 - Email Notifications
- Data model additions include email preferences, notification deliveries, delivery attempts, delivery type, and delivery status.
- SMTP configuration supports MailHog local defaults, Resend production defaults, sender validation, and placeholder rejection.
- Welcome email dispatch is connected to credentials registration and OAuth-created accounts through API/web bridge paths.
- Daily digest support includes preference storage, digest query grouping, preview API, guarded manual send API, protected job API, scheduler runner, idempotency keys, delivery attempts, provider metadata sanitization, failure classification, and send-budget controls.
- The web app includes email preference and digest preview clients/hooks plus dashboard opt-in/out and preview UI states.
- The Vercel cron proxy and API scheduler route now avoid forwarding a single UTC digest date for all users unless an explicit override is provided; scheduled runs derive each user's local digest date from their digest timezone.
- Email docs cover local MailHog review, Resend setup, scheduler setup, observability, rollout gates, and production safety controls.
- Email HTTP packs, API tests, web tests, linting, typechecking, and build checks were added or refreshed for the shipped behavior.

## Findings
- No release-blocking missing Milestone 1-5 scope remains from this audit.
- Earlier review findings in this branch were resolved before this report:
  - Digest preview docs no longer advertise unsupported `digestDate` preview behavior.
  - Milestone 5 settings docs now describe opt-in/out and preview scope instead of unsupported user-selected digest timing.
  - API runtime scripts now load local `.env` files consistently with docs.
  - CORS allowed origins are configurable through environment instead of relying on one hard-coded production origin.
  - Digest sequence wording now says "recently updated" instead of stale "recently moved" language.
  - Scheduled digest runs now derive local digest dates per user timezone and avoid idempotency suppression from a shared UTC date.

## Carry-Forward Scope
- Milestone 6 should complete final security and release-readiness hardening: CORS/cookie/proxy review, rate-limit and abuse-control review, OpenAPI finalization, docs refresh, Docker build CI, and security HTTP/smoke coverage.
- Milestone 7 should handle deployed free-tier provisioning, production smoke testing, DNS/secrets verification, and v1 release execution.
- Production email real sends remain gated until Resend domain/DNS verification, production secrets, dry-run/manual-send validation, monitoring, and first-rollout review are complete.
- Live Google/GitHub OAuth still requires real provider credentials and should be exercised manually in configured environments.
- Approved screenshots or GIFs are still intentionally not committed; PR attachments remain the review path until assets are approved.
- UI pagination controls and dedicated tag administration remain documented limitations, not missing Milestone 1-5 requirements.

## Verification Baseline
- Full Task 3 verification passed before this report: API tests, web tests, API/web lint, API/web typecheck, API/web production builds, API HTTP pack lint, and `git diff --check`.
- The scheduled digest timezone fix was separately verified with targeted cron proxy tests, daily digest runner tests, jobs route tests, API/web lint, API/web typecheck, and `git diff --check`.
- This vetting pass was a static docs/code/architecture audit and did not re-run the full automated suite because Task 3 already established the branch-wide test baseline.

## Conclusion
- Milestones 1-5 are complete against the current PRD and task docs.
- The Day 3 and Day 4 search, due-range, priority, board, and tag work is present in the actual API and frontend implementation.
- The Day 5 email work is present and guarded appropriately for local, staging, and production rollout.
- The next known work should proceed under Milestone 6 security and release-readiness tasks, then Milestone 7 deployment and release tasks.
