# Task: Deployed browser, device, and workflow smoke

## Summary
- Prove the production deployment works for clients in real browsers and on representative device sizes.
- Repeat the Milestone 6 browser-auth/security checks against deployed URLs, then exercise the main product workflows.

**Status:** Planned.

## Acceptance Criteria
- [ ] Deployed web login/register works with credential auth and any enabled OAuth provider.
- [ ] `/auth/session-bridge` mints and refreshes the API `tf_session` cookie only for authenticated users, keeps `Cache-Control: no-store`, and sanitizes unsafe `from` values.
- [ ] Authenticated dashboard loads tasks/tags/board/email preference data through the deployed API without browser CORS failures.
- [ ] Task create/edit/delete, filters/search, board movement, tag creation, email preferences, digest preview, and manual digest dry run work in the deployed environment.
- [ ] Swagger UI loads over HTTPS at the deployed API docs path.
- [ ] Mobile, tablet, laptop, and desktop smoke verifies layout, forms, dialogs, popovers, toasts, and board interactions remain usable.
- [ ] Negative deployed smokes cover unlisted origin rejection, missing auth, wrong job secret, wrong cron secret, and same-origin logout protection.

## Manual Step Timing
| Step | Timing | Owner | Notes |
| --- | --- | --- | --- |
| Deployed browser smoke | After deployment | Agent or human | Requires deployed URLs and test credentials. |
| Real mobile/tablet check | After deployment | Human preferred | Physical devices catch viewport/touch defects browser emulation misses. |
| OAuth provider callback smoke | After OAuth apps exist | Human or agent | Requires provider credentials and allowed callbacks. |
| Unlisted-origin CORS smoke | After API deploy | Agent | Use a controlled test origin or curl/preflight, not arbitrary third-party pages. |

## Verification
- Use `docs/testing/milestone7-manual-checklist.md` as the source of truth.
- Capture non-secret screenshots/log snippets for successful auth, dashboard data load, mobile layout, and protected-route negative checks.
- Do not run bounded rate-limit smoke against shared production unless the environment is explicitly approved for it.
- Record every skipped check with a reason and owner before v1 sign-off.
