-- Migration to support n8n abandoned cart recovery

alter table public.customer_carts add column if not exists last_reminded_at timestamp with time zone;

create or replace view public.abandoned_carts_queue as
select
  c.id as customer_id,
  c.name as customer_name,
  c.phone as customer_phone,
  c.language as customer_language,
  cc.items as cart_items,
  cc.updated_at as cart_updated_at
from public.customer_carts cc
join public.customers c on cc.customer_id = c.id
where 
  jsonb_array_length(cc.items) > 0 
  and cc.updated_at < now() - interval '2 hours'
  and (cc.last_reminded_at is null or cc.last_reminded_at < cc.updated_at);

create or replace function public.mark_cart_reminded(p_customer_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.customer_carts 
  set last_reminded_at = now() 
  where customer_id = p_customer_id;
end;
$$;
