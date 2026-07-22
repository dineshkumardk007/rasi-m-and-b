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
