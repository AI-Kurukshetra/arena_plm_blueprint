# CHANGELOG

## 2026-03-14

- Added `/boms` module with nested BOM editing UI and role-gated access.
- Added `/documents` list and detail screens with revision timeline.
- Added document revision upload server action writing to Supabase Storage and `document_revisions`.
- Added `/cad` list and detail screens with CAD revision timeline and viewer-link references.
- Added CAD revision upload server action writing to Supabase Storage bucket `cad-files` and `cad_file_revisions`.
- Added REST API CRUD endpoints for `products`, `parts`, `boms`, `documents`, and `cad-files` under `src/app/api/*`.
- Added shared API auth helper for org-scoped access checks and role gating in `src/lib/api/route-auth.ts`.
- Added URL query + status filter controls and server-side filtering for products, parts, BOMs, and documents list pages.
- Added migration `20260314195500_create_workflows_and_workflow_steps.sql` for lifecycle workflow schema with RLS coverage.
- Added migration `20260314200500_create_change_requests_and_change_items.sql` for change lifecycle tracking schema with RLS coverage.
- Added migration `20260314201500_create_approvals_and_audit_logs.sql` for approval queues and audit trail schema with RLS coverage.
- Added migration `20260314202500_create_quality_records_and_test_results.sql` for quality and testing lifecycle schema with RLS coverage.
- Added migration `20260314203500_create_certifications_and_compliance_records.sql` for certification and compliance tracking schema with RLS coverage.
- Enabled sidebar links for BOM and Documents modules.
- Enabled sidebar link for CAD files module.
- Added project-level agent operations guide in `AGENTS.md`.
- Introduced `doc/` operational context files for task and progress tracking.
