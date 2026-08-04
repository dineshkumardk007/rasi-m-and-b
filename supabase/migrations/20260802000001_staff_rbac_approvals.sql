-- Migration: Staff RBAC & Approvals Queue
-- Creates tables for staff accounts management and owner approval queue

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
  status       text not null default 'pending', -- pending, approved, rejected
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz,
  resolved_by  uuid
);

alter table staff_accounts    enable row level security;
alter table pending_approvals enable row level security;

-- Policies for RLS
create policy "staff_accounts staff write" on staff_accounts for all using (is_staff());
create policy "pending_approvals staff write" on pending_approvals for all using (is_staff());

-- The app reads/writes both tables exclusively through the service-role
-- client (see lib/admin-session.ts, lib/data/admin.ts) — RLS policies alone
-- don't grant access; Postgres checks the table-level grant first.
grant all on staff_accounts, pending_approvals to service_role;
