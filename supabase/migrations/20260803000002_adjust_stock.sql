-- Atomic stock adjustment.
--
-- updateProductStock() and quickRestockProduct() previously did a
-- read-then-write (SELECT stock → newStock = stock + delta → UPDATE stock =
-- newStock) in application code. That reintroduces exactly the lost-update race
-- the schema's confirm_order() function uses row locking to avoid: an admin
-- restock running concurrently with an order confirmation can stomp the other's
-- write. Doing the arithmetic in a single UPDATE statement makes it atomic — the
-- row is locked for the duration of the statement, so concurrent adjustments
-- serialize instead of racing.

create or replace function adjust_product_stock(p_id uuid, p_delta int)
returns int
language sql
as $$
  update products
     set stock = greatest(0, stock + p_delta)
   where id = p_id
  returning stock;
$$;

-- Only the service-role path (admin actions) should call this directly.
revoke execute on function adjust_product_stock(uuid, int) from anon, authenticated;
