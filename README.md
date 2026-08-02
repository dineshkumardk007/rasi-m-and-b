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
out.

Five failed logins from one IP trigger a 15-minute lockout. The counter lives in
the `admin_login_attempts` table rather than in process memory — on Vercel a
per-instance counter would have given an attacker five attempts against *every*
warm instance, and reset on any cold start. Requires the
`20260722000001_admin_login_throttle` migration; without it the throttle fails
open (a database outage must not lock the owner out of their own shop) while the
credential check itself stays in force. IPs are stored as a keyed hash, never in
the clear.

## Before you go live — three values to fill in

`src/lib/constants.ts` has three TODOs that the policy pages and Razorpay's
merchant review both depend on. Nothing else blocks activation:

| Field | Why it matters |
| --- | --- |
| `BUSINESS.phone` | Razorpay checks a reachable phone is published on `/contact`. Also becomes `telephone` in the shop's structured data, which is the field Google leans on hardest for local results. |
| `BUSINESS.email` | Same check. |
| `BUSINESS.returnWindowDays` | Quoted verbatim in the refund policy (currently 7). |

Each renders only when set, so an unset value ships an incomplete contact page
rather than a fabricated one. `BUSINESS.closesAt` works the same way: while it
is `null` the shop's structured data omits opening hours entirely rather than
publish a closing time nobody confirmed.

## Policy pages

`/legal/privacy`, `/legal/terms`, `/legal/refunds`, `/legal/shipping` and
`/contact` — the set Razorpay requires before activating a merchant account.
Copy lives in `src/lib/legal/content.ts`, in English and Tamil, and is
parameterised: the delivery fee, free-delivery threshold, COD ceiling and
serviceable PINs are read from live store settings at request time, so editing
them in `/admin` cannot leave the published policy contradicting the checkout.

Bump `LEGAL_LAST_UPDATED` when the wording changes.

## Customer sessions

Password and email sign-in verify a credential and then issue an HMAC-signed
`rasi_customer_session` cookie — the same scheme as the admin session, keyed by
a value derived from `ADMIN_SESSION_SECRET` so admin and customer tokens can
never be swapped. Phone OTP goes through Supabase Auth and keeps its own
session; `currentCustomer()` accepts either.

This exists because actions used to take the customer's phone number **as an
argument**. `myOrdersAction(phone)` then queried with the service-role client,
which bypasses RLS — so iterating 10-digit numbers returned other families'
names, phones and delivery addresses. Server Actions are ordinary POST
endpoints, so that was reachable from anywhere.

The rule the code now follows: **an action never takes the identity it acts on
from its caller.** `myOrdersAction()`, `recordCustomerActivityAction()` and
`notifyRestockAction()` take no phone at all, and
`ensureCustomerProfileByEmailAction` verifies the Supabase session server-side
before trusting the email it was handed.

Rotating `ADMIN_SESSION_SECRET` signs out every customer as well as the owner.

## Rate limits

Public write actions are throttled per caller IP in `src/lib/rate-limit.ts`,
sharing the `admin_login_attempts` table (and therefore its migration) so the
counter is not per-serverless-instance:

| Action | Budget |
| --- | --- |
| Review submission | 5 / hour |
| Sign-up (phone or email) | 10 / hour |
| Coupon check | 20 / 10 min |
| Order tracking | 15 / 10 min |

Sign-in keeps its own stricter per-account lockout (5 failures → 15 minutes).
All of these fail open on a database error, matching the login throttle: an
outage must not take the storefront's write paths down with it.

## Invoice links

`/invoice/[orderNo]?t=…` — the token is an HMAC over the order number and the
phone recorded on the order, so it cannot be moved to another order or forged.
The link previously carried `?phone=`, which wrote a customer's number into
browser history, access logs and outbound `Referer` headers, and order numbers
are sequential. A signed-in customer can also open their own invoice without a
token.

## Security headers

