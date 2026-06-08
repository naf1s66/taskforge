# Task: v1 release sign-off and production email enablement decision

## Summary
- Complete v1 production release sign-off after deployment and smoke evidence exists.
- Decide whether production scheduled emails are enabled for v1 or explicitly deferred.

**Status:** Planned.

## Acceptance Criteria
- [ ] Automated checks from `docs/testing/milestone7-automated.md` pass after the final release commit.
- [ ] Manual checks from `docs/testing/milestone7-manual-checklist.md` pass or have explicit owner-approved deferrals.
- [ ] Production deployment facts are recorded without secrets.
- [ ] Open launch risks are triaged into blockers, accepted v1 limitations, or post-launch tasks.
- [ ] `docs/prod/email-production-rollout.md` has no accidental `<TBD before enablement>` values if scheduled sends are enabled.
- [ ] If scheduled sends are deferred, docs clearly state that welcome/manual/digest infrastructure exists but unattended production sends remain disabled.
- [ ] PR summary, release notes, and final checklist are updated with exact verification dates and commands.

## Manual Step Timing
| Step | Timing | Owner | Notes |
| --- | --- | --- | --- |
| Approve release blockers/deferrals | After smoke | Human | Product/release owner decision. |
| Real production email manual send | After Resend verification and fact register completion | Human-led | Use one approved internal recipient only. |
| Enable unattended scheduler | Last | Human | Enable exactly one path, preferably Vercel Cron, only after manual send and observability checks. |
| Final release notes | After sign-off | Agent | Can summarize evidence and known limitations. |

## Verification
- Re-run final automated checks or confirm the latest CI run covers them.
- Confirm `docs/openapi.json` has no generated drift.
- Confirm production `TF_DEV_BYPASS_AUTH=false`.
- Confirm no real secrets are present in git history, docs, screenshots, or PR text.
- Confirm post-launch monitoring and escalation owner are recorded before enabling real scheduled email sends.
