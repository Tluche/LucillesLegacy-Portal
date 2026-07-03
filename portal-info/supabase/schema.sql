-- Lucille's Legacy Client Portal
-- Run this in Supabase SQL Editor after creating your project.

create extension if not exists "uuid-ossp";

create type app_role as enum ('client', 'admin');
create type document_status as enum ('Received', 'Reviewing', 'Needs update');
create type document_category as enum ('Tax', 'Credit', 'Bookkeeping', 'Life Insurance', 'General');
create type appointment_status as enum ('Upcoming', 'Past', 'Cancelled');
create type invoice_status as enum ('Due', 'Paid', 'Scheduled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role app_role not null default 'client',
  full_name text not null,
  phone text,
  email text,
  address text,
  emergency_contact text,
  preferred_contact text default 'Email',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.clients (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  client_number text unique,
  status text not null default 'Active',
  created_at timestamptz not null default now()
);

create table public.services (
  id uuid primary key default uuid_generate_v4(),
  slug text not null unique,
  name text not null,
  stages text[] not null,
  created_at timestamptz not null default now()
);

create table public.client_services (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid not null references public.clients(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  current_stage text not null,
  progress integer not null default 0 check (progress >= 0 and progress <= 100),
  admin_notes text,
  next_step text,
  last_updated timestamptz not null default now(),
  unique (client_id, service_id)
);

create table public.service_status_updates (
  id uuid primary key default uuid_generate_v4(),
  client_service_id uuid not null references public.client_services(id) on delete cascade,
  stage text not null,
  progress integer not null check (progress >= 0 and progress <= 100),
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid not null references public.clients(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  attachment_path text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.documents (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid not null references public.clients(id) on delete cascade,
  uploaded_by uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  storage_path text not null,
  category document_category not null default 'General',
  status document_status not null default 'Received',
  created_at timestamptz not null default now()
);

create table public.appointments (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid not null references public.clients(id) on delete cascade,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  status appointment_status not null default 'Upcoming',
  meeting_url text,
  created_at timestamptz not null default now()
);

create table public.invoices (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid not null references public.clients(id) on delete cascade,
  label text not null,
  amount_cents integer not null default 0,
  due_date date,
  status invoice_status not null default 'Due',
  payment_url text,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid not null references public.clients(id) on delete cascade,
  title text not null,
  body text not null,
  kind text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.resources (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  storage_path text,
  category text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_client_owner(target_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.clients
    where id = target_client_id and profile_id = auth.uid()
  );
$$;

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.services enable row level security;
alter table public.client_services enable row level security;
alter table public.service_status_updates enable row level security;
alter table public.messages enable row level security;
alter table public.documents enable row level security;
alter table public.appointments enable row level security;
alter table public.invoices enable row level security;
alter table public.notifications enable row level security;
alter table public.resources enable row level security;

create policy "Users can read own profile or admins read all"
on public.profiles for select
using (id = auth.uid() or public.is_admin());

create policy "Users can update own profile or admins update all"
on public.profiles for update
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

create policy "Clients read own client row and admins read all"
on public.clients for select
using (profile_id = auth.uid() or public.is_admin());

create policy "Admins manage clients"
on public.clients for all
using (public.is_admin())
with check (public.is_admin());

create policy "Everyone authenticated can read services"
on public.services for select
to authenticated
using (true);

create policy "Admins manage services"
on public.services for all
using (public.is_admin())
with check (public.is_admin());

create policy "Clients read own assigned services and admins read all"
on public.client_services for select
using (public.is_client_owner(client_id) or public.is_admin());

create policy "Admins manage client services"
on public.client_services for all
using (public.is_admin())
with check (public.is_admin());

create policy "Clients read own status updates and admins read all"
on public.service_status_updates for select
using (
  public.is_admin()
  or exists (
    select 1
    from public.client_services cs
    where cs.id = client_service_id
    and public.is_client_owner(cs.client_id)
  )
);

create policy "Admins manage status updates"
on public.service_status_updates for all
using (public.is_admin())
with check (public.is_admin());

create policy "Clients and admins read their client messages"
on public.messages for select
using (public.is_client_owner(client_id) or public.is_admin());

create policy "Clients and admins send messages"
on public.messages for insert
with check (public.is_client_owner(client_id) or public.is_admin());

create policy "Clients and admins read documents"
on public.documents for select
using (public.is_client_owner(client_id) or public.is_admin());

create policy "Clients upload own documents and admins upload any"
on public.documents for insert
with check ((public.is_client_owner(client_id) and uploaded_by = auth.uid()) or public.is_admin());

create policy "Clients delete own documents and admins delete any"
on public.documents for delete
using (public.is_client_owner(client_id) or public.is_admin());

create policy "Clients read own appointments and admins read all"
on public.appointments for select
using (public.is_client_owner(client_id) or public.is_admin());

create policy "Admins manage appointments"
on public.appointments for all
using (public.is_admin())
with check (public.is_admin());

create policy "Clients read own invoices and admins read all"
on public.invoices for select
using (public.is_client_owner(client_id) or public.is_admin());

create policy "Admins manage invoices"
on public.invoices for all
using (public.is_admin())
with check (public.is_admin());

create policy "Clients read own notifications and admins read all"
on public.notifications for select
using (public.is_client_owner(client_id) or public.is_admin());

create policy "Admins manage notifications"
on public.notifications for all
using (public.is_admin())
with check (public.is_admin());

create policy "Authenticated users read active resources"
on public.resources for select
to authenticated
using (is_active = true or public.is_admin());

create policy "Admins manage resources"
on public.resources for all
using (public.is_admin())
with check (public.is_admin());

insert into public.services (slug, name, stages) values
('tax', 'Tax Preparation', array['Intake Complete','Documents Received','Return Being Prepared','Client Review','Filed','IRS Accepted','Refund Issued']),
('credit', 'Credit Support', array['Consultation','Credit Reports Reviewed','Strategy Built','Disputes Submitted','Responses Received','Round 2','Monitoring','Goal Achieved']),
('bookkeeping', 'Bookkeeping', array['Onboarding','Bank Accounts Connected','Categorizing Transactions','Reconciliation','Financial Reports','Monthly Review']),
('life-insurance', 'Life Insurance', array['Consultation','Needs Analysis','Application Submitted','Underwriting','Approval','Policy Issued'])
on conflict (slug) do nothing;

-- Storage setup:
-- Create a private bucket named client-documents in Supabase Storage.
-- Store files as: client-documents/{client_id}/{category}/{filename}
