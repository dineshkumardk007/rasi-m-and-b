-- ═══════════════════════════════════════════════════════════════════════════
-- Catch-up script #3: schema changes needed for the bug-fix pass following
-- the 4-agent audit (Razorpay refund correctness, staff RBAC, data-layer
-- error handling). Combines, in order:
--   20260805000003_razorpay_payment_id.sql
--   20260805000004_bump_coupon_usage_fn.sql
--   20260805000005_staff_log_fixes.sql
--
-- Safe to run more than once.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 20260805000003_razorpay_payment_id.sql ──────────────────────────────────
alter table orders add column if not exists razorpay_payment_id text;

-- ── 20260805000004_bump_coupon_usage_fn.sql ─────────────────────────────────
create or replace function bump_coupon_usage(p_code text)
returns void
language sql
security definer
set search_path = public
as $$
  update coupons set used_count = used_count + 1 where code = p_code;
$$;

revoke execute on function bump_coupon_usage(text) from anon, authenticated;

-- ── 20260805000005_staff_log_fixes.sql ──────────────────────────────────────
-- staff_log has been unwritable in live mode since init.sql: the insert
-- policy required auth.uid() to match, but staff sessions are a custom
-- HMAC-cookie scheme (never real Supabase Auth) so auth.uid() is always
-- null for them, AND user_id was `uuid not null` while the owner's id is
-- the literal string "admin-owner" (not a valid UUID). logStaff() now uses
-- the service-role client instead (matching every other write in admin.ts).
alter table staff_log alter column user_id type text using user_id::text;

drop policy if exists "staff_log insert" on staff_log;
