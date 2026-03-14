# SCHEMA

## Overview
Supabase Postgres schema is multi-tenant with `organization_id` on tenant-owned tables and revision-first modeling for controlled entities.

## Core Tables Implemented
- Organizations and users
- Products and product revisions
- Parts and part revisions
- BOMs and BOM items
- Documents and document revisions
- CAD files and CAD file revisions
- Specifications and requirements
- Workflows and workflow steps
- Change requests and change items
- Approvals and audit logs
- Quality records and test results
- Certifications and compliance records

## Planned Lifecycle and Collaboration Tables
- Suppliers, supplier links
- Projects, milestones
- Risks, issues

## Constraints and Patterns
- UUID primary keys
- `created_at` and `updated_at` timestamps
- App-level status fields (`draft`, `review`, `released`, etc.)
- Current revision pointers on parent tables (`current_revision_id`)
- Unique keys scoped by organization where appropriate

## Storage Integration
- Supabase Storage buckets are used for file payloads.
- Postgres stores metadata, ownership, revision links, and paths.

## Security Baseline
- Row Level Security should be enabled for all tenant-owned tables.
- Access should be constrained by the user’s organization context.

## Canonical Reference
For complete field-level schema details, see `ai/database.md` and SQL migrations under `supabase/migrations/`.
