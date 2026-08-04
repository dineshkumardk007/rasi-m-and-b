-- place_order_atomic bumped a Razorpay order's coupon usage at PLACEMENT
-- time (p_bump_coupon_usage), before any payment happened — every abandoned
-- or retried checkout burned a real use of a possibly limited-quantity
-- coupon. Coupon usage for online payments now bumps only once the webhook
-- (or the client-confirm fallback) actually confirms payment, alongside the
-- existing confirm_order() call. This is the atomic increment those routes
-- call for that.

create or replace function bump_coupon_usage(p_code text)
returns void
language sql
security definer
set search_path = public
as $$
  update coupons set used_count = used_count + 1 where code = p_code;
$$;

revoke execute on function bump_coupon_usage(text) from anon, authenticated;
