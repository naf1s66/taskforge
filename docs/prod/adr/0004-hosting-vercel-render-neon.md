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
- Scheduled digest delivery is handled separately by ADR 0006 because cron pricing and timing guarantees vary by platform.
- The API must set `CORS_ALLOWED_ORIGINS` to the exact deployed web origin list so browser requests can include credentials without hard-coded domain assumptions. Production intentionally fails closed when the variable is unset; local defaults remain development-only.
- The selected cookie topology is host-only cookies for same-host deployments or a shared parent `COOKIE_DOMAIN` for deliberate cross-subdomain deployments. API session cookies remain `httpOnly`, `SameSite=Lax`, `Secure` in production, and seven days long.
- The API must set `TRUST_PROXY` to match the deployed proxy chain before relying on IP-based rate limits. Use `TRUST_PROXY=1` only when the API is exactly one trusted platform proxy hop away and that proxy scrubs forwarded headers; never trust arbitrary forwarded headers.
