# Milestone 7 Task Sequence (Production v1 Launch)

Scope note: Milestone 7 turns the Milestone 6 release candidate into a production v1 deployment. The milestone should not add major product features. It should close deployment facts, responsiveness/device confidence, API authentication-barrier evidence, production hosting, deployed smoke, email enablement gates, and final v1 sign-off.

1. **01-production-launch-preflight.md** - Freeze the v1 launch scope, create the production fact register, choose the browser-auth topology, and confirm which manual provider/account steps must happen before agent-led deployment work.
2. **02-responsive-all-screens-audit-and-fixes.md** - Audit every shipped screen and dialog across mobile, tablet, laptop, and desktop widths; fix responsive layout defects before production smoke.
3. **03-api-auth-barrier-and-endpoint-smoke.md** - Build a complete API/web route authentication matrix and verify every non-public endpoint has the intended user-auth or secret barrier.
4. **04-production-hosting-and-migrations.md** - Provision the free-tier production web, API, and database stack; prove the selected API SMTP egress path; apply migrations; seed only approved production-safe data; and record real deployment facts.
5. **05-deployed-browser-device-smoke.md** - Run deployed real-browser smoke across devices for auth, CORS, cookies, dashboard workflows, OpenAPI docs, scheduler paths, and responsive behavior.
6. **06-v1-release-signoff-and-email-enablements.md** - Complete release sign-off, decide whether production email scheduled sends are enabled or deferred, and document any v1 post-launch follow-ups.

## Manual Sequencing Rule

- Human-only provider/account steps happen before agent-led deployment when they require account ownership, DNS, OAuth provider apps, Resend setup, billing/plan decisions, or secret generation outside the repo.
- Agent-led implementation and documentation updates can happen before manual provider work when placeholders are enough.
- Deployed browser and device smoke happens after the agent deploys or after the human provides the deployed URLs and production env facts.
- Real production email sends happen last and only after the production fact register, verified sender, observability review, and manual-only smoke pass.
