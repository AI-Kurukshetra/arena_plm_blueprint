# TASKS

Status legend:
- `[ ]` todo
- `[x]` done
- `[~]` in progress
- `[!]` blocked

## Setup
- [x] Initialize the project with Next.js App Router, TypeScript, ESLint, and Tailwind CSS.
- [x] Add Supabase client dependencies to the application.
- [x] Add `.env.example` with Supabase URL and anon key placeholders.
- [x] Set up the root application layout and global stylesheet.
- [x] Replace the default Next.js landing page with a PLM-branded home page.
- [x] Create route groups for public pages and authenticated app pages.
- [x] Build a shared application shell with top navigation and module sidebar.
- [x] Create reusable UI components for tables, forms, drawers, and status badges.
- [x] Set up a Supabase migration workflow for schema changes.
- [x] Add seed data for a demo organization, users, products, and parts.
- [x] Update the README with local setup and environment instructions.

## Authentication
- [x] Create a browser-side Supabase client helper.
- [x] Create a server-side Supabase client helper.
- [x] Add Supabase auth profile provisioning migration for `public.users`.
- [x] Add middleware that restores the Supabase session on incoming requests.
- [x] Build a sign-in page with Supabase Auth.
- [x] Build a sign-up page with Supabase Auth.
- [x] Build a sign-out action for authenticated users.
- [x] Redirect unauthenticated users away from protected app routes.
- [x] Load the signed-in user profile and organization after login.
- [x] Add role checks for `admin`, `engineer`, `approver`, and `supplier`.
- [x] Show an unauthorized state when a user lacks page access.

## Product Management
- [x] Create foundational database tables for organizations and users.
- [x] Create database tables for products and product revisions.
- [x] Create database tables for parts and part revisions.
- [x] Create database tables for BOMs and BOM items.
- [x] Create database tables for documents and document revisions.
- [x] Create database tables for CAD files and CAD file revisions.
- [x] Create database tables for specifications and requirements.
- [x] Build a product list page.
- [x] Build a product detail page with revision history.
- [x] Build a part library page.
- [x] Build a part detail page with linked usages.
- [x] Build a nested BOM editor.
- [x] Build document upload and revision history screens.
- [x] Build CAD file upload and file reference screens.
- [x] Add API routes for product, part, BOM, document, and CAD CRUD.
- [x] Add search and filtering for products, parts, BOMs, and documents.

## Lifecycle Tracking
- [x] Create database tables for workflows and workflow steps.
- [x] Create database tables for change requests and change items.
- [x] Create database tables for approvals and audit logs.
- [x] Create database tables for quality records and test results.
- [x] Create database tables for certifications and compliance records.
- [ ] Build a change request creation flow from product and part pages.
- [ ] Build an approval queue page.
- [ ] Build a change detail page with impacted records and decisions.
- [ ] Implement revision release logic after approval.
- [ ] Record audit events for create, edit, approve, reject, and release actions.
- [ ] Build compliance tracking pages for standards, evidence, and certifications.
- [ ] Build quality tracking pages for findings, actions, and test results.

## Dashboard
- [ ] Create a PLM dashboard page.
- [ ] Show counts for products, parts, open changes, and pending approvals.
- [ ] Show a recent activity feed from audit logs.
- [ ] Show upcoming milestones and overdue tasks.
- [ ] Show document and CAD revision summaries.
- [ ] Add reporting cards for workflow, quality, and compliance status.

## Collaboration
- [ ] Create database tables for suppliers and supplier links.
- [ ] Create database tables for projects and milestones.
- [ ] Create database tables for risks and issues.
- [ ] Build a supplier directory page.
- [ ] Build supplier sharing for approved documents and drawings.
- [ ] Build a project list page.
- [ ] Build a milestone tracker.
- [ ] Add notifications for approval requests and status changes.
- [ ] Add activity comments on change requests and product records.
- [ ] Build risk and issue tracking linked to products or projects.
