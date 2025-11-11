# Task: Add task filters, tags, and search

## Summary
- Extend the list endpoint with query params for status, priority, tag, and text search, matching the PRD filtering requirements.
- Persist tag relationships using the existing `Tag`/`TaskTag` tables and expose them through the DTO mapper.

**Status:** New.  
**Concurrency:** Runs after `02-api-task-create-list`; can overlap with update/delete as long as both coordinate on repository helpers.

## Acceptance Criteria
- [ ] `GET /tasks` accepts `status`, `priority`, `tag`, `q`, `dueFrom`, and `dueTo` params, validating them via Zod.
- [ ] Repository layer supports tag joins and text search (e.g., `title`/`description` `ilike`).
- [ ] Creating/updating tasks allows attaching tags (creating new ones when necessary) while keeping labels normalized.
- [ ] OpenAPI + README examples describe how to use the new query params and tag payloads.
- [ ] `.http` pack adds at least one filtered request showcasing the query string options.

## Notes
- Consider a follow-up task for pagination once we understand result sizes.
- Keep SQL-friendly filters encapsulated in the repository so the route stays simple.
