mdCopy code# Title
<!-- e.g., milestone-1: project bootstrap, monorepo scaffold, Docker setup, API + frontend foundations -->

## Summary
Explain the purpose of this PR and the outcome in 2–4 sentences.

## What’s Included
- [ ] Monorepo / workspace setup
- [ ] Docker Compose (db, mailhog)
- [ ] API health endpoint + Swagger
- [ ] Next.js + Tailwind + shadcn/ui + Framer Motion
- [ ] Docs updated (README, PRD, ADRs)

## How to Test
1. **Infra**
   ```bash
   make up
   docker ps



API
bashCopy codepnpm -C apps/api dev
# in another terminal
curl http://localhost:4000/api/taskforge/v1/health



Web
bashCopy codepnpm -C apps/web dev
# open http://localhost:3000



Screenshots / Logs
<!-- Swagger page, dark UI, curl health output, docker ps -->
Checklist


 Lints pass (make lint or pnpm -r run lint)


 Typecheck passes (pnpm run typecheck)


 Updated docs where needed


 No secrets committed


Notes / Follow-ups
<!-- TODOs for next milestone, known limitations, decisions -->
yamlCopy code
---

If anything in the typecheck output looks noisy after this, paste the exact error lines and I’ll give you the fix line-by-line.
