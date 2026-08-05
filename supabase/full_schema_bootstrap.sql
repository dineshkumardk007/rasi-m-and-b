-- ═══════════════════════════════════════════════════════════════════════════
-- Full schema bootstrap — every migration combined, in order, for a fresh
-- Supabase project (e.g. a client handoff). Paste this whole file into that
-- project's SQL Editor and run it once. Safe to run only on a genuinely empty
-- project — this is NOT an incremental catchup script, it assumes nothing
-- exists yet.
--
-- Generated from supabase/migrations/*.sql on 2026-08-05 — if you add
-- new migration files after this date, regenerate rather than hand-editing.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 20260720000001_init.sql ──────────────────────────────────────────────────────────────

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

-- ── 20260720000002_storage.sql ──────────────────────────────────────────────────────────────

-- Product images bucket: public read, staff-only write (Phase 3 admin uploads).
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "product images public read" on storage.objects;
drop policy if exists "product images staff write" on storage.objects;
drop policy if exists "product images staff update" on storage.objects;
drop policy if exists "product images staff delete" on storage.objects;

create policy "product images public read"
  on storage.objects for select
  using (bucket_id = 'product-images');

create policy "product images staff write"
  on storage.objects for insert
  with check (bucket_id = 'product-images' and is_staff());

create policy "product images staff update"
  on storage.objects for update
  using (bucket_id = 'product-images' and is_staff());

create policy "product images staff delete"
  on storage.objects for delete
  using (bucket_id = 'product-images' and is_staff());

-- ── 20260721000001_customer_password.sql ──────────────────────────────────────────────────────────────

-- Add password column to customers table for phone + password authentication
alter table public.customers add column if not exists password text;

-- ── 20260721000002_customer_activity.sql ──────────────────────────────────────────────────────────────

-- Add last_login_at and login_count columns to track daily sign ins & active website users
alter table public.customers add column if not exists last_login_at timestamptz default now();
alter table public.customers add column if not exists login_count integer default 1;

-- ── 20260722000001_admin_login_throttle.sql ──────────────────────────────────────────────────────────────

-- Durable admin login throttle.
--
-- The lockout used to live in a per-process Map, which on Vercel means one
-- counter per warm serverless instance: an attacker spraying passwords gets
-- five attempts against *each* instance the platform happens to route them to,
-- and a fresh cold start resets the count to zero. The README promised "five
-- failed logins → 15-minute lockout"; this table is what actually delivers it.
--
-- Rows are keyed by a salted hash of the client IP, never the IP itself — a
-- lockout table is not a reason to keep a log of who visited /admin.

-- Guarded so a re-run is a no-op, matching the storage migration's style: this
-- one is likely to be applied by hand in the SQL editor rather than by the CLI.
create table if not exists admin_login_attempts (
  key      text primary key,
  count    int not null default 0,
  first_at timestamptz not null default now()
);

-- Only the service-role client touches this; RLS on with no policies means
-- anon and authenticated cannot read the table at all.
alter table admin_login_attempts enable row level security;

-- Record a failure and return the attempt count inside the current window.
-- Insert-on-conflict keeps the read-modify-write in one statement, so two
-- simultaneous guesses cannot both read "4" and both be allowed through.
create or replace function admin_record_failed_login(p_key text, p_window_seconds int)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  -- Opportunistic cleanup: the table only ever holds active lockouts.
  delete from admin_login_attempts
   where first_at < now() - make_interval(secs => p_window_seconds * 4);

  insert into admin_login_attempts as a (key, count, first_at)
  values (p_key, 1, now())
  on conflict (key) do update
     set count = case
           when a.first_at < now() - make_interval(secs => p_window_seconds) then 1
           else a.count + 1
         end,
         first_at = case
           when a.first_at < now() - make_interval(secs => p_window_seconds) then now()
           else a.first_at
         end
  returning a.count into v_count;

  return v_count;
end;
$$;

-- Attempts recorded against this key inside the current window; 0 once expired.
create or replace function admin_login_attempt_count(p_key text, p_window_seconds int)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select case
              when first_at < now() - make_interval(secs => p_window_seconds) then 0
              else count
            end
       from admin_login_attempts
      where key = p_key),
    0);
$$;

-- Called on a successful login so a legitimate owner who mistyped twice is not
-- still carrying those failures around.
create or replace function admin_clear_login_attempts(p_key text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from admin_login_attempts where key = p_key;
$$;

revoke execute on function admin_record_failed_login(text, int) from public, anon, authenticated;
revoke execute on function admin_login_attempt_count(text, int) from public, anon, authenticated;
revoke execute on function admin_clear_login_attempts(text) from public, anon, authenticated;

grant execute on function admin_record_failed_login(text, int) to service_role;
grant execute on function admin_login_attempt_count(text, int) to service_role;
grant execute on function admin_clear_login_attempts(text) to service_role;

-- ── 20260722000002_gift_orders.sql ──────────────────────────────────────────────────────────────

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

-- ── 20260730000001_merchandising.sql ──────────────────────────────────────────────────────────────

-- Merchandising: home-page banners, brands, and a way to advertise an offer.
--
-- Everything the storefront needed a code deploy to change now lives in rows:
-- a Diwali banner, a brand rail, a featured coupon. Products already carry mrp
-- and price, so "deal of the day" needs no table — it is a sort, not a record.

-- ── Banners ────────────────────────────────────────────────────────────────
-- Slots are fixed positions on the home page rather than free placement, so a
-- banner can never land somewhere the layout has no room for.
create table if not exists banners (
  id         uuid primary key default gen_random_uuid(),
  slot       text not null check (slot in ('hero', 'mid')),
  image_url  text not null,
  alt        text not null default '',
  -- Internal path ('/c/diapering') or absolute URL. Null makes the banner
  -- decorative, which is why alt is allowed to be empty alongside it.
  link_url   text,
  sort       int not null default 0,
  -- Both null means "live now, forever". Scheduling is the whole point of the
  -- table: a festival banner should not need someone awake at midnight.
  starts_at  timestamptz,
  ends_at    timestamptz,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists banners_slot_idx on banners(slot, sort) where active;

-- ── Brands ─────────────────────────────────────────────────────────────────
-- products.brand stays as free text: it is what the PDP badge and the admin
-- search already read, and dropping it would rewrite working code for no gain.
-- brand_id is the new optional link that gives a brand its logo and its page.
create table if not exists brands (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique,
  logo_url   text not null,
  sort       int not null default 0,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

alter table products add column if not exists brand_id uuid references brands(id) on delete set null;
create index if not exists products_brand_idx on products(brand_id) where status = 'active';

-- ── Featured offers ────────────────────────────────────────────────────────
-- Which coupons the storefront advertises. Separate from validity: an expired
-- coupon must stop being advertised, but a valid one is not automatically
-- worth a slot in the offer strip.
alter table coupons add column if not exists featured boolean not null default false;

-- ── RLS ────────────────────────────────────────────────────────────────────
alter table banners enable row level security;
alter table brands  enable row level security;

-- The world reads what is live; staff read and write everything. Scheduling is
-- enforced here as well as in the query so an anon client cannot fetch a
-- festival banner early by asking for it directly.
drop policy if exists "banners public read" on banners;
create policy "banners public read" on banners for select
  using (
    is_staff()
    or (
      active
      and (starts_at is null or starts_at <= now())
      and (ends_at is null or ends_at >= now())
    )
  );
drop policy if exists "banners staff write" on banners;
create policy "banners staff write" on banners for all
  using (is_staff()) with check (is_staff());

drop policy if exists "brands public read" on brands;
create policy "brands public read" on brands for select
  using (active or is_staff());
drop policy if exists "brands staff write" on brands;
create policy "brands staff write" on brands for all
  using (is_staff()) with check (is_staff());

-- RLS policies only filter ROWS — Postgres still checks table-level GRANTs
-- first, and a table created outside the Supabase dashboard's Table Editor
-- does not automatically pick those up. Without this, every anon/authenticated
-- read (and every service-role read/write from the catalog and admin layers)
-- is denied with 42501 before the policy above is ever evaluated.
grant select on banners, brands to anon, authenticated;
grant all on banners, brands to service_role;

-- ── 20260731000001_phase1_updates.sql ──────────────────────────────────────────────────────────────

-- ═══════════════════════════════════════════════════════════════════════════
-- Phase 1 Enhancements Migration
-- Adds product variants JSONB, size chart type, customer addresses
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.products add column if not exists variants jsonb default '[]'::jsonb;
alter table public.products add column if not exists size_chart_type text default 'none';

create table if not exists public.customer_addresses (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  label       text not null default 'Home',
  name        text not null,
  phone       text not null,
  line        text not null,
  city        text not null default 'Thoothukudi',
  pin         text not null check (pin ~ '^[0-9]{6}$'),
  is_default  boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists customer_addresses_customer_idx on public.customer_addresses(customer_id);

alter table public.customer_addresses enable row level security;

-- No policies are defined (every app read/write goes through the service-role
-- client in customer-actions.ts, which bypasses RLS) — RLS-with-no-policy is
-- deny-all for anon/authenticated, which is what we want. But service_role
-- still needs the table-level grant Postgres checks before RLS ever runs.
grant all on public.customer_addresses to service_role;

-- ── 20260802000001_staff_rbac_approvals.sql ──────────────────────────────────────────────────────────────

-- Migration: Staff RBAC & Approvals Queue
-- Creates tables for staff accounts management and owner approval queue

create table if not exists staff_accounts (
  id            uuid primary key default gen_random_uuid(),
  username      text unique not null,
  phone         text not null default '',
  password_hash text not null,
  role          staff_role not null default 'staff',
  status        text not null default 'active',
  created_at    timestamptz not null default now(),
  last_login_at timestamptz
);

create table if not exists pending_approvals (
  id           uuid primary key default gen_random_uuid(),
  requested_by uuid not null,
  staff_name   text not null,
  action_type  text not null,
  description  text not null,
  payload_json jsonb not null,
  status       text not null default 'pending', -- pending, approved, rejected
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz,
  resolved_by  uuid
);

alter table staff_accounts    enable row level security;
alter table pending_approvals enable row level security;

-- Policies for RLS
create policy "staff_accounts staff write" on staff_accounts for all using (is_staff());
create policy "pending_approvals staff write" on pending_approvals for all using (is_staff());

-- The app reads/writes both tables exclusively through the service-role
-- client (see lib/admin-session.ts, lib/data/admin.ts) — RLS policies alone
-- don't grant access; Postgres checks the table-level grant first.
grant all on staff_accounts, pending_approvals to service_role;

-- ── 20260803000001_razorpay_order_id.sql ──────────────────────────────────────────────────────────────

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

-- ── 20260803000002_adjust_stock.sql ──────────────────────────────────────────────────────────────

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

-- ── 20260803000003_order_delivery_mode.sql ──────────────────────────────────────────────────────────────

-- Persist the delivery mode a customer chose at checkout (standard / 3-hour
-- express / store pickup). Previously accepted in PlaceOrderInput and shown on
-- the confirmation screen, but never written to the orders row in live mode —
-- staff had no way to see from an order that a customer requested store pickup
-- rather than delivery. Demo mode already tracked this in memory; this brings
-- the real database in line with it.

alter table orders
  add column if not exists delivery_mode text not null default 'standard'
  check (delivery_mode in ('standard', 'express_3hr', 'store_pickup'));

-- ── 20260803000004_events_retry_tracking.sql ──────────────────────────────────────────────────────────────

-- Retry tracking + dead-letter for the event outbox.
--
-- drainPendingEvents() previously retried every unprocessed row forever, with
-- no attempt counter and no way to tell a transient failure from a
-- permanently-broken payload (e.g. a deleted n8n workflow). That means a bad
-- event sits in the pending queue and gets silently retried once a day,
-- indefinitely, with nothing surfacing that it needs a human. Adding an
-- attempt counter lets deliverToN8n() give up after a bounded number of tries
-- and mark the row so it stops being selected by the drain query, instead of
-- retrying it forever.

alter table events
  add column if not exists attempts int not null default 0,
  add column if not exists last_attempt_at timestamptz,
  add column if not exists dead_lettered_at timestamptz;

-- The old partial index only excluded processed rows; dead-lettered ones
-- should also stop being scanned by the pending-events query.
drop index if exists events_pending_idx;
create index events_pending_idx on events(created_at)
  where processed_at is null and dead_lettered_at is null;

-- ── 20260803000005_place_order_atomic.sql ──────────────────────────────────────────────────────────────

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

-- ── 20260804000001_customer_must_change_password.sql ──────────────────────────────────────────────────────────────

-- An admin-issued temp password must be changed before the customer can use
-- a real session with it (see resetCustomerPassword / signInWithPasswordAction).
alter table public.customers add column if not exists must_change_password boolean not null default false;

-- ── 20260805000001_variant_stock.sql ──────────────────────────────────────────────────────────────

-- Migration 20260805000001: Per-variant stock enforcement & atomic decrement
--
-- Relaxes obsolete FK constraint on order_items.variant_id and updates
-- confirm_order and place_order_atomic to atomically check and decrement
-- stock inside products.variants (jsonb) as well as global products.stock.

alter table order_items drop constraint if exists order_items_variant_id_fkey;
alter table order_items alter column variant_id type text using variant_id::text;

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

  update orders set status = 'confirmed' where id = p_order_id;
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
  p_items jsonb,   -- [{product_id, variant_id, name_snapshot, price_snapshot, qty}, ...]
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
    insert into order_items (order_id, product_id, variant_id, name_snapshot, price_snapshot, qty)
    values (
      v_order.id,
      nullif(v_item->>'product_id', '')::uuid,
      nullif(v_item->>'variant_id', ''),
      v_item->>'name_snapshot',
      (v_item->>'price_snapshot')::int,
      (v_item->>'qty')::int
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

-- ── 20260805000002_cleanup_cron.sql ──────────────────────────────────────────────────────────────

-- Migration: 20260805000002_cleanup_cron.sql
-- Purges expired rate limit attempt logs older than specified window

CREATE OR REPLACE FUNCTION purge_stale_rate_limits(p_older_than_seconds integer DEFAULT 86400)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted integer;
BEGIN
  DELETE FROM admin_login_attempts
  WHERE first_at < (NOW() - (p_older_than_seconds || ' seconds')::interval);
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- ── 20260805000003_razorpay_payment_id.sql ──────────────────────────────────────────────────────────────

-- Persist the captured payment's id, not just the order id.
--
-- razorpay_order_id (added earlier) identifies the payment SESSION Razorpay
-- issued at checkout; it is not what the Refund API takes. Without the actual
-- payment id on file, admin.refundOrder() had no id to refund against and
-- silently fell through to just marking the order "refunded" in our own DB —
-- no money ever moved. This column is set once payment.captured/confirm
-- actually happens, and is what a real refund call uses.

alter table orders add column if not exists razorpay_payment_id text;

-- ── 20260805000004_bump_coupon_usage_fn.sql ──────────────────────────────────────────────────────────────

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

-- ── 20260805000005_staff_log_fixes.sql ──────────────────────────────────────────────────────────────

-- staff_log has been unwritable in live mode since init.sql, for two
-- independent reasons:
--
-- 1. logStaff() used the caller's own anon-key session client so RLS would
--    enforce the staff boundary — but staff sessions are a custom
--    HMAC-signed cookie, never real Supabase Auth, so auth.uid() is always
--    null for them. The insert policy `is_staff() and user_id = auth.uid()`
--    can never pass. (See admin.ts logStaff — now switched to the
--    service-role client, matching every other write in that file; the
--    staff/owner boundary is already enforced upstream by gate()/gateOwner()
--    before logStaff() is ever called.)
--
-- 2. user_id is `uuid not null`, but the owner's identifier is the literal
--    string "admin-owner" (see admin-session.ts) — not a valid UUID — so
--    even bypassing RLS, every owner-action log insert would fail on type
--    coercion. Staff accounts do have real UUIDs (staff_accounts.id), so
--    only the owner path was hitting this, but that's most of the audit
--    trail for a small store.
--
-- Net effect: the entire staff activity audit log has likely been empty in
-- production this whole time.

-- Must drop first: Postgres refuses to alter the type of a column a policy
-- still depends on. (This ordering bug bit the very first live run of this
-- migration — caught here so a fresh install never hits it.)
drop policy if exists "staff_log insert" on staff_log;

alter table staff_log alter column user_id type text using user_id::text;

-- ── 20260805000006_gst_rate_snapshot.sql ──────────────────────────────────────────────────────────────

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

