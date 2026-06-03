# ADR 0008 - Release-Candidate Security and Deployment Gates

**Status:** Accepted

## Context

Milestone 6 turns the locally implemented TaskForge product into a release candidate. The codebase now includes auth, task/tag/board clients, email preferences/digests, CORS hardening, trusted-proxy parsing, structured API errors, rate limits, Dockerfiles, compose, OpenAPI, and production runbooks. Release review still needs clear boundaries between behavior implemented locally and behavior enabled in production.

## Decision

1. **Production facts are placeholders until Day 7.** Production environment values must be filled in deployment provider secret managers using the placeholder map in `docs/prod/README.md` and the templates under `infra/env/`. Real secrets and concrete private deployment facts must not be committed.
2. **Browser API traffic is direct.** The Next.js app exposes auth/session infrastructure and cron server routes only. Task, tag, board, email preference, digest preview, and manual digest clients call the Express API directly through `API_BASE_URL` or `NEXT_PUBLIC_API_BASE_URL`; therefore production CORS, cookie, and same-site topology must be correct before browser smoke can pass.
3. **Same-site cookie topology is a release gate.** Production browser auth must use either an API behind the web origin or same-site custom subdomains with an explicit shared `COOKIE_DOMAIN`. Raw unrelated platform domains are not accepted for OAuth/session-bridge cookie auth.
4. **Trusted proxy is explicit.** `TRUST_PROXY` must match the actual deployment proxy chain. A hop count such as `1` is allowed only when exactly one trusted platform proxy scrubs inbound forwarded headers. Broad trust of arbitrary forwarded headers is rejected because it undermines IP-based rate limits.
5. **Rate-limit topology is constrained.** v1 production runs a single API instance with in-process limiter state. If the API is horizontally scaled, a shared `express-rate-limit` store such as Redis must be added before increasing instance count.
6. **Docker build validation is a release gate, not a secret-bearing deploy step.** Compose config and API/web image builds must use safe placeholder values. If CI does not build both images on the branch, the release log must include local build evidence before Day 7 sign-off.
7. **Email scheduling remains gated.** Digest scheduling, Resend SMTP configuration, and manual sends are implemented, but real scheduled production sends remain disabled until the production email fact register is complete and manual-only Resend/observability checks pass.

## Consequences

- Reviewers can operate the release candidate without private context by following documented placeholders and gates.
- Day 7 deployment work stays separate from Milestone 6 local implementation and hardening work.
- CORS/cookie failures are treated as deployment-configuration failures rather than hidden web proxy assumptions.
- Rate-limit guarantees remain honest for a single API instance and do not silently weaken under horizontal scaling.
- Docker build confidence can be obtained without exposing Resend, OAuth, database, or job secrets.
- Production email risk is reduced by preserving the distinction between local implementation and production enablement.
