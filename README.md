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
