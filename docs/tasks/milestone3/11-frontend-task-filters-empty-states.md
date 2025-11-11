# Task: Build task filters & empty states

## Summary
- Add UI controls (status, priority, tag, due range, search) that feed into the query hook’s filter params.
- Design empty and zero-result states so users understand how to adjust filters or create new tasks.

**Status:** New.  
**Concurrency:** Depends on `09` hooks + filter support in the API (`04`); can run parallel to the list UI once data plumbing exists.

## Acceptance Criteria
- [ ] Filter controls drive the hook via query params/persisted URL state.
- [ ] Empty-state illustrations/text explain what to do next (create a task, reset filters).
- [ ] Filters are keyboard-accessible and announced to screen readers.
- [ ] README/docs capture how filters map to API query parameters.
- [ ] Analytics/events stubs are in place for future tracking of filter usage (even if not wired yet).

## Notes
- Reuse shadcn/ui components (Select, Combobox, Date Picker) to reduce custom styling work.
- Consider storing the last-used filters in `localStorage` for quick return visits.
