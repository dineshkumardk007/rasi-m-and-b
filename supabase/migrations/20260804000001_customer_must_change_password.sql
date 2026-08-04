-- An admin-issued temp password must be changed before the customer can use
-- a real session with it (see resetCustomerPassword / signInWithPasswordAction).
alter table public.customers add column if not exists must_change_password boolean not null default false;
