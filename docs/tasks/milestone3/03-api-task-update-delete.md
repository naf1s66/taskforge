# Task: Implement `/tasks/:id` update & delete

## Summary
- Add authenticated `PATCH` and `DELETE` handlers that let users update or remove only their own tasks.
- Ensure optimistic UI plans can rely on deterministic responses (updated record payloads plus consistent 404/403 errors).

**Status:** New.  
**Concurrency:** Runs after `01` (repository) and can proceed in parallel with the filters/search and test tasks.

## Acceptance Criteria
- [ ] `PATCH /tasks/:id` validates payloads with `TaskUpdateSchema`, applies partial updates, and returns the fresh DTO (including timestamps).
- [ ] `DELETE /tasks/:id` removes the task belonging to the current user and returns a short confirmation body (id + status summary).
- [ ] Requests targeting another user’s task respond with 404 to avoid leaking existence.
- [ ] Error cases (missing id, validation) share the same error envelope used in other routes.
- [ ] API reference docs/`.http` suites are updated with examples for update/delete flows.

## Notes
- Keep Prisma operations wrapped in try/catch so constraint violations (e.g., unique tags) surface cleanly.
- Begin outlining how these handlers will surface audit logs (even if not implemented this milestone).
