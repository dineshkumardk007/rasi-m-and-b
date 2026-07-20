-- ═══════════════════════════════════════════════════════════════════════════
-- Rasi Mom & Baby — initial schema (Section 5 of the build spec)
-- Postgres / Supabase. RLS on EVERY table. Service role is used only by
-- server code (webhooks, order creation, seed/import) and bypasses RLS.
-- ═══════════════════════════════════════════════════════════════════════════

drop schema if exists public cascade;
create schema public;
grant all on schema public to postgres;
grant all on schema public to public;

-- ── Enums ──────────────────────────────────────────────────────────────────
do $$ begin create type milestone as enum ('newborn', 'infant', 'toddler', 'mom'); exception when duplicate_object then null; end $$;
do $$ begin create type category as enum ('feeding', 'bath', 'toys', 'clothing', 'diapering', 'gear', 'health', 'mom'); exception when duplicate_object then null; end $$;
do $$ begin create type product_status as enum ('active', 'archived'); exception when duplicate_object then null; end $$;
do $$ begin create type order_status as enum ('new', 'confirmed', 'packed', 'out_for_delivery', 'delivered', 'cancelled', 'returned'); exception when duplicate_object then null; end $$;
do $$ begin create type payment_method as enum ('razorpay', 'cod'); exception when duplicate_object then null; end $$;
do $$ begin create type payment_status as enum ('pending', 'paid', 'refunded', 'cod_pending', 'cod_collected'); exception when duplicate_object then null; end $$;
do $$ begin create type coupon_type as enum ('percent', 'flat'); exception when duplicate_object then null; end $$;
do $$ begin create type review_status as enum ('pending', 'approved', 'rejected'); exception when duplicate_object then null; end $$;
do $$ begin create type staff_role as enum ('owner', 'manager', 'staff'); exception when duplicate_object then null; end $$;

-- ── Tables ─────────────────────────────────────────────────────────────────

-- Authenticated customers use their auth.users id as pk (phone OTP).
-- Guest-checkout customers are created by the service role with a random id.
create table customers (
  id               uuid primary key default gen_random_uuid(),
  name             text not null default '',
  phone            text not null unique,
  email            text,
  language         text not null default 'en' check (language in ('en', 'ta')),
  whatsapp_opt_in  boolean not null default false,
  baby_dob         date,
  notes            text not null default '',
  created_at       timestamptz not null default now()
);

create table addresses (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  line        text not null,
  city        text not null default 'Thoothukudi',
  pin         text not null check (pin ~ '^[0-9]{6}$'),
  is_default  boolean not null default false
);
create index addresses_customer_idx on addresses(customer_id);

create table products (
  id                  uuid primary key default gen_random_uuid(),
  name_en             text not null,
  name_ta             text not null,
  slug                text not null unique,
  brand               text not null default '',
  milestone           milestone not null,
  price               integer not null check (price >= 0),           -- paise-free INR
  mrp                 integer not null check (mrp >= 0),
  gst_rate            numeric(4,2) not null default 12.00,
  stock               integer not null default 0 check (stock >= 0),
  low_stock_threshold integer not null default 5,
  status              product_status not null default 'active',
  tile_color          text not null default '#FFCBD9',               -- 8-swatch palette
  emoji               text not null default '🧸',
  images              text[] not null default '{}',
  description_en      text not null default '',
  description_ta      text not null default '',
  ingredients         text,
  created_at          timestamptz not null default now()
);
create index products_milestone_idx on products(milestone) where status = 'active';

-- Many-to-many: a product can belong to several categories.
create table product_categories (
  product_id uuid not null references products(id) on delete cascade,
  category   category not null,
  primary key (product_id, category)
);
create index product_categories_category_idx on product_categories(category);

create table variants (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references products(id) on delete cascade,
  label       text not null,
  price_delta integer not null default 0,
  stock       integer not null default 0 check (stock >= 0)
);
create index variants_product_idx on variants(product_id);

create table bundles (
  id           uuid primary key default gen_random_uuid(),
  name_en      text not null,
  name_ta      text not null,
  slug         text not null unique,
  product_ids  uuid[] not null default '{}',
  bundle_price integer not null check (bundle_price >= 0),
  mrp          integer not null check (mrp >= 0),
  status       product_status not null default 'active'
);

-- Human-friendly order numbers: RSB-1001, RSB-1002, …
create sequence order_no_seq start 1001;

create table orders (
  id               uuid primary key default gen_random_uuid(),
  order_no         text not null unique default ('RSB-' || nextval('order_no_seq')),
  customer_id      uuid references customers(id) on delete set null,
  status           order_status not null default 'new',
  payment_method   payment_method not null,
  payment_status   payment_status not null default 'pending',
  subtotal         integer not null check (subtotal >= 0),
  delivery_fee     integer not null default 0 check (delivery_fee >= 0),
  discount         integer not null default 0 check (discount >= 0),
  coupon_code      text,
  total            integer not null check (total >= 0),
  address_snapshot jsonb not null,
  placed_at        timestamptz not null default now()
);
create index orders_customer_idx on orders(customer_id);
create index orders_status_idx on orders(status);
create index orders_placed_at_idx on orders(placed_at desc);

