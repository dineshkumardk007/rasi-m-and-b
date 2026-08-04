-- ═══════════════════════════════════════════════════════════════════════════
-- Phase 1 Enhancements Migration
-- Adds product variants JSONB, size chart type, customer addresses
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.products add column if not exists variants jsonb default '[]'::jsonb;
alter table public.products add column if not exists size_chart_type text default 'none';

create table if not exists public.customer_addresses (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  label       text not null default 'Home',
  name        text not null,
  phone       text not null,
  line        text not null,
  city        text not null default 'Thoothukudi',
  pin         text not null check (pin ~ '^[0-9]{6}$'),
  is_default  boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists customer_addresses_customer_idx on public.customer_addresses(customer_id);

alter table public.customer_addresses enable row level security;

-- No policies are defined (every app read/write goes through the service-role
-- client in customer-actions.ts, which bypasses RLS) — RLS-with-no-policy is
-- deny-all for anon/authenticated, which is what we want. But service_role
-- still needs the table-level grant Postgres checks before RLS ever runs.
grant all on public.customer_addresses to service_role;
