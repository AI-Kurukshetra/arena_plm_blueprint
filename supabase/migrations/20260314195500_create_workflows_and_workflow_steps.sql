create table public.workflows (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  workflow_type text not null,
  is_active boolean not null default true,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.workflow_steps (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  workflow_id uuid not null references public.workflows (id) on delete cascade,
  step_order integer not null,
  name text not null,
  step_type text,
  default_role text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint workflow_steps_step_order_check check (step_order > 0),
  constraint workflow_steps_workflow_id_step_order_key unique (workflow_id, step_order)
);

create index workflows_organization_id_idx
  on public.workflows (organization_id);

create index workflows_workflow_type_idx
  on public.workflows (workflow_type);

create index workflows_created_by_idx
  on public.workflows (created_by);

create index workflow_steps_organization_id_idx
  on public.workflow_steps (organization_id);

create index workflow_steps_workflow_id_idx
  on public.workflow_steps (workflow_id);

create index workflow_steps_default_role_idx
  on public.workflow_steps (default_role);

create trigger set_workflows_updated_at
before update on public.workflows
for each row
execute function public.set_updated_at();

create trigger set_workflow_steps_updated_at
before update on public.workflow_steps
for each row
execute function public.set_updated_at();

alter table public.workflows enable row level security;
alter table public.workflow_steps enable row level security;

create policy "Workflows are viewable by active organization members"
on public.workflows
for select
to authenticated
using (public.is_active_member_of_organization(organization_id));

create policy "Workflows are insertable by active organization members"
on public.workflows
for insert
to authenticated
with check (public.is_active_member_of_organization(organization_id));

create policy "Workflows are updatable by active organization members"
on public.workflows
for update
to authenticated
using (public.is_active_member_of_organization(organization_id))
with check (public.is_active_member_of_organization(organization_id));

create policy "Workflows are deletable by active organization members"
on public.workflows
for delete
to authenticated
using (public.is_active_member_of_organization(organization_id));

create policy "Workflow steps are viewable by active organization members"
on public.workflow_steps
for select
to authenticated
using (public.is_active_member_of_organization(organization_id));

create policy "Workflow steps are insertable by active organization members"
on public.workflow_steps
for insert
to authenticated
with check (public.is_active_member_of_organization(organization_id));

create policy "Workflow steps are updatable by active organization members"
on public.workflow_steps
for update
to authenticated
using (public.is_active_member_of_organization(organization_id))
with check (public.is_active_member_of_organization(organization_id));

create policy "Workflow steps are deletable by active organization members"
on public.workflow_steps
for delete
to authenticated
using (public.is_active_member_of_organization(organization_id));
