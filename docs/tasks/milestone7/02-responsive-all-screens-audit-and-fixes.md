# Task: Responsive audit and fixes for every screen

## Summary
- Verify TaskForge works on client devices before v1 launch.
- Audit every page, dialog, menu, toast, board lane, form, and data-heavy state across mobile, tablet, laptop, and desktop widths.

**Status:** Planned.

## Acceptance Criteria
- [ ] Responsive audit covers the full screen inventory: `/login`, `/register`, `/dashboard`, `/tasks/hooks-demo`, protected root redirect `/`, session bridge redirects, auth/logout flows, task create/edit dialogs, tag selector popovers, due-date picker, email settings, digest preview, toasts, empty/error/loading states, and Swagger docs link behavior.
- [ ] Browser/device matrix includes at least 375x667, 390x844, 768x1024, 1024x768, 1366x768, and one wide desktop viewport.
- [ ] Dashboard board lanes, filters, search, task cards, dialogs, popovers, and digest/settings panels do not overflow horizontally or hide primary actions.
- [ ] Touch targets are usable on mobile for auth forms, provider buttons, task actions, drag handles/interactions, filters, selects, date picker, and tag creation.
- [ ] Any visible text encoding, truncation, overlap, unreadable contrast, or clipped button label is fixed before launch.
- [ ] Automated or scripted viewport checks are added where practical; otherwise manual evidence is recorded in `docs/testing/milestone7-manual-checklist.md`.

## Current Audit Inputs
- Current UI uses responsive Tailwind classes in public auth pages, the site header, dashboard sections, dialogs, popovers, and task forms.
- There is no committed proof that every screen has been exercised across mobile/tablet/desktop viewports in a real browser.
- The dashboard is the highest-risk screen because it combines board columns, filters, dialogs, drag-and-drop, digest preview, settings, loading skeletons, and toast states.
- `/tasks/hooks-demo` is protected and should either pass responsive smoke or be explicitly treated as internal/demo-only before v1.

## Manual Step Timing
| Step | Timing | Owner | Notes |
| --- | --- | --- | --- |
| Local viewport audit | Before deployment | Agent | Can use local browser/dev server and fix CSS or component defects. |
| Real device smoke | After deployment or preview URL exists | Human or agent with browser access | Needs deployed URL and real browser behavior for CORS/cookies. |
| Touch/drag verification | After responsive fixes | Human preferred | DnD behavior is hard to trust from DOM checks alone. |
| Final client-device approval | After deployed smoke | Human | Required before saying v1 works for clients on all devices. |

## Verification
- Run automated lint/typecheck/tests/build after any UI changes.
- If Playwright or another browser runner is added, capture desktop and mobile screenshots for `/login`, `/register`, and `/dashboard`.
- Manually verify no horizontal page scroll at required viewport widths except intentional scroll inside controlled components.
- Record screenshots or notes for each viewport in `docs/testing/milestone7-manual-checklist.md`.
