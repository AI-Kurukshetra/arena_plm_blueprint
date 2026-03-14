# AGENTS.md

Operational guide for AI agents working in this repository.

## Session Startup

Before implementing changes, read these files in order:
1. `doc/TASKS.md`
2. `doc/PROGRESS.md`
3. `doc/BLOCKERS.md`
4. `ai/skills.md`
5. `ai/context.md`
6. `ai/architecture.md`
7. `ai/database.md`

If `doc/` files are out of date, update them as part of the current task.

## Execution Model

- Work sequentially from `doc/TASKS.md`.
- Prefer finishing one task fully before starting the next.
- Keep implementation practical for hackathon MVP scope.
- Preserve current stack and project architecture.

## Source of Truth

- Product and scope context: `ai/context.md`
- System architecture: `ai/architecture.md`
- Data model and table inventory: `ai/database.md`
- Agent workflow entry: `ai/skills.md`
- Daily operational tracking: `doc/*`

## Task Tracking Rules

After completing work:
1. Mark task as complete in `doc/TASKS.md`.
2. Append an entry to `doc/PROGRESS.md` with timestamp and summary.
3. Log notable changes in `doc/CHANGELOG.md`.
4. Add architectural or process choices to `doc/DECISIONS.md` when applicable.
5. If schema details changed, update `doc/SCHEMA.md`.
6. Keep `ai/todo-task-list.md` and `ai/completed-task-list.md` in sync.

## Blockers

If work cannot continue safely, add an entry to `doc/BLOCKERS.md` using:

```
[YYYY-MM-DD HH:MM] BLOCKER
Problem: <what failed>
Attempted: <what was tried>
Needs: <what input/access is required>
```

Do not guess through missing requirements, credentials, or migration conflicts.

## Tooling and Quality

- Package manager: `npm` (current project setup).
- Run lint before handoff when files are changed.
- Prefer server components for data reads; use client components for interactivity.
- Use server actions/route handlers for data mutation.
- Keep role checks and auth gating consistent with existing patterns.
