create table public.certifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  certification_code text,
  name text not null,
  issuing_body text,
  status text not null default 'active',
  valid_from date,
  valid_to date,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint certifications_valid_date_range_check check (
    valid_to is null or valid_from is null or valid_to >= valid_from
  ),
  constraint certifications_organization_id_certification_code_key unique (organization_id, certification_code)
);

create table public.compliance_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  standard_name text not null,
  status text not null,
  certification_id uuid references public.certifications (id) on delete set null,
  evidence_document_id uuid references public.documents (id) on delete set null,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index certifications_organization_id_idx
  on public.certifications (organization_id);

create index certifications_status_idx
  on public.certifications (organization_id, status);

create index certifications_valid_to_idx
  on public.certifications (organization_id, valid_to);

create index compliance_records_organization_id_idx
  on public.compliance_records (organization_id);

create index compliance_records_entity_idx
  on public.compliance_records (entity_type, entity_id);

create index compliance_records_standard_name_idx
  on public.compliance_records (organization_id, standard_name);

create index compliance_records_certification_id_idx
  on public.compliance_records (certification_id);

create index compliance_records_evidence_document_id_idx
  on public.compliance_records (evidence_document_id);

create trigger set_certifications_updated_at
before update on public.certifications
for each row
execute function public.set_updated_at();

create trigger set_compliance_records_updated_at
before update on public.compliance_records
for each row
execute function public.set_updated_at();

alter table public.certifications enable row level security;
alter table public.compliance_records enable row level security;

create policy "Certifications are viewable by active organization members"
on public.certifications
for select
to authenticated
using (public.is_active_member_of_organization(organization_id));

create policy "Certifications are insertable by active organization members"
on public.certifications
for insert
to authenticated
with check (public.is_active_member_of_organization(organization_id));

create policy "Certifications are updatable by active organization members"
on public.certifications
for update
to authenticated
using (public.is_active_member_of_organization(organization_id))
with check (public.is_active_member_of_organization(organization_id));

create policy "Certifications are deletable by active organization members"
on public.certifications
for delete
to authenticated
using (public.is_active_member_of_organization(organization_id));

create policy "Compliance records are viewable by active organization members"
on public.compliance_records
for select
to authenticated
using (public.is_active_member_of_organization(organization_id));

create policy "Compliance records are insertable by active organization members"
on public.compliance_records
for insert
to authenticated
with check (public.is_active_member_of_organization(organization_id));

create policy "Compliance records are updatable by active organization members"
on public.compliance_records
for update
to authenticated
using (public.is_active_member_of_organization(organization_id))
with check (public.is_active_member_of_organization(organization_id));

create policy "Compliance records are deletable by active organization members"
on public.compliance_records
for delete
to authenticated
using (public.is_active_member_of_organization(organization_id));
