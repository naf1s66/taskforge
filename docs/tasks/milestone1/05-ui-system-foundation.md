# Task: Add UI system foundation

## Summary
- Establish reusable UI primitives and visual conventions for forms, dialogs, cards, badges, and feedback.
- Keep the design system lightweight enough for rapid milestone work while avoiding repeated bespoke controls.

**Status:** Completed.

## Acceptance Criteria
- [x] Shared UI components exist under `apps/web/components/ui`.
- [x] Common primitives cover buttons, cards, forms, inputs, selects, dialogs, toasts, badges, skeletons, popovers, and command menus.
- [x] Utility helpers exist for class merging and reusable styling patterns.
- [x] Components support accessible labels, keyboard interaction, and composable variants where needed.

## Notes
- Add primitives only when they support real screens; avoid design-system expansion without product usage.
- Keep component APIs compatible with React Hook Form and Radix primitives where applicable.

## Implementation Notes
- UI primitives live in `apps/web/components/ui`.
- Utility helpers live in `apps/web/lib/utils.ts`.
