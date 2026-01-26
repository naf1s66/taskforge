# Milestone 3 Manual Tasks Checklist

Use this list to certify the tasks experience end-to-end. Mark each item as you go and capture logs or screenshots if anything fails.

## 1. Pre-flight setup
- [ ] Copy env templates: `cp infra/env/api.env.example apps/api/.env` and `cp infra/env/web.env.example apps/web/.env` (or update existing files).
- [ ] Fill in secrets (`JWT_SECRET`, `SESSION_BRIDGE_SECRET`, `NEXTAUTH_SECRET`, `API_BASE_URL`, `NEXT_PUBLIC_API_BASE_URL`) and keep values in sync between apps.
- [ ] Install deps + generate Prisma client: `pnpm install && pnpm --filter @taskforge/api exec prisma generate`.
- [ ] Apply migrations + seed demo user: `pnpm -C apps/api prisma migrate deploy` then `pnpm -C apps/api tsx prisma/seed.ts`.

## 2. API task CRUD and filters
- [ ] Start the API locally: `pnpm -C apps/api dev`.
- [ ] Authenticate with the API (use `apps/api/tests/auth.http` or run `http POST :4000/api/taskforge/v1/auth/login email=demo@taskforge.dev password=Demo1234!`).
- [ ] Run the task flows in `apps/api/tests/tasks.http` and confirm list/create/update/delete all succeed with the auth headers/cookie set.
- [ ] Confirm defaults: new tasks return `status: "TODO"`, `priority: "MEDIUM"`, and normalized tag arrays.
- [ ] Verify filters (`status`, `priority`, `tag`, `q`, `dueFrom`, `dueTo`) return only matching tasks and reject invalid ranges with a 400 error.

## 3. Dashboard UI verification
- [ ] Start the web app: `pnpm -C apps/web dev`.
- [ ] Sign in at `http://localhost:3000/login` using the seeded credentials and land on `/dashboard`.
- [ ] Confirm the dashboard renders the status columns, counts, and empty-state messaging when no tasks exist.
- [ ] Use the status filter buttons and sort dropdown to verify tasks rearrange correctly.
- [ ] Click **Refresh** and verify the loading state and updated counts.

## 4. Create task dialog
- [ ] Click **New task** to open the create dialog.
- [ ] Validate required fields: blank title should show an inline error and prevent submit.
- [ ] Create a task with status, priority, due date, and tags; confirm a success toast and the new card appears in the correct column.
- [ ] Confirm optimistic "Syncing" badge appears briefly when the network is slow and disappears after success.

## 5. Edit task dialog
- [ ] Click **Edit** on a task card to open the edit dialog.
- [ ] Verify the form pre-fills, update fields, and save changes; confirm the card updates and a success toast appears.
- [ ] (Optional) Delete the task via the API while the dialog is open and confirm the dialog closes with a warning toast.

## 6. Hooks demo and advanced filters
- [ ] Visit `/tasks/hooks-demo` and confirm the filter controls (status, priority, tags, search, due range) drive the task list.
- [ ] Verify filters persist to the URL and local storage; **Clear filters** resets the UI.
- [ ] Create/edit tasks from the demo page to validate optimistic cache updates.

## 7. Documentation spot-check
- [ ] Verify `README.md` and `docs/PRD.md` describe the tasks dashboard, filters, and dialogs.
- [ ] Confirm `docs/openapi.json` and `apps/api/tests/tasks.http` match the current task API.
- [ ] Capture or update screenshots/GIFs in `docs/media` if the UI changed.
