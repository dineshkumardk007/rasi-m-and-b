-- ═══════════════════════════════════════════════════════════════════════════
-- Rasi Mom & Baby — Complete Master Database Schema
-- Run this ONCE in your Supabase SQL Editor (https://supabase.com/dashboard)
-- ═══════════════════════════════════════════════════════════════════════════

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

-- ── Customers Table ────────────────────────────────────────────────────────
create table if not exists public.customers (
  id               uuid primary key default gen_random_uuid(),
  name             text not null default '',
  phone            text not null unique,
  email            text,
  password_hash    text,
  language         text not null default 'en' check (language in ('en', 'ta')),
  whatsapp_opt_in  boolean not null default false,
  baby_dob         date,
  notes            text not null default '',
  created_at       timestamptz not null default now()
);

-- ── Customer Addresses Table ───────────────────────────────────────────────
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

-- ── Brands Table ───────────────────────────────────────────────────────────
create table if not exists public.brands (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique,
  logo_url   text not null,
  sort       int not null default 0,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- ── Products Table ─────────────────────────────────────────────────────────
create table if not exists public.products (
  id                  uuid primary key default gen_random_uuid(),
  name_en             text not null,
  name_ta             text not null,
  slug                text not null unique,
  brand               text not null default '',
  brand_id            uuid references public.brands(id) on delete set null,
  milestone           milestone not null,
  price               integer not null check (price >= 0),
  mrp                 integer not null check (mrp >= 0),
  gst_rate            numeric(4,2) not null default 12.00,
  stock               integer not null default 0 check (stock >= 0),
  low_stock_threshold integer not null default 5,
  status              product_status not null default 'active',
  tile_color          text not null default '#FFCBD9',
  emoji               text not null default '🧸',
  images              text[] not null default '{}',
  description_en      text not null default '',
  description_ta      text not null default '',
  ingredients         text,
  variants            jsonb default '[]'::jsonb,
  size_chart_type     text default 'none',
  created_at          timestamptz not null default now()
);
create index if not exists products_milestone_idx on public.products(milestone) where status = 'active';

-- ── Product Categories Table ───────────────────────────────────────────────
create table if not exists public.product_categories (
  product_id uuid not null references public.products(id) on delete cascade,
  category   category not null,
  primary key (product_id, category)
);
create index if not exists product_categories_category_idx on public.product_categories(category);

-- ── Banners Table ──────────────────────────────────────────────────────────
create table if not exists public.banners (
  id         uuid primary key default gen_random_uuid(),
  slot       text not null check (slot in ('hero', 'mid')),
  image_url  text not null,
  alt        text not null default '',
  link_url   text,
  sort       int not null default 0,
  starts_at  timestamptz,
  ends_at    timestamptz,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists banners_slot_idx on public.banners(slot, sort) where active;

-- ── Coupons Table ──────────────────────────────────────────────────────────
create table if not exists public.coupons (
  id              uuid primary key default gen_random_uuid(),
  code            text not null unique,
  type            coupon_type not null,
  value           integer not null check (value > 0),
  min_order_value integer not null default 0 check (min_order_value >= 0),
  max_discount    integer,
  starts_at       timestamptz not null default now(),
  expires_at      timestamptz,
  max_uses        integer,
  uses_count      integer not null default 0 check (uses_count >= 0),
  featured        boolean not null default false,
  created_at      timestamptz not null default now()
);

-- ── Reviews Table ──────────────────────────────────────────────────────────
create table if not exists public.reviews (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid references public.products(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  author_name text not null,
  author_area text not null default 'Thoothukudi',
  rating      integer not null check (rating between 1 and 5),
  title       text not null default '',
  body        text not null,
  status      review_status not null default 'pending',
  featured    boolean not null default false,
  verified    boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ── Orders Table ───────────────────────────────────────────────────────────
create sequence if not exists order_number_seq start with 1001;

create table if not exists public.orders (
  id                  uuid primary key default gen_random_uuid(),
  order_number        text not null unique default ('RSB-' || nextval('order_number_seq')::text),
  customer_id         uuid references public.customers(id) on delete set null,
  customer_name       text not null,
  customer_phone      text not null,
  address_line        text not null,
  address_city        text not null default 'Thoothukudi',
  address_pin         text not null check (address_pin ~ '^[0-9]{6}$'),
  status              order_status not null default 'new',
  subtotal            integer not null check (subtotal >= 0),
  delivery_fee        integer not null default 0 check (delivery_fee >= 0),
  discount            integer not null default 0 check (discount >= 0),
  total               integer not null check (total >= 0),
  gst_total           integer not null default 0 check (gst_total >= 0),
  coupon_code         text,
  payment_method      payment_method not null,
  payment_status      payment_status not null default 'pending',
  razorpay_order_id   text,
  razorpay_payment_id text,
  is_gift             boolean not null default false,
  gift_wrap_fee       integer not null default 0,
  gift_message        text,
  gift_sender_name    text,
  created_at          timestamptz not null default now()
);

create table if not exists public.order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders(id) on delete cascade,
  product_id    uuid references public.products(id) on delete set null,
  name_snapshot text not null,
  price         integer not null check (price >= 0),
  qty           integer not null check (qty > 0),
  gst_rate      numeric(4,2) not null default 12.00
);

-- ── Row Level Security (RLS) Policies ──────────────────────────────────────
alter table public.customers enable row level security;
alter table public.customer_addresses enable row level security;
alter table public.products enable row level security;
alter table public.product_categories enable row level security;
alter table public.banners enable row level security;
alter table public.brands enable row level security;
alter table public.coupons enable row level security;
alter table public.reviews enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Public read policies
create policy "products public read" on public.products for select using (status = 'active');
create policy "product_categories public read" on public.product_categories for select using (true);
create policy "banners public read" on public.banners for select using (active = true);
create policy "brands public read" on public.brands for select using (active = true);
create policy "coupons public read" on public.coupons for select using (true);
create policy "reviews public read" on public.reviews for select using (status = 'approved');

-- Service role bypasses RLS automatically for admin and customer actions
