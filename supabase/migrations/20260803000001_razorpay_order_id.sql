-- Bind each RSB order to the Razorpay order created for it.
--
-- Without this column the /api/razorpay/confirm route could not tell WHICH of
-- our orders a given (razorpay_order_id, payment_id, signature) triple was
-- issued for. A valid signature only proves "this payment_id belongs to this
-- razorpay_order_id" — it says nothing about which RSB order_no that maps to.
-- Persisting the id at creation time lets confirm/ verify the signed
-- razorpay_order_id matches the one we stored for this specific order, closing
-- a cross-order replay where one real low-value payment marks another order paid.

alter table orders add column if not exists razorpay_order_id text;
create index if not exists orders_razorpay_order_idx on orders(razorpay_order_id);
