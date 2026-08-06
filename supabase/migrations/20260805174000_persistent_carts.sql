create table public.customer_carts (
  customer_id uuid primary key references public.customers(id) on delete cascade,
  items jsonb not null default '[]'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.customer_carts enable row level security;
