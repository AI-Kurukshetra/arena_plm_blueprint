create table public.approvals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  change_request_id uuid not null references public.change_requests (id) on delete cascade,
  workflow_step_id uuid references public.workflow_steps (id) on delete set null,
  step_order integer not null,
  step_name text not null,
  assignee_user_id uuid references public.users (id) on delete set null,
  status text not null default 'pending',
  decision text,
  decision_notes text,
  decided_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint approvals_step_order_check check (step_order > 0)
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  actor_user_id uuid references public.users (id) on delete set null,
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  before_data jsonb,
  after_data jsonb,
  metadata jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index approvals_organization_id_idx
  on public.approvals (organization_id);

create index approvals_change_request_id_idx
  on public.approvals (change_request_id);

create index approvals_workflow_step_id_idx
  on public.approvals (workflow_step_id);

create index approvals_assignee_user_id_idx
  on public.approvals (assignee_user_id);

create index approvals_status_idx
  on public.approvals (organization_id, status);

create index audit_logs_organization_id_idx
  on public.audit_logs (organization_id);

create index audit_logs_actor_user_id_idx
  on public.audit_logs (actor_user_id);

create index audit_logs_entity_idx
  on public.audit_logs (entity_type, entity_id);

create index audit_logs_action_idx
  on public.audit_logs (organization_id, action);

create trigger set_approvals_updated_at
before update on public.approvals
for each row
execute function public.set_updated_at();

alter table public.approvals enable row level security;
alter table public.audit_logs enable row level security;

create policy "Approvals are viewable by active organization members"
on public.approvals
for select
to authenticated
using (public.is_active_member_of_organization(organization_id));

create policy "Approvals are insertable by active organization members"
on public.approvals
for insert
to authenticated
with check (public.is_active_member_of_organization(organization_id));

create policy "Approvals are updatable by active organization members"
on public.approvals
for update
to authenticated
using (public.is_active_member_of_organization(organization_id))
with check (public.is_active_member_of_organization(organization_id));

create policy "Approvals are deletable by active organization members"
on public.approvals
for delete
to authenticated
using (public.is_active_member_of_organization(organization_id));

create policy "Audit logs are viewable by active organization members"
on public.audit_logs
for select
to authenticated
using (public.is_active_member_of_organization(organization_id));

create policy "Audit logs are insertable by active organization members"
on public.audit_logs
for insert
to authenticated
with check (public.is_active_member_of_organization(organization_id));

create policy "Audit logs are updatable by active organization members"
on public.audit_logs
for update
to authenticated
using (public.is_active_member_of_organization(organization_id))
with check (public.is_active_member_of_organization(organization_id));

create policy "Audit logs are deletable by active organization members"
on public.audit_logs
for delete
to authenticated
using (public.is_active_member_of_organization(organization_id));
