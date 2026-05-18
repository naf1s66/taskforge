# Title
<!-- e.g., milestone-4: Kanban board, tags, filters, and automated coverage -->

## Summary
Explain the purpose of this PR and the outcome in 2-4 sentences.

## What's Included
- [ ] Product behavior / user workflow changes
- [ ] API, schema, or data model changes
- [ ] Frontend UI / state management changes
- [ ] Tests, fixtures, or CI updates
- [ ] Docs updated (README, PRD, ADRs, task docs, testing docs)

## How to Test
1. **Automated**
   ```bash
   make lint
   make typecheck
   make test
   make build
   ```
2. **API / HTTP packs**
   ```bash
   pnpm -C apps/api run lint:http
   # run relevant apps/api/tests/*.http pack in your HTTP client
   ```
3. **Manual smoke**
   ```bash
   make up
   # open http://localhost:3000 and exercise the changed workflow
   ```

## Screenshots / Logs
<!-- Add UI screenshots, terminal logs, CI links, or HTTP responses when they help review. -->

## Checklist
- [ ] Lints pass (`make lint`)
- [ ] Typecheck passes (`make typecheck`)
- [ ] Tests pass (`make test` plus any focused suites listed above)
- [ ] Build passes (`make build`)
- [ ] Updated docs where needed
- [ ] No secrets committed

## Notes / Follow-ups
<!-- Known limitations, deferred scope, rollout notes, or next-milestone handoff. -->
