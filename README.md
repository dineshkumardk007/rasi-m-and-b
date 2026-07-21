# Rasi Mom & Baby

Production e-commerce site for Rasi Mom & Baby, Thoothukudi — Next.js App Router +
TypeScript + Tailwind on Vercel, with Supabase (Postgres/Auth/Storage, RLS),
Razorpay, and n8n + WhatsApp automation.

## Run it now (demo mode)

```bash
pnpm install
pnpm dev        # http://localhost:3000 — full site on an in-memory demo store
```

With no Supabase keys the entire site (storefront, checkout with simulated
payment, COD, tracking, invoice, admin at /admin) runs on an in-memory demo
store that resets on restart. Adding real keys flips every data path to
Supabase automatically — no code changes.

## Go live

```bash
cp .env.example .env.local   # fill in Supabase keys (dashboard → Settings → API)
```

Apply migrations (either way):

- **Supabase CLI**: `supabase link --project-ref <ref>` then `pnpm db:migrate`
- **SQL editor**: paste `supabase/migrations/*.sql` in order into the dashboard SQL editor

Then:

```bash
pnpm seed          # load the 40-SKU placeholder catalog
pnpm dev           # http://localhost:3000 — Phase 0 design-token showcase
```

## Admin login (/admin)

Credentials come from the environment only — no fallback, so `/admin` stays
locked on any deploy that hasn't configured it. Generate the values:

```bash
pnpm admin:password "your-password"   # → ADMIN_PASSWORD_HASH (scrypt)
pnpm admin:password --secret          # → ADMIN_SESSION_SECRET (32 bytes)
```

Put `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH` and `ADMIN_SESSION_SECRET` in
`.env.local` and in Vercel → Settings → Environment Variables. Sessions are
HMAC-signed cookies that expire after 12h; rotating the secret signs everyone
out. Five failed logins from one IP trigger a 15-minute lockout.

## Analytics

Set `NEXT_PUBLIC_META_PIXEL_ID` and/or `NEXT_PUBLIC_GA4_MEASUREMENT_ID` (see
`.env.example`). With neither set, no tag is injected and no request leaves the
page — dev and keyless deploys stay clean. Events fire to whichever is present:

| Action | Meta | GA4 |
| --- | --- | --- |
| Page load | `PageView` | `page_view` |
| Quick view / product page | `ViewContent` | `view_item` |
| Add to cart | `AddToCart` | `add_to_cart` |
| Checkout opened | `InitiateCheckout` | `begin_checkout` |
| Order placed | `Purchase` | `purchase` |
| Shop search (debounced) | `Search` | `search` |

`Purchase` reports the charged total, delivery and discount included. Events
carry product ids, names, prices and totals — never a customer's name, phone,
address or order number. Call sites live in `src/lib/analytics.ts`.

## Product photos

Two ways in, both landing in the `product-images` Supabase Storage bucket:

- **Admin panel** — `/admin` → Products → Edit → *Add photos*. Upload one or
  many, drop the ones you don't want, "Make main" picks the tile image.
- **Bulk, from a folder**:

  ```bash
  pnpm import:images "C:/path/to/photos" --dry   # preview the matches
  pnpm import:images "C:/path/to/photos"         # upload and attach
  ```

  Filenames match products by slug — `sebamed-baby-wash-200ml.jpg`. Add `-2`,
  `-3` for extra photos of the same product. A re-run replaces that product's
  photos, so the folder stays the source of truth. `--dry` prints every product
  slug, which is the quickest way to see what to rename a file to.

Uploads go through the service-role client in a server action: the bucket's
write policy wants `is_staff()`, and the admin session is a signed cookie
rather than a Supabase auth user, so a browser-side upload would fail RLS.
Products with no photo fall back to their emoji tile.

## Catalog import

Real product data drops in without code changes:

```bash
pnpm import:catalog path/to/catalog.csv
```

Column reference: `scripts/catalog-template.csv`. `categories` and `images`
are `|`-separated. Upserts by slug; invalid rows are reported and skipped.

Then add Razorpay keys (checkout switches from simulation to live Standard
Checkout; point the dashboard webhook at `/api/razorpay/webhook`), and import
the n8n workflows from `/automation` for WhatsApp messaging.

## Structure

- `src/app` — App Router: storefront `/`, PDP `/p/[slug]`, `/admin`,
  `/invoice/[orderNo]`, Razorpay + cron API routes, sitemap/robots/merchant feed
- `src/components` — sticker-system UI primitives, storefront, admin
- `src/lib/data` — repository layer: demo store ↔ Supabase, orders, events outbox
- `automation` — importable n8n workflow JSONs (WhatsApp via AiSensy/Interakt)
- `src/lib/i18n` — bilingual dictionary (en/ta); **no hardcoded UI strings**
- `src/lib/supabase` — browser / server / admin (service-role) clients
- `src/lib/constants.ts` — business data, milestones, category palette
- `src/env.mjs` — env validation; the app refuses to start with missing keys
- `supabase/migrations` — schema + RLS (every table)
- `scripts` — seed + CSV import
- `tailwind.config.ts` + `src/app/globals.css` — the "Playful Sticker" design tokens

## Design system

"Playful Sticker": `--ink #2B2140` outlines everywhere, hard offset shadows
(never blurred), Baloo 2 / Karla / Noto Sans Tamil, 8 category colours.
Tokens live in `tailwind.config.ts`; interaction utilities (`.pop`,
`.btn-press`, `.tile-pressed`, marquee) in `globals.css`.
