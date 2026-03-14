create table public.change_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  change_number text not null,
  title text not null,
  description text,
  reason text,
  impact_summary text,
  workflow_id uuid references public.workflows (id) on delete set null,
  status text not null default 'draft',
  requested_by uuid not null references public.users (id) on delete restrict,
  submitted_at timestamptz,
  approved_at timestamptz,
  released_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint change_requests_organization_id_change_number_key unique (organization_id, change_number)
);

create table public.change_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  change_request_id uuid not null references public.change_requests (id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  change_action text not null,
  before_revision text,
  after_revision text,
  notes text,
  created_at timestamptz not null default timezone('utc', now())
);

create index change_requests_organization_id_idx
  on public.change_requests (organization_id);

create index change_requests_workflow_id_idx
  on public.change_requests (workflow_id);

create index change_requests_requested_by_idx
  on public.change_requests (requested_by);

create index change_requests_status_idx
  on public.change_requests (organization_id, status);

create index change_items_organization_id_idx
  on public.change_items (organization_id);

create index change_items_change_request_id_idx
  on public.change_items (change_request_id);

create index change_items_entity_idx
  on public.change_items (entity_type, entity_id);

create trigger set_change_requests_updated_at
before update on public.change_requests
for each row
execute function public.set_updated_at();

alter table public.change_requests enable row level security;
alter table public.change_items enable row level security;

create policy "Change requests are viewable by active organization members"
on public.change_requests
for select
to authenticated
using (public.is_active_member_of_organization(organization_id));

create policy "Change requests are insertable by active organization members"
on public.change_requests
for insert
to authenticated
with check (public.is_active_member_of_organization(organization_id));

create policy "Change requests are updatable by active organization members"
on public.change_requests
for update
to authenticated
using (public.is_active_member_of_organization(organization_id))
with check (public.is_active_member_of_organization(organization_id));

create policy "Change requests are deletable by active organization members"
on public.change_requests
for delete
to authenticated
using (public.is_active_member_of_organization(organization_id));

create policy "Change items are viewable by active organization members"
on public.change_items
for select
to authenticated
using (public.is_active_member_of_organization(organization_id));

create policy "Change items are insertable by active organization members"
on public.change_items
for insert
to authenticated
with check (public.is_active_member_of_organization(organization_id));

create policy "Change items are updatable by active organization members"
on public.change_items
for update
to authenticated
using (public.is_active_member_of_organization(organization_id))
with check (public.is_active_member_of_organization(organization_id));

create policy "Change items are deletable by active organization members"
on public.change_items
for delete
to authenticated
using (public.is_active_member_of_organization(organization_id));
