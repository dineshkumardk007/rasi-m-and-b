# Rasi Mom & Baby

Production e-commerce site for Rasi Mom & Baby, Thoothukudi — Next.js App Router +
TypeScript + Tailwind on Vercel, with Supabase (Postgres/Auth/Storage, RLS),
Razorpay, and n8n + WhatsApp automation.

## Setup

```bash
pnpm install
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

## Structure

- `src/app` — App Router pages (Phase 0 ships a token-showcase home)
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
