-- ═══════════════════════════════════════════════════════════════════════════
-- Catch-up script #2 (revised): the first version assumed customer_addresses,
-- staff_accounts and pending_approvals already existed and just needed
-- grants. Running it surfaced "relation does not exist" for
-- customer_addresses — those three tables were never actually created live,
-- despite an earlier (flawed) check in this session reporting them as fine.
--
-- This version is fully self-contained: it recreates all three tables with
-- IF NOT EXISTS (safe whether or not they already exist), then grants, then
-- reloads PostgREST's schema cache. Safe to run more than once.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── customer_addresses (from 20260731000001_phase1_updates.sql) ────────────
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

-- ── staff_accounts + pending_approvals (from 20260802000001_staff_rbac_approvals.sql) ─
create table if not exists staff_accounts (
  id            uuid primary key default gen_random_uuid(),
  username      text unique not null,
  phone         text not null default '',
  password_hash text not null,
  role          staff_role not null default 'staff',
  status        text not null default 'active',
  created_at    timestamptz not null default now(),
  last_login_at timestamptz
);

create table if not exists pending_approvals (
  id           uuid primary key default gen_random_uuid(),
  requested_by uuid not null,
  staff_name   text not null,
  action_type  text not null,
  description  text not null,
  payload_json jsonb not null,
  status       text not null default 'pending',
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz,
  resolved_by  uuid
);

alter table staff_accounts    enable row level security;
alter table pending_approvals enable row level security;

drop policy if exists "staff_accounts staff write" on staff_accounts;
create policy "staff_accounts staff write" on staff_accounts for all using (is_staff());
drop policy if exists "pending_approvals staff write" on pending_approvals;
create policy "pending_approvals staff write" on pending_approvals for all using (is_staff());

-- ── Grants ───────────────────────────────────────────────────────────────
-- RLS policies only filter ROWS — Postgres checks table-level GRANTs first.
-- init.sql originally did:
--   alter default privileges in schema public grant all on tables to
--   anon, authenticated, service_role, postgres;
-- but ALTER DEFAULT PRIVILEGES is scoped to the role that runs it — every
-- migration since has been pasted into the SQL editor as a different role,
-- so none of their new tables ever inherited that. RLS (not the table grant)
-- is this project's actual security boundary, matching init.sql's own
-- `grant all on all tables in schema public to anon, authenticated,
-- service_role, postgres` — so re-running that same blanket grant is safe
-- and catches anything else from the same gap that hasn't surfaced yet.
grant all on all tables in schema public to anon, authenticated, service_role, postgres;
grant all on all sequences in schema public to anon, authenticated, service_role, postgres;
grant all on all routines in schema public to anon, authenticated, service_role, postgres;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role, postgres;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role, postgres;
alter default privileges in schema public grant all on routines to anon, authenticated, service_role, postgres;

-- Force PostgREST to re-introspect the schema now, rather than waiting for
-- its own cache to notice.
NOTIFY pgrst, 'reload schema';
