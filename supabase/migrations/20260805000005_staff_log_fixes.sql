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

alter table staff_log alter column user_id type text using user_id::text;

drop policy if exists "staff_log insert" on staff_log;
