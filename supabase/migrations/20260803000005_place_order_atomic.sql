-- Atomic checkout: insert order + order_items (+ confirm/decrement stock for
-- COD, + bump coupon usage) as ONE transaction instead of four-to-five
-- sequential client-side calls.
--
-- The previous placeOrder() did: insert order -> insert order_items -> (COD
-- only) rpc confirm_order -> update coupon.used_count -> read back, with a
-- manual "compensating delete" if a later step failed. A serverless function
-- frozen between any two of those steps (a real, documented Vercel behavior
-- this codebase already works around elsewhere — see events.ts) could leave
-- an orphaned order: a row with items but no stock decrement, or with items
-- but no order row if the delete itself silently failed. A single RPC call to
-- a plpgsql function runs as one Postgres transaction: either everything below
-- commits, or an exception (including "insufficient stock" from confirm_order,
-- which this calls in-transaction) rolls back the whole thing automatically —
-- no manual cleanup, no partial state possible.

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
  p_items jsonb,   -- [{product_id, name_snapshot, price_snapshot, qty}, ...]
  -- NOTE: intentionally no variant_id here. order_items.variant_id references
  -- the relational `variants` table from the original schema, but the admin's
  -- variant editor (added later, phase1_updates migration) writes to
  -- products.variants (jsonb) instead — a completely separate id space nothing
  -- in the app ever inserts into `variants`. Sending a jsonb-variant id into
  -- this FK would raise a foreign-key violation on every variant purchase.
  -- Variant choice is instead baked into name_snapshot by resolveLines() in
  -- orders.ts, which is safe and always correct regardless of this drift.
  p_confirm boolean, -- true for COD (decrement stock now); false for Razorpay (webhook confirms later)
  -- The birthday perk has no coupons row (see findCoupon/evaluateCoupon in
  -- catalog.ts) — p_coupon_code still needs to land on the order for display,
  -- but there is no usage counter to bump for it.
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
    insert into order_items (order_id, product_id, name_snapshot, price_snapshot, qty)
    values (
      v_order.id,
      nullif(v_item->>'product_id', '')::uuid,
      v_item->>'name_snapshot',
      (v_item->>'price_snapshot')::int,
      (v_item->>'qty')::int
    );
  end loop;

  if p_coupon_code is not null and p_bump_coupon_usage then
    update coupons set used_count = used_count + 1 where code = p_coupon_code;
  end if;

  -- Runs in the SAME transaction: an insufficient-stock exception here rolls
  -- back the order + order_items inserts above too, not just this step.
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
