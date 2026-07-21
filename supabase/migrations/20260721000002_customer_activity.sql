-- Add last_login_at and login_count columns to track daily sign ins & active website users
alter table public.customers add column if not exists last_login_at timestamptz default now();
alter table public.customers add column if not exists login_count integer default 1;
