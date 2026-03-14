# DECISIONS

## 2026-03-14 — Adopt `doc/` as operational context layer
Decision:
Use `doc/` for day-to-day task state (`TASKS`, `PROGRESS`, `BLOCKERS`, `CHANGELOG`, `DECISIONS`, `SCHEMA`) while retaining `ai/*.md` as deeper product and architecture reference.

Rationale:
`ai/*.md` captures long-form context well, but a compact operations layer improves session continuity and handoff clarity.

## 2026-03-14 — Keep current stack conventions
Decision:
Do not import external AGENTS rules verbatim; adapt them to the repo’s actual setup.

Rationale:
The downloaded template assumed different defaults (e.g., package manager and framework conventions). Tailoring avoids process drift and tooling conflicts.

## 2026-03-14 — API CRUD uses organization-scoped route handlers
Decision:
Implement entity CRUD with Next.js route handlers in `src/app/api/*` using a shared auth helper that resolves the signed-in user's organization and role before every query.

Rationale:
This keeps endpoints consistent with Supabase RLS expectations and avoids duplicate auth logic across product, part, BOM, document, and CAD APIs.
