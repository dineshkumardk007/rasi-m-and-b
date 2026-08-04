-- Persist the captured payment's id, not just the order id.
--
-- razorpay_order_id (added earlier) identifies the payment SESSION Razorpay
-- issued at checkout; it is not what the Refund API takes. Without the actual
-- payment id on file, admin.refundOrder() had no id to refund against and
-- silently fell through to just marking the order "refunded" in our own DB —
-- no money ever moved. This column is set once payment.captured/confirm
-- actually happens, and is what a real refund call uses.

alter table orders add column if not exists razorpay_payment_id text;