Set in `next.config.mjs`: `frame-ancestors 'none'` (plus `X-Frame-Options` for
older browsers), `base-uri`, `object-src`, HSTS, `nosniff`, `Referrer-Policy`,
and `no-store` on `/admin`.

The full content policy — script, style, image and connect sources — is now
enforced as `Content-Security-Policy` (previously shipped as
`Content-Security-Policy-Report-Only` until watched quiet). It was never
exercised against a real Razorpay checkout in this environment (no live keys in
`.env.local`), because checkout injects further scripts and frames of its own
and a blocked one fails the payment silently. **Run one real (or Razorpay
test-mode) checkout end-to-end after deploying this and watch the browser
console for CSP violations** before trusting it fully in production.

`img-src` is deliberately a bare `https:` rather than a named allow-list:
review photos are a customer-pasted link (see "Add Image/Photo Link" on a
review) to whatever host they used, so there's no fixed domain to allow-list.
This was caught by testing — a named-origins-only `img-src` silently drops
every review photo hosted outside those origins once the policy is enforced.

If something else is blocked, add the specific origin to the relevant directive in
`next.config.mjs` rather than loosening it broadly.

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

### Automatic fitting

There is no crop or resize step, by design. Whatever shape the photo arrives
in, `src/lib/image-pipeline.ts` renders it into the two boxes the storefront
actually has — a 1200×400 (3:1) modal banner and a 600×360 (5:3) card tile,
declared in `RENDITIONS` in `src/lib/images.ts`. Each render applies EXIF
orientation, trims a near-white or transparent backdrop, scales the product to
70% of the box and centres it on the product's own `tile_color`.

Both renditions plus the untouched original are stored under one random stem:

```
nappy-rash-cream/9f3c…-tile.webp      ← the only URL held in products.images
nappy-rash-cream/9f3c…-banner.webp    ← derived by bannerUrlFor()
nappy-rash-cream/9f3c…-original.jpg   ← kept so a layout change can re-render
```

The banner is recovered from the tile URL by string swap, which is why two
renditions need no extra column. Legacy and externally hosted URLs pass through
`bannerUrlFor()` unchanged, so old rows keep rendering.

The display boxes are locked to the same ratios — `Art`'s `ratio` prop in
`src/components/ui.tsx`. That pairing is the whole feature: a fixed pixel height
with a fluid width would let `object-cover` crop the carefully-centred product
back off the edges at some viewports.

Photos below 800px on the longest side are rejected at upload rather than
enlarged, since the banner would read as visibly soft.

To bring photos uploaded before this existed in line:

```bash
pnpm reprocess:images --dry     # report what would change
pnpm reprocess:images           # re-render and repoint products.images
pnpm reprocess:images --force   # also re-render already-fitted photos
pnpm reprocess:images --prune   # delete the superseded objects too
```

`--force` re-renders from the stored original, which is what you want after
changing a rendition's size or inset. Superseded objects are kept unless
`--prune` is passed, so an unexpected run is a matter of repointing rows.

### Converting any image to a box, outside the catalogue

`src/lib/fit-box.ts` is the standalone version: any image in, an exact box out,
with no product or Supabase involvement. Driven by `pnpm fit:image`:

```bash
pnpm fit:image "C:/photos/shot.jpg"                 # → 600×360 WebP
pnpm fit:image "C:/photos"                          # every image in a folder
pnpm fit:image "C:/photos" --size 1200x400          # any box
pnpm fit:image "C:/photos" --strategy mirror
pnpm fit:image "C:/photos/shot.jpg" --compare       # one file, every strategy
```

The interesting decision is what to do with the space left over when the source
and the box disagree on aspect ratio:

| Strategy | Leftover space | Crops? |
| --- | --- | --- |
| `blur` (default) | A scaled, blurred copy of the image itself | No |
| `mirror` | The image's edges reflected outward | No |
| `color` | A flat colour (`--background`) | No |
| `attention` | Nothing — fills the box, cropping to the salient region | Yes |
| `cover` | Nothing — fills the box, cropping from the centre | Yes |

