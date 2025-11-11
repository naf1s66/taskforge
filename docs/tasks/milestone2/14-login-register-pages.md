# Task: Build login and registration pages

## Summary
- Create Next.js App Router pages for sign-in and sign-up with accessible, validated forms.
- Provide client-side and server-side validation feedback to users.

**Status:** Completed — the `/login` and `/register` App Router pages now host fully validated forms and submission flows.

## Acceptance Criteria
- [x] `/login` and `/register` routes exist with responsive layouts matching the design system.
- [x] Forms perform validation (e.g., using Zod + react-hook-form) before submission and display errors inline.
- [x] Successful submissions call the appropriate auth actions and navigate users accordingly.

## Notes
- Reuse shared UI primitives from shadcn/ui to maintain consistency.
- Include links between the two pages ("Already have an account?", etc.).
- `apps/web/app/(public)/login/page.tsx` + `apps/web/app/(public)/register/page.tsx` load the respective `LoginForm`/`RegisterForm` components built with `react-hook-form`, `zodResolver`, and shadcn/ui primitives so UX stays consistent.
- Inline helper links connect both flows, and the forms call through to the API credential endpoints the moment validation passes.
