-- Lucille's Legacy Client Portal
-- Billing & Payments (Stripe) schema addition
-- Run this in the Supabase SQL Editor AFTER supabase/schema.sql has already been run once.

-- Extend invoice_status with the additional states the Billing & Payments UI needs.
alter type invoice_status add value if not exists 'Partial';
alter type invoice_status add value if not exists 'Overdue';
alter type invoice_status add value if not exists 'Cancelled';
alter type invoice_status add value if not exists 'Refunded';

-- Store only the Stripe Customer ID on the client record. No card data is ever stored.
alter table public.clients add column if not exists stripe_customer_id text unique;

-- Extend invoices with the fields the new billing module needs.
alter table public.invoices add column if not exists invoice_number text unique;
alter table public.invoices add column if not exists service text;
alter table public.invoices add column if not exists amount_paid_cents integer not null default 0;
alter table public.invoices add column if not exists paid_at timestamptz;
alter table public.invoices add column if not exists stripe_checkout_session_id text;
alter table public.invoices add column if not exists stripe_payment_intent_id text;
alter table public.invoices add column if not exists notes text;

create sequence if not exists public.invoice_number_seq start 1001;

create or replace function public.set_invoice_number()
returns trigger
language plpgsql
as $$
begin
  if new.invoice_number is null then
    new.invoice_number := 'INV-' || nextval('public.invoice_number_seq');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_invoice_number on public.invoices;
create trigger trg_set_invoice_number
before insert on public.invoices
for each row execute function public.set_invoice_number();

-- Payment history (every completed/failed/refunded Stripe transaction).
create table if not exists public.payments (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid not null references public.clients(id) on delete cascade,
  invoice_id uuid references public.invoices(id) on delete set null,
  stripe_payment_intent_id text,
  stripe_checkout_session_id text,
  amount_cents integer not null default 0,
  currency text not null default 'usd',
  status text not null default 'succeeded',
  payment_method_summary text,
  confirmation_number text,
  receipt_url text,
  created_at timestamptz not null default now()
);

-- Saved payment methods. Stripe hosts the actual card; we only keep display info + the Stripe reference id.
create table if not exists public.payment_methods (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid not null references public.clients(id) on delete cascade,
  stripe_payment_method_id text not null,
  brand text,
  last4 text,
  exp_month integer,
  exp_year integer,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

-- Membership / recurring subscription architecture (not activated in v1, ready for later).
create table if not exists public.memberships (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid not null references public.clients(id) on delete cascade,
  plan_name text not null,
  stripe_subscription_id text,
  stripe_price_id text,
  status text not null default 'inactive',
  current_period_end timestamptz,
  created_at timestamptz not null default now()
);

-- Stripe webhook event log, used for idempotency + an audit trail of everything Stripe sent us.
create table if not exists public.billing_events (
  id uuid primary key default uuid_generate_v4(),
  stripe_event_id text unique not null,
  type text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

alter table public.payments enable row level security;
alter table public.payment_methods enable row level security;
alter table public.memberships enable row level security;
alter table public.billing_events enable row level security;

drop policy if exists "Clients read own payments and admins read all" on public.payments;
create policy "Clients read own payments and admins read all"
on public.payments for select
using (public.is_client_owner(client_id) or public.is_admin());

drop policy if exists "Admins manage payments" on public.payments;
create policy "Admins manage payments"
on public.payments for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Clients read own payment methods and admins read all" on public.payment_methods;
create policy "Clients read own payment methods and admins read all"
on public.payment_methods for select
using (public.is_client_owner(client_id) or public.is_admin());

drop policy if exists "Admins manage payment methods" on public.payment_methods;
create policy "Admins manage payment methods"
on public.payment_methods for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Clients read own memberships and admins read all" on public.memberships;
create policy "Clients read own memberships and admins read all"
on public.memberships for select
using (public.is_client_owner(client_id) or public.is_admin());

drop policy if exists "Admins manage memberships" on public.memberships;
create policy "Admins manage memberships"
on public.memberships for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins manage billing events" on public.billing_events;
create policy "Admins manage billing events"
on public.billing_events for all
using (public.is_admin())
with check (public.is_admin());
