# ADR 0002 — Database (Postgres + Prisma)

**Status:** Accepted

## Context
Relational data (tasks, tags, users), free managed options, strong tooling.

## Decision
Use **PostgreSQL** (Neon/Supabase free tiers) with **Prisma ORM** for DX, migrations, and type safety.

## Consequences
- SQL reliability; generous free tiers.
- Prisma generates types; simple migrations.
- Cold-starts on free tiers may add latency.
- Tasks, tags, and their join table (`TaskTag`) back the API repository so every task read/write stays scoped to the authenticated user via Prisma transactions.
