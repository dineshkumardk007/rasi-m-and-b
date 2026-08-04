-- ═══════════════════════════════════════════════════════════════════════════
-- Catch-up script: applies migrations confirmed MISSING or PARTIAL on the
-- live database, verified directly via the service-role key on 2026-08-04.
-- Safe to run more than once (every statement is idempotent).
--
-- Combines, in dependency order:
--   20260722000002_gift_orders.sql               (missing entirely)
--   20260730000001_merchandising.sql              (partially applied)
--   20260804000001_customer_must_change_password.sql (missing entirely)
--   20260805000001_variant_stock.sql               (missing entirely)
--   20260805000002_cleanup_cron.sql          (missing entirely; fixed a
--                                              first_attempt -> first_at
--                                              column name bug while at it)
--
-- After running this in the Supabase SQL editor, the individual migration
-- files above are already up to date in the repo and match what this
-- script applies -- no further action needed there.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 20260722000002_gift_orders.sql ──────────────────────────────────────────
alter table orders
  add column if not exists is_gift boolean not null default false,
  add column if not exists gift_message text;

alter table orders
  drop constraint if exists orders_gift_message_len;
alter table orders
  add constraint orders_gift_message_len
  check (gift_message is null or char_length(gift_message) <= 300);

-- ── 20260730000001_merchandising.sql ────────────────────────────────────────
create table if not exists banners (
  id         uuid primary key default gen_random_uuid(),
  slot       text not null check (slot in ('hero', 'mid')),
  image_url  text not null,
  alt        text not null default '',
  link_url   text,
  sort       int not null default 0,
  starts_at  timestamptz,
  ends_at    timestamptz,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists banners_slot_idx on banners(slot, sort) where active;

create table if not exists brands (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique,
  logo_url   text not null,
  sort       int not null default 0,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

alter table products add column if not exists brand_id uuid references brands(id) on delete set null;
create index if not exists products_brand_idx on products(brand_id) where status = 'active';

alter table coupons add column if not exists featured boolean not null default false;

alter table banners enable row level security;
alter table brands  enable row level security;

drop policy if exists "banners public read" on banners;
create policy "banners public read" on banners for select
  using (
    is_staff()
    or (
      active
      and (starts_at is null or starts_at <= now())
      and (ends_at is null or ends_at >= now())
    )
  );
drop policy if exists "banners staff write" on banners;
create policy "banners staff write" on banners for all
  using (is_staff()) with check (is_staff());

drop policy if exists "brands public read" on brands;
create policy "brands public read" on brands for select
  using (active or is_staff());
drop policy if exists "brands staff write" on brands;
create policy "brands staff write" on brands for all
  using (is_staff()) with check (is_staff());

-- ── 20260804000001_customer_must_change_password.sql ───────────────────────
alter table public.customers add column if not exists must_change_password boolean not null default false;

-- ── 20260805000001_variant_stock.sql ────────────────────────────────────────
alter table order_items drop constraint if exists order_items_variant_id_fkey;
alter table order_items alter column variant_id type text using variant_id::text;

create or replace function confirm_order(p_order_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  item record;
  v_prod record;
  v_elem jsonb;
  v_new_variants jsonb;
  v_found boolean;
  v_vstock int;
begin
  perform 1 from orders where id = p_order_id and status = 'new' for update;
  if not found then
    raise exception 'order % is not in a confirmable state', p_order_id;
  end if;

  for item in
    select oi.product_id, oi.variant_id, oi.qty
    from order_items oi where oi.order_id = p_order_id
  loop
    if item.product_id is not null then
      select id, stock, variants into v_prod from products where id = item.product_id for update;
      if not found then
        raise exception 'product % not found', item.product_id;
      end if;

      if v_prod.stock < item.qty then
        raise exception 'insufficient stock for product % (order %)', item.product_id, p_order_id;
      end if;

      if item.variant_id is not null and item.variant_id <> '' and v_prod.variants is not null and jsonb_array_length(v_prod.variants) > 0 then
        v_found := false;
        v_new_variants := '[]'::jsonb;
        for v_elem in select * from jsonb_array_elements(v_prod.variants)
        loop
          if (v_elem->>'id') = item.variant_id then
            v_found := true;
            v_vstock := coalesce((v_elem->>'stock')::int, 0);
            if v_vstock < item.qty then
              raise exception 'insufficient stock for variant % in product % (order %)', item.variant_id, item.product_id, p_order_id;
            end if;
            v_elem := jsonb_set(v_elem, '{stock}', to_jsonb(v_vstock - item.qty));
          end if;
          v_new_variants := v_new_variants || jsonb_build_array(v_elem);
        end loop;

        update products set stock = stock - item.qty, variants = v_new_variants where id = item.product_id;
      else
        update products set stock = stock - item.qty where id = item.product_id;
      end if;
    end if;
  end loop;

  update orders set status = 'confirmed' where id = p_order_id;
end;
$$;

create or replace function place_order_atomic(
  p_customer_id uuid,
  p_payment_method payment_method,
  p_payment_status payment_status,
  p_subtotal int,
  p_delivery_fee int,
  p_discount int,
  p_coupon_code text,
  p_total int,
  p_address_snapshot jsonb,
  p_is_gift boolean,
  p_gift_message text,
  p_delivery_mode text,
  p_items jsonb,
  p_confirm boolean,
  p_bump_coupon_usage boolean default true
)
returns orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order orders;
  v_item jsonb;
begin
  insert into orders (
    customer_id, status, payment_method, payment_status,
    subtotal, delivery_fee, discount, coupon_code, total,
    address_snapshot, is_gift, gift_message, delivery_mode
  ) values (
    p_customer_id, 'new', p_payment_method, p_payment_status,
    p_subtotal, p_delivery_fee, p_discount, p_coupon_code, p_total,
    p_address_snapshot, p_is_gift, p_gift_message,
    coalesce(p_delivery_mode, 'standard')
  ) returning * into v_order;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    insert into order_items (order_id, product_id, variant_id, name_snapshot, price_snapshot, qty)
    values (
      v_order.id,
      nullif(v_item->>'product_id', '')::uuid,
      nullif(v_item->>'variant_id', ''),
      v_item->>'name_snapshot',
      (v_item->>'price_snapshot')::int,
      (v_item->>'qty')::int
    );
  end loop;

  if p_coupon_code is not null and p_bump_coupon_usage then
    update coupons set used_count = used_count + 1 where code = p_coupon_code;
  end if;

  if p_confirm then
    perform confirm_order(v_order.id);
  end if;

  select * into v_order from orders where id = v_order.id;
  return v_order;
end;
$$;

revoke execute on function place_order_atomic(
  uuid, payment_method, payment_status, int, int, int, text, int, jsonb,
  boolean, text, text, jsonb, boolean, boolean
) from anon, authenticated;

-- ── 20260805000002_cleanup_cron.sql (fixed: first_attempt -> first_at) ─────
CREATE OR REPLACE FUNCTION purge_stale_rate_limits(p_older_than_seconds integer DEFAULT 86400)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted integer;
BEGIN
  DELETE FROM admin_login_attempts
  WHERE first_at < (NOW() - (p_older_than_seconds || ' seconds')::interval);

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;
