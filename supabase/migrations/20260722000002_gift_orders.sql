-- Gift mode: baby products are heavily gifted (showers, first birthdays), so an
-- order needs to know it is a gift and carry a message for the recipient.
--
-- Both columns are nullable/defaulted so existing orders stay valid.

alter table orders
  add column if not exists is_gift boolean not null default false,
  add column if not exists gift_message text;

-- Keep the note short enough to print on an invoice slip.
alter table orders
  drop constraint if exists orders_gift_message_len;
alter table orders
  add constraint orders_gift_message_len
  check (gift_message is null or char_length(gift_message) <= 300);
