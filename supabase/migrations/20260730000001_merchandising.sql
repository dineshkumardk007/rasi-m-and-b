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