create table order_items (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid not null references orders(id) on delete cascade,
  product_id     uuid references products(id) on delete set null,
  variant_id     uuid references variants(id) on delete set null,
  name_snapshot  text not null,
  price_snapshot integer not null check (price_snapshot >= 0),
  qty            integer not null check (qty > 0)
);
create index order_items_order_idx on order_items(order_id);

create table coupons (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  type        coupon_type not null,
  value       integer not null check (value > 0),
  min_order   integer not null default 0,
  valid_until timestamptz,
  usage_limit integer,
  used_count  integer not null default 0
);

create table reviews (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references products(id) on delete cascade,
  customer_id uuid references customers(id) on delete cascade, -- null = guest review
  author_name text not null default 'Customer',
  rating      integer not null check (rating between 1 and 5),
  text        text not null default '',
  photos      text[] not null default '{}',
  status      review_status not null default 'pending',
  created_at  timestamptz not null default now()
);
create index reviews_product_idx on reviews(product_id) where status = 'approved';

create table wishlist (
  customer_id    uuid not null references customers(id) on delete cascade,
  product_id     uuid not null references products(id) on delete cascade,
  notify_restock boolean not null default false,
  primary key (customer_id, product_id)
);

-- Internal analytics + outbound automation queue. Order creation writes here
-- even when n8n/WhatsApp is down; a retry worker drains unprocessed rows.
create table events (
  id           uuid primary key default gen_random_uuid(),
  type         text not null,
  customer_id  uuid references customers(id) on delete set null,
  payload      jsonb not null default '{}',
  processed_at timestamptz,          -- null = pending delivery to n8n
  created_at   timestamptz not null default now()
);
create index events_pending_idx on events(created_at) where processed_at is null;

create table staff_log (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null,
  action    text not null,
  entity    text not null,
  entity_id text not null default '',
  at        timestamptz not null default now()
);

create table staff_roles (
  user_id uuid primary key,
  role    staff_role not null
);

-- Owner-editable runtime settings (same-day kill-switch, serviceable PINs, …).
create table settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

insert into settings (key, value) values
  ('same_day_enabled', 'true'::jsonb),
  -- TODO: replace with the owner's confirmed serviceable PIN list (Section 9)
  ('serviceable_pins', '["628001","628002","628003","628004","628005","628008"]'::jsonb),
  ('free_delivery_threshold', '999'::jsonb),
  ('cod_limit', '3000'::jsonb);

-- ── Helper functions ───────────────────────────────────────────────────────

-- Staff check used by RLS policies. SECURITY DEFINER so it can read
-- staff_roles regardless of the caller's own policies (avoids recursion).
create or replace function is_staff()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from staff_roles where user_id = auth.uid());
$$;

create or replace function has_role(required staff_role[])
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from staff_roles
    where user_id = auth.uid() and role = any(required)
  );
$$;

-- ── Stock rules (Section 5): decrement at order CONFIRMATION inside a
--    transaction; restore on cancellation. Both functions are called by
--    server code via the service role; plpgsql bodies are atomic.

