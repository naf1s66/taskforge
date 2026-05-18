# ADR 0004 — Hosting (Vercel FE, Render/Railway API, Neon/Supabase DB)

**Status:** Accepted

## Context
We need free-tier hosting for quick demos and a realistic deployment topology.

## Decision
- **Frontend**: Vercel (excellent Next.js support).
- **Backend**: Render or Railway (free tiers, simple containers).
- **Database**: Neon or Supabase (free Postgres).

## Consequences
- Easy pipelines and env config.
- Cold starts possible on free plans; document caveats.
