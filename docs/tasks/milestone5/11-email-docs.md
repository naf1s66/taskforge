# Task: Update email documentation

## Summary
- Update project docs so the email feature can be configured, tested, and reviewed consistently.
- Reconcile ADR 0003's deferred implementation note with the shipped milestone behavior.

**Status:** New.

## Acceptance Criteria
- [ ] README documents MailHog, Resend SMTP production setup, SMTP env vars, digest behavior, and local verification steps.
- [ ] PRD reflects the implemented email scope and any remaining limitations.
- [ ] ADR 0003 is updated or superseded with Resend as the production default while preserving the provider-neutral adapter decision.
- [ ] Manual and automated testing docs exist for Milestone 5.
- [ ] Deployment docs include Resend DNS prerequisites, API key handling, `EMAIL_FROM`, and the free daily send budget.

## Manual Setup Required
- Document the exact production sending domain after it is selected and verified.
- Document where the Resend API key is stored for each deployment target, without exposing the secret value.
- Record the production digest schedule, send budget, and escalation path for delivery failures.
- Update docs again if the Resend account moves from the free plan to a paid plan.

## Notes
- Include free-tier deployment constraints and Resend-specific caveats.
- Keep screenshots optional until the settings and preview UI are stable.