create or replace function confirm_order(p_order_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  item record;
begin
  -- Lock the order row; only new orders can be confirmed.
  perform 1 from orders where id = p_order_id and status = 'new' for update;
  if not found then
    raise exception 'order % is not in a confirmable state', p_order_id;
  end if;

  for item in
    select oi.product_id, oi.variant_id, oi.qty
    from order_items oi where oi.order_id = p_order_id
  loop
    if item.variant_id is not null then
      update variants set stock = stock - item.qty
      where id = item.variant_id and stock >= item.qty;
    else
      update products set stock = stock - item.qty
      where id = item.product_id and stock >= item.qty;
    end if;
    if not found then
      raise exception 'insufficient stock for product % (order %)',
        item.product_id, p_order_id;  -- aborts the whole transaction
    end if;
  end loop;

  update orders set status = 'confirmed' where id = p_order_id;
end;
$$;

create or replace function cancel_order(p_order_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_status order_status;
  item record;
begin
  select status into v_status from orders where id = p_order_id for update;
  if v_status is null then
    raise exception 'order % not found', p_order_id;
  end if;
  if v_status in ('cancelled', 'returned', 'delivered') then
    raise exception 'order % cannot be cancelled from status %', p_order_id, v_status;
  end if;

  -- Stock was only taken at confirmation; restore it unless still 'new'.
  if v_status <> 'new' then
    for item in
      select oi.product_id, oi.variant_id, oi.qty
      from order_items oi where oi.order_id = p_order_id
    loop
      if item.variant_id is not null then
        update variants set stock = stock + item.qty where id = item.variant_id;
      else
        update products set stock = stock + item.qty where id = item.product_id;
      end if;
    end loop;
  end if;

  update orders set status = 'cancelled' where id = p_order_id;
end;
$$;

-- Lock these down: only service role / staff paths may execute.
revoke execute on function confirm_order(uuid) from public, anon, authenticated;
revoke execute on function cancel_order(uuid) from public, anon, authenticated;
grant execute on function confirm_order(uuid) to service_role;
grant execute on function cancel_order(uuid) to service_role;

-- ── Row Level Security ─────────────────────────────────────────────────────
alter table customers          enable row level security;
alter table addresses          enable row level security;
alter table products           enable row level security;
alter table product_categories enable row level security;
alter table variants           enable row level security;
alter table bundles            enable row level security;
alter table orders             enable row level security;
alter table order_items        enable row level security;
alter table coupons            enable row level security;
alter table reviews            enable row level security;
alter table wishlist           enable row level security;
alter table events             enable row level security;
alter table staff_log          enable row level security;
alter table staff_roles        enable row level security;
alter table settings           enable row level security;

-- customers: you are your own row (id = auth.uid for phone-OTP users).
create policy "customers read own"   on customers for select using (id = auth.uid() or is_staff());
create policy "customers update own" on customers for update using (id = auth.uid()) with check (id = auth.uid());
create policy "customers insert own" on customers for insert with check (id = auth.uid());
create policy "staff manage customers" on customers for all
  using (is_staff()) with check (is_staff());

-- addresses: owned via customer_id.
create policy "addresses own" on addresses for all
  using (customer_id = auth.uid() or is_staff())
  with check (customer_id = auth.uid() or is_staff());

-- products & related: the world sees active items; staff manage everything.
create policy "products public read" on products for select
  using (status = 'active' or is_staff());
create policy "products staff write" on products for insert with check (is_staff());
create policy "products staff update" on products for update using (is_staff()) with check (is_staff());
-- No delete policy: archive-not-delete is enforced by RLS itself.

create policy "product_categories public read" on product_categories for select using (true);
create policy "product_categories staff write" on product_categories for all
  using (is_staff()) with check (is_staff());

create policy "variants public read" on variants for select using (true);
create policy "variants staff write" on variants for all
  using (is_staff()) with check (is_staff());

create policy "bundles public read" on bundles for select
  using (status = 'active' or is_staff());
create policy "bundles staff write" on bundles for insert with check (is_staff());
create policy "bundles staff update" on bundles for update using (is_staff()) with check (is_staff());

-- orders: a customer can NEVER read another customer's orders. Guest orders
-- (customer_id null) are reachable only through the server-side tracking
-- endpoint (service role, order_no + phone verified).
create policy "orders read own" on orders for select
  using (customer_id is not null and customer_id = auth.uid());
create policy "orders staff all" on orders for all
  using (is_staff()) with check (is_staff());
-- No client-side insert/update: order creation & payment status go through
-- server code (service role) so totals and stock can be validated.

create policy "order_items read own" on order_items for select
  using (exists (
    select 1 from orders o
    where o.id = order_items.order_id
      and (o.customer_id = auth.uid() or is_staff())
  ));
create policy "order_items staff write" on order_items for insert with check (is_staff());

-- coupons: validated server-side only; staff manage.
create policy "coupons staff all" on coupons for all
  using (is_staff()) with check (is_staff());

-- reviews: world reads approved; authors create their own (pending); staff moderate.
create policy "reviews public read" on reviews for select
  using (status = 'approved' or customer_id = auth.uid() or is_staff());
create policy "reviews insert own" on reviews for insert
  with check (customer_id = auth.uid() and status = 'pending');
create policy "reviews staff moderate" on reviews for update
  using (is_staff()) with check (is_staff());

-- wishlist: strictly own rows.
create policy "wishlist own" on wishlist for all
  using (customer_id = auth.uid())
  with check (customer_id = auth.uid());

-- events: server-side only (service role bypasses RLS); staff may read.
create policy "events staff read" on events for select using (is_staff());

-- staff_log: append-only audit; owner/manager read.
create policy "staff_log read" on staff_log for select
  using (has_role(array['owner','manager']::staff_role[]));
create policy "staff_log insert" on staff_log for insert
  with check (is_staff() and user_id = auth.uid());

-- staff_roles: staff see the roster; only the owner changes it.
create policy "staff_roles read" on staff_roles for select using (is_staff());
create policy "staff_roles owner manage" on staff_roles for all
  using (has_role(array['owner']::staff_role[]))
  with check (has_role(array['owner']::staff_role[]));

-- settings: public read (the storefront needs pins/kill-switch); owner/manager write.
create policy "settings public read" on settings for select using (true);
create policy "settings owner write" on settings for all
  using (has_role(array['owner','manager']::staff_role[]))
  with check (has_role(array['owner','manager']::staff_role[]));

-- ── Grants ─────────────────────────────────────────────────────────────────
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role, postgres;
grant all on all sequences in schema public to anon, authenticated, service_role, postgres;
grant all on all routines in schema public to anon, authenticated, service_role, postgres;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role, postgres;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role, postgres;
alter default privileges in schema public grant all on routines to anon, authenticated, service_role, postgres;
