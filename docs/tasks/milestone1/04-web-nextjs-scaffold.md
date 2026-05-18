# Task: Scaffold Next.js web app

## Summary
- Bootstrap the web app with Next.js App Router, TypeScript, Tailwind, and base layout wiring.
- Prepare the route structure for public auth pages and protected dashboard pages.

**Status:** Completed.

## Acceptance Criteria
- [x] `apps/web` has Next.js scripts for dev, build, start, lint, typecheck, and tests.
- [x] App Router layout files exist for global app shell, public routes, and protected routes.
- [x] Tailwind/PostCSS configuration and global styles are wired into the app.
- [x] The web app can run through Docker or local pnpm commands.

## Notes
- Keep server-side auth and data fetching compatible with the App Router model.
- Use reusable components rather than page-local UI fragments when patterns repeat.

## Implementation Notes
- App routes live under `apps/web/app`.
- Styling is rooted in `apps/web/styles/globals.css`, `apps/web/tailwind.config.ts`, and `apps/web/postcss.config.cjs`.
