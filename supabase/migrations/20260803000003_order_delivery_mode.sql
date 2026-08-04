-- Persist the delivery mode a customer chose at checkout (standard / 3-hour
-- express / store pickup). Previously accepted in PlaceOrderInput and shown on
-- the confirmation screen, but never written to the orders row in live mode —
-- staff had no way to see from an order that a customer requested store pickup
-- rather than delivery. Demo mode already tracked this in memory; this brings
-- the real database in line with it.

alter table orders
  add column if not exists delivery_mode text not null default 'standard'
  check (delivery_mode in ('standard', 'express_3hr', 'store_pickup'));