None of them stretch the subject. `blur` is the default because it works on any
image; `mirror` beats it when the background is plain or a soft gradient, but
mirroring a portrait photo into a landscape box needs margins wider than the
image itself and folds the subject back into them, so `mirror` downgrades to
`blur` past `MAX_MIRROR_MARGIN_RATIO` and reports what it actually ran.

Note that none of this *invents* background. Widening a frame by generating
plausible new scenery is outpainting and needs an image model; sharp can only
move, repeat and blur the pixels it was given. `blur` and `mirror` are the
closest honest approximations.

## Merchandising

The parts of the home page a shopkeeper controls without a deploy. Migration:
`supabase/migrations/20260730000001_merchandising.sql`.

**Banners** (admin → Banners) fill two fixed slots: a rotating hero carousel and
one mid-page promo. Each carries an optional link and an optional start/end
window, so a festival banner can be loaded a week early and expire on its own.
The schedule is enforced both in the RLS policy and in `getLiveBanners()` —
storefront reads use the service-role client, which bypasses RLS, so the query
has to filter too. With no hero banner set the built-in `Hero` renders instead.

**Brands** (admin → Brands) drive the logo rail and a `/brand/[slug]` page. That
page is the storefront with its brand filter pre-set rather than a bespoke
listing, so cart, quick view, search and age pills all behave identically.
`products.brand` stays free text — `brand_id` is an optional link, and deleting
a brand nulls it rather than touching stock.

**Offers** are advertised by featuring a coupon (admin → Coupons → Feature).
`featuredOffers()` re-checks expiry and usage limits before anything reaches the
strip, so a code that checkout would reject is never shown. The Feature button
is hidden on expired or exhausted coupons.

**Deals of the day** needs no table — it is `topDeals()` over `mrp` and `price`,
deepest discount first, out-of-stock excluded, with a countdown to midnight IST.

Rules live in `src/lib/merchandising.ts` as pure functions taking `now` as an
argument, so scheduling can be tested without waiting for a festival.

One layering rule worth keeping: `merch-image-specs.ts` holds the sizes and is
safe to import from client components; `merch-image-upload.ts` holds the upload
and pulls in sharp. Importing the latter from a `"use client"` file drags a
native Node module into the browser bundle and breaks the build.

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

## Tests

```bash
pnpm test          # vitest, ~2s
pnpm test:watch
```

Unit tests over the pure logic: admin and customer session tokens (forgery,
tampering, expiry, and that one cannot be presented as the other), invoice link
tokens, password hashing, the bilingual dictionary (placeholder parity between
English and Tamil — a dropped `{time}` breaks the countdown for Tamil readers
only), the policy documents, and the formatting helpers.

The money path is covered too, since a rounding mistake there is a mistake on a
legal document or on what the shop gives away: GST splitting on inclusive
prices (`src/lib/gst.ts` — the invariant is that taxable + tax always equals the
amount actually charged) and coupon evaluation (minimums, expiry, usage limits).

Anything needing Supabase is out of scope; those paths are exercised by running
the site in demo mode.

CI (`.github/workflows/ci.yml`) runs lint, typecheck, tests and a production
build on every push and PR, with no secrets — `SKIP_ENV_VALIDATION=1` puts the
build on the keyless demo path.

## Structure

- `src/app` — App Router: storefront `/`, PDP `/p/[slug]`, `/admin`,
  `/invoice/[orderNo]`, `/legal/[doc]`, `/contact`, Razorpay + cron API routes,
  sitemap/robots/merchant feed, plus `error`/`global-error`/`not-found`/`loading`
- `src/lib/legal` — bilingual policy copy (privacy, terms, refunds, shipping)
- `src/lib/seo` — Store + WebSite JSON-LD shared by the storefront and category pages
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
