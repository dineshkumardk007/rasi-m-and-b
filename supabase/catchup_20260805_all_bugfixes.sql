-- ═══════════════════════════════════════════════════════════════════════════
-- Catch-up script #4: everything schema-related from BOTH bug-fix passes
-- (Razorpay/staff-RBAC audit + the second high→low severity pass). Combines,
-- in order, migrations 20260805000003 through 20260805000006. If you already
-- ran catchup_20260804c_bugfixes.sql, the first three sections are no-ops —
-- this script is written to be safe to run regardless. Safe to run more than
-- once either way.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 20260805000003_razorpay_payment_id.sql ──────────────────────────────────
alter table orders add column if not exists razorpay_payment_id text;

-- ── 20260805000004_bump_coupon_usage_fn.sql ─────────────────────────────────
create or replace function bump_coupon_usage(p_code text)
returns void
language sql
security definer
set search_path = public
as $$
  update coupons set used_count = used_count + 1 where code = p_code;
$$;

revoke execute on function bump_coupon_usage(text) from anon, authenticated;

-- ── 20260805000005_staff_log_fixes.sql ──────────────────────────────────────
alter table staff_log alter column user_id type text using user_id::text;

drop policy if exists "staff_log insert" on staff_log;

-- ── 20260805000006_gst_rate_snapshot.sql ────────────────────────────────────
alter table order_items add column if not exists gst_rate_snapshot numeric;

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
  p_items jsonb,   -- [{product_id, variant_id, name_snapshot, price_snapshot, qty, gst_rate}, ...]
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
    insert into order_items (order_id, product_id, variant_id, name_snapshot, price_snapshot, qty, gst_rate_snapshot)
    values (
      v_order.id,
      nullif(v_item->>'product_id', '')::uuid,
      nullif(v_item->>'variant_id', ''),
      v_item->>'name_snapshot',
      (v_item->>'price_snapshot')::int,
      (v_item->>'qty')::int,
      nullif(v_item->>'gst_rate', '')::numeric
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
