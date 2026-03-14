# Project Overview

NextGen PLM is a cloud-native Product Lifecycle Management platform built as a hackathon MVP. This file serves as the main AI context and workflow guide so development can continue efficiently after a session reset.

# Technology Stack

- Next.js
- Supabase
- PostgreSQL
- TypeScript
- Tailwind CSS

# Project File References

The AI assistant should read and use the following files for project context before starting implementation work:

- `doc/TASKS.md` -> operational task status with progress markers
- `doc/PROGRESS.md` -> recent session history and handoff notes
- `doc/BLOCKERS.md` -> known blockers requiring human input
- `doc/CHANGELOG.md` -> summary of implemented changes
- `doc/DECISIONS.md` -> architecture and process decisions
- `doc/SCHEMA.md` -> compact schema overview
- `ai/context.md` -> product documentation and project scope
- `ai/architecture.md` -> system architecture
- `ai/database.md` -> database schema and relationships
- `ai/todo-task-list.md` -> tasks that still need to be implemented
- `ai/completed-task-list.md` -> tasks that are already finished

# Development Workflow

Follow these workflow rules for every development session:

1. Always review the project reference files listed above.
2. Select the next task from `doc/TASKS.md` (fallback to `ai/todo-task-list.md` if needed).
3. Implement the task fully.
4. After completion:
   - mark it complete in `doc/TASKS.md`
   - append a short entry in `doc/PROGRESS.md`
   - update `doc/CHANGELOG.md` for notable code/schema changes
   - keep `ai/todo-task-list.md` and `ai/completed-task-list.md` synchronized
5. Never repeat tasks that are already in `ai/completed-task-list.md`.
6. If new work is discovered while implementing a task, add it to both `doc/TASKS.md` and `ai/todo-task-list.md`.

# Development Principles

- Focus on building a working MVP suitable for a hackathon demo.
- Prefer simple, clear solutions.
- Avoid unnecessary complexity.
- Do not change the technology stack unless explicitly instructed.
