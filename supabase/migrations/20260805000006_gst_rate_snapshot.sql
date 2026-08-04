-- GST reports recomputed every historical order at the PRODUCT'S CURRENT tax
-- rate — nothing snapshotted what was actually charged at sale time. Correct
-- a product's gst_rate later (a genuinely normal admin action) and every past
-- month's filed CSV silently changes when re-downloaded. Null here means "an
-- order placed before this migration" — the report falls back to the live
-- rate only for those, same as today.

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
