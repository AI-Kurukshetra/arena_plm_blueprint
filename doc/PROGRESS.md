# PROGRESS

[2026-03-14 16:11] codex — Committed and pushed UI/page refinements to `main` (`a0a790a`).
[2026-03-14 16:20] codex — Implemented nested BOM editor module (`/boms`) and updated task trackers.
[2026-03-14 16:23] codex — Implemented document control screens with revision history and file upload server action.
[2026-03-14 16:25] codex — Initialized `doc/` context system and aligned agent instructions to use it.
[2026-03-14 16:35] codex — Implemented CAD reference hub (`/cad`) with revision history, upload flow, viewer URL support, and tracker updates.
[2026-03-14 16:40] codex — Added API CRUD routes for products, parts, BOMs, documents, and CAD files with org-scoped auth checks.
[2026-03-14 16:44] codex — Added URL-driven search and status filters for products, parts, BOMs, and documents list pages.
[2026-03-14 16:46] codex — Added Supabase migration for `workflows` and `workflow_steps` with indexes, triggers, and RLS policies.
[2026-03-14 16:49] codex — Added Supabase migration for `change_requests` and `change_items` with constraints, indexes, triggers, and RLS policies.
[2026-03-14 16:51] codex — Added Supabase migration for `approvals` and `audit_logs` with constraints, indexes, triggers, and RLS policies.
[2026-03-14 16:55] codex — Added Supabase migration for `quality_records` and `test_results` with constraints, indexes, triggers, and RLS policies.
[2026-03-14 16:57] codex — Added Supabase migration for `certifications` and `compliance_records` with constraints, indexes, triggers, and RLS policies.
[2026-03-14 17:01] codex — Added `/changes/new` creation flow with server action and product/part detail entry points.
[2026-03-14 17:08] codex — Added page-level CRUD forms/actions for products, parts, BOMs, documents, and CAD files.
[2026-03-14 17:18] codex — Upgraded `/changes` into an approval-centric queue with assignee visibility, open/resolved filters, and synchronized lifecycle task trackers.
[2026-03-14 17:27] codex — Completed change detail workspace with impact summaries, approval progress, and richer decision records on `/changes/[changeRequestId]`.
[2026-03-14 17:39] codex — Implemented approved-change release action to promote linked/current revisions, update parent lifecycle state, and mark change requests released.
[2026-03-14 17:49] codex — Replaced the placeholder dashboard with live module summaries for products, parts, changes, approvals, documents, and CAD.
