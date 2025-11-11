# Task: Refresh PRD and ADRs for auth changes

## Summary
- Review PRD and ADR documents to capture the finalized authentication architecture and any deviations from original plans.
- Update diagrams or decision logs to reflect new flows (JWT, OAuth, NextAuth integration).

**Status:** Completed — PRD + ADR 0001 now capture the delivered auth architecture, lifecycle, and deviations.

## Acceptance Criteria
- [x] `docs/PRD.md` auth sections reflect the implemented features and user journeys.
- [x] Relevant ADRs are amended or new ADRs added to document significant decisions.
- [x] Any diagrams or sequence charts are updated or added to illustrate the auth lifecycle.

## Notes
- Coordinate with engineering leads to ensure documentation matches actual implementation choices.
- Highlight reasons for deviations (if any) to support future audits.
- `docs/PRD.md` now details the OAuth + session-bridge lifecycle (diagram included), the rationale for database-backed NextAuth sessions, and the day-by-day milestone scope.
- `docs/adr/0001-auth-strategy-nextauth-+-backend-jwt.md` spells out the chosen bridge, shared Prisma adapter, logout coordination, and the operational implications so future work references an accepted decision record.
