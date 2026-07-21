-- Add password column to customers table for phone + password authentication
alter table public.customers add column if not exists password text;
