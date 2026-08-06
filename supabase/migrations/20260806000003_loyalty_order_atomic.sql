-- Migration to handle loyalty points redemption and earning

alter table public.orders add column if not exists points_redeemed integer not null default 0;
alter table public.orders add column if not exists points_earned integer not null default 0;

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
  v_customer_id uuid;
  v_subtotal int;
  v_earned int;
begin
  -- Lock the order row; only new orders can be confirmed.
  select customer_id, subtotal into v_customer_id, v_subtotal from orders where id = p_order_id and status = 'new' for update;
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

  v_earned := 0;
  if v_customer_id is not null then
    -- 1 point per rupee of subtotal
    v_earned := v_subtotal;
    update customers set loyalty_points = loyalty_points + v_earned where id = v_customer_id;
  end if;

  update orders set status = 'confirmed', points_earned = v_earned where id = p_order_id;
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
  p_items jsonb,   -- [{product_id, variant_id, name_snapshot, price_snapshot, qty, gst_rate}, ...]
  p_confirm boolean,
  p_bump_coupon_usage boolean default true,
  p_points_redeemed int default 0
)
returns orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order orders;
  v_item jsonb;
  v_current_points int;
begin
  if p_points_redeemed > 0 and p_customer_id is not null then
    select loyalty_points into v_current_points from customers where id = p_customer_id for update;
    if v_current_points < p_points_redeemed then
      raise exception 'insufficient loyalty points';
    end if;
    update customers set loyalty_points = loyalty_points - p_points_redeemed where id = p_customer_id;
  end if;

  insert into orders (
    customer_id, status, payment_method, payment_status,
    subtotal, delivery_fee, discount, coupon_code, total,
    address_snapshot, is_gift, gift_message, delivery_mode, points_redeemed
  ) values (
    p_customer_id, 'new', p_payment_method, p_payment_status,
    p_subtotal, p_delivery_fee, p_discount, p_coupon_code, p_total,
    p_address_snapshot, p_is_gift, p_gift_message,
    coalesce(p_delivery_mode, 'standard'), p_points_redeemed
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
