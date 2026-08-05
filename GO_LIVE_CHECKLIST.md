# Go-Live Checklist — Rasi Mom & Baby

Everything needed to take this from "working in our test setup" to "live for the
client on their own accounts." Follow in order — later steps depend on earlier
ones. Check items off as you go.

---

## 1. Supabase — new project

- [ ] Create a new Supabase project for the client (not the one used during dev/testing).
- [ ] Grab from Project Settings → API: `Project URL`, `anon public key`, `service_role key`.
- [ ] Run every migration in `supabase/migrations/` **in filename order** against
      the new project. Either:
      - `pnpm db:migrate` (uses the Supabase CLI, needs it linked to the new project), or
      - paste each file's contents into the Supabase SQL Editor manually, oldest first.
- [ ] Sanity-check the schema landed: open Table Editor and confirm `orders`,
      `products`, `staff_accounts`, `staff_log`, `coupons`, `banners`, `brands`,
      `customers`, `customer_addresses`, `pending_approvals` all exist.
- [ ] Confirm PostgREST picked up the schema — if any table/column errors show
      up later ("column X does not exist" from the app even though it's in the
      DB), run `NOTIFY pgrst, 'reload schema';` in the SQL Editor. (This bit us
      today — the schema cache doesn't always refresh instantly after a DDL change.)

## 2. Admin credentials (do NOT reuse the dev ones)

- [ ] Generate a real password hash:
      `pnpm admin:password "the-real-password"` → copy the `ADMIN_PASSWORD_HASH=...` line.
- [ ] Generate a real session secret:
      `pnpm admin:password --secret` → copy the `ADMIN_SESSION_SECRET=...` line.
- [ ] Decide the real `ADMIN_USERNAME` (not `rasiadmin` from testing, unless that's
      genuinely what the client wants).
- [ ] Store the plaintext password somewhere safe for the client (a password
      manager) — only the hash goes into env vars, the plaintext is gone once you
      close this terminal.

## 3. Razorpay — switch from test mode to the client's real account

- [ ] Confirm the client has a Razorpay account in **live mode** (KYC completed —
      this can take Razorpay a few days to approve, so start this early).
- [ ] From Razorpay Dashboard → Settings → API Keys (live mode, not test):
      grab `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`.
- [ ] Set up the webhook: Razorpay Dashboard → Settings → Webhooks → Add New
      Webhook.
      - URL: `https://<the-new-vercel-domain>/api/razorpay/webhook`
      - Events: `payment.captured`, `refund.processed`
      - Copy the webhook secret it gives you → `RAZORPAY_WEBHOOK_SECRET`.
- [ ] Confirm the domestic-cards-only setting matches what the client wants
      (this is what blocked the `4111 1111 1111 1111` test card earlier — it's
      correct behavior for an India-only business, just know it's there).

## 4. Sentry — new project

- [ ] Create a new Sentry project for the client's deployment.
- [ ] Copy its DSN → `NEXT_PUBLIC_SENTRY_DSN`.
- [ ] After first deploy, trigger one intentional error (e.g. visit a broken
      URL) and confirm it shows up in the new Sentry project — proves the wiring
      actually works before you need it for real.

## 5. Vercel — new project

- [ ] Create a new Vercel project, connected to the client's repo (or your repo,
      whichever ownership arrangement you've agreed).
- [ ] Set every environment variable below in Vercel → Settings → Environment
      Variables (Production):

  | Variable | Where it comes from |
  |---|---|
  | `NEXT_PUBLIC_SUPABASE_URL` | Step 1 |
  | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Step 1 |
  | `SUPABASE_SERVICE_ROLE_KEY` | Step 1 |
  | `ADMIN_USERNAME` | Step 2 |
  | `ADMIN_PASSWORD_HASH` | Step 2 |
  | `ADMIN_SESSION_SECRET` | Step 2 |
  | `RAZORPAY_KEY_ID` | Step 3 |
  | `RAZORPAY_KEY_SECRET` | Step 3 |
  | `RAZORPAY_WEBHOOK_SECRET` | Step 3 |
  | `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Same as `RAZORPAY_KEY_ID`, client-exposed copy |
  | `NEXT_PUBLIC_SENTRY_DSN` | Step 4 |
  | `NEXT_PUBLIC_SITE_URL` | The real production domain, e.g. `https://rasimomandbaby.com` |
  | `CRON_SECRET` | Any random string — Vercel sends it back automatically to authenticate `/api/cron/*` |

  Optional, only if the client wants them:
  `NEXT_PUBLIC_GA4_MEASUREMENT_ID`, `NEXT_PUBLIC_META_PIXEL_ID`,
  `N8N_WEBHOOK_URL`, `N8N_WEBHOOK_SECRET`.

- [ ] Deploy. Confirm the build succeeds and the site loads.
- [ ] Point the real domain (if the client has one) at this Vercel project.

## 6. Real content — the site is empty until you add this

- [ ] **Business info**: fill in `BUSINESS.phone`, `BUSINESS.email`, `BUSINESS.gstin`,
      and social links in `src/lib/constants.ts` with the client's real details,
      then redeploy. (Waiting on the client for this — noted.)
- [ ] **Products**: add via Admin → Products tab (or `pnpm import:catalog` if
      you're bulk-loading from a spreadsheet).
- [ ] **Brands**: Admin → Brands tab — add each brand with its logo. The
      homepage brand rail and `/brand/[slug]` pages stay hidden until this is
      done (this is intentional, not a bug — confirmed earlier today).
- [ ] **Banners**: Admin → Banners tab.
- [ ] **Staff accounts**: Admin → Staff & Roles tab — create real accounts for
      whoever on the client's team needs access, with appropriate roles
      (owner/manager/staff). Don't hand out the owner login broadly.
- [ ] **Settings**: Admin → Settings tab — delivery fees, COD limit, GST
      defaults, gift wrap fee, same-day cutoff, etc.

## 7. Before calling it launched

- [ ] Log into `/admin` with the real credentials — confirm the dashboard loads
      with no crash.
- [ ] Place one real order end-to-end with a real card (small amount) — confirm
      it shows `payment_status: paid` with a real `razorpay_payment_id` in the
      Orders tab, and that the Razorpay dashboard shows the matching payment.
- [ ] Refund that test order through the admin panel — confirm it actually
      shows up as refunded in the Razorpay dashboard too, not just in our DB.
- [ ] Test COD checkout separately (different code path from Razorpay).
- [ ] Check the printable invoice, packing slip, and shipping label all render
      correctly for a real order.

## 8. After launch — what to keep an eye on

- [ ] Watch Sentry for `order.confirm_failed` events — this is the "sold out
      between checkout and payment capture" edge case discussed earlier. It's
      logged loudly on purpose but doesn't auto-refund; if you see one, refund
      the customer manually and apologize.
- [ ] Same idea for `order.duplicate_payment` — a genuine double-charge, needs
      a human to refund.
- [ ] Coupons with a low `usage_limit` (especially 1) can theoretically be
      over-redeemed if two people check out with the exact same code at the
      exact same instant — very low probability, just worth knowing it's a
      known, narrow edge case rather than a mystery if it ever happens.
