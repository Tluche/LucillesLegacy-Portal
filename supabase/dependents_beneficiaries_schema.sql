-- Dependents and Beneficiaries
-- Run this in the Supabase SQL Editor for the Lucille's Legacy project.
-- Adds support for the "Add Dependent" option (Tax) and "Add Beneficiary" option (Life Insurance)
-- on each client's profile in the portal, editable by both admins and the client themselves.

create table public.dependents (
      id uuid primary key default uuid_generate_v4(),
      client_id uuid not null references public.clients(id) on delete cascade,
      full_name text not null,
      date_of_birth date,
      relationship text,
      ssn_last4 text,
      created_at timestamptz not null default now()
    );

create table public.beneficiaries (
      id uuid primary key default uuid_generate_v4(),
      client_id uuid not null references public.clients(id) on delete cascade,
      full_name text not null,
      relationship text,
      allocation_percentage numeric check (allocation_percentage >= 0 and allocation_percentage <= 100),
      contact_info text,
      created_at timestamptz not null default now()
    );

alter table public.dependents enable row level security;
alter table public.beneficiaries enable row level security;

create policy "Clients read own dependents and admins read all"
  on public.dependents for select
  using (public.is_client_owner(client_id) or public.is_admin());

create policy "Clients insert own dependents"
  on public.dependents for insert
  with check (public.is_client_owner(client_id));

create policy "Clients update own dependents"
  on public.dependents for update
  using (public.is_client_owner(client_id))
  with check (public.is_client_owner(client_id));

create policy "Clients delete own dependents"
  on public.dependents for delete
  using (public.is_client_owner(client_id));

create policy "Admins manage dependents"
  on public.dependents for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "Clients read own beneficiaries and admins read all"
  on public.beneficiaries for select
  using (public.is_client_owner(client_id) or public.is_admin());

create policy "Clients insert own beneficiaries"
  on public.beneficiaries for insert
  with check (public.is_client_owner(client_id));

create policy "Clients update own beneficiaries"
  on public.beneficiaries for update
  using (public.is_client_owner(client_id))
  with check (public.is_client_owner(client_id));

create policy "Clients delete own beneficiaries"
  on public.beneficiaries for delete
  using (public.is_client_owner(client_id));

create policy "Admins manage beneficiaries"
  on public.beneficiaries for all
  using (public.is_admin())
  with check (public.is_admin());
