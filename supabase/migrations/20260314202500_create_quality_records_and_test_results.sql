create table public.quality_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  part_id uuid references public.parts (id) on delete set null,
  record_type text not null,
  title text not null,
  status text not null default 'open',
  description text,
  owner_user_id uuid references public.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.test_results (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  quality_record_id uuid references public.quality_records (id) on delete set null,
  product_revision_id uuid references public.product_revisions (id) on delete set null,
  part_revision_id uuid references public.part_revisions (id) on delete set null,
  test_name text not null,
  result_status text not null,
  measured_value text,
  unit text,
  executed_at timestamptz,
  executed_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index quality_records_organization_id_idx
  on public.quality_records (organization_id);

create index quality_records_product_id_idx
  on public.quality_records (product_id);

create index quality_records_part_id_idx
  on public.quality_records (part_id);

create index quality_records_owner_user_id_idx
  on public.quality_records (owner_user_id);

create index quality_records_status_idx
  on public.quality_records (organization_id, status);

create index test_results_organization_id_idx
  on public.test_results (organization_id);

create index test_results_quality_record_id_idx
  on public.test_results (quality_record_id);

create index test_results_product_revision_id_idx
  on public.test_results (product_revision_id);

create index test_results_part_revision_id_idx
  on public.test_results (part_revision_id);

create index test_results_executed_by_idx
  on public.test_results (executed_by);

create index test_results_result_status_idx
  on public.test_results (organization_id, result_status);

create trigger set_quality_records_updated_at
before update on public.quality_records
for each row
execute function public.set_updated_at();

create trigger set_test_results_updated_at
before update on public.test_results
for each row
execute function public.set_updated_at();

alter table public.quality_records enable row level security;
alter table public.test_results enable row level security;

create policy "Quality records are viewable by active organization members"
on public.quality_records
for select
to authenticated
using (public.is_active_member_of_organization(organization_id));

create policy "Quality records are insertable by active organization members"
on public.quality_records
for insert
to authenticated
with check (public.is_active_member_of_organization(organization_id));

create policy "Quality records are updatable by active organization members"
on public.quality_records
for update
to authenticated
using (public.is_active_member_of_organization(organization_id))
with check (public.is_active_member_of_organization(organization_id));

create policy "Quality records are deletable by active organization members"
on public.quality_records
for delete
to authenticated
using (public.is_active_member_of_organization(organization_id));

create policy "Test results are viewable by active organization members"
on public.test_results
for select
to authenticated
using (public.is_active_member_of_organization(organization_id));

create policy "Test results are insertable by active organization members"
on public.test_results
for insert
to authenticated
with check (public.is_active_member_of_organization(organization_id));

create policy "Test results are updatable by active organization members"
on public.test_results
for update
to authenticated
using (public.is_active_member_of_organization(organization_id))
with check (public.is_active_member_of_organization(organization_id));

create policy "Test results are deletable by active organization members"
on public.test_results
for delete
to authenticated
using (public.is_active_member_of_organization(organization_id));
