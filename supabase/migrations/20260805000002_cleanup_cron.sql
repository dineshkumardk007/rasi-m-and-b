-- Migration: 20260805000002_cleanup_cron.sql
-- Purges expired rate limit attempt logs older than specified window

CREATE OR REPLACE FUNCTION purge_stale_rate_limits(p_older_than_seconds integer DEFAULT 86400)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted integer;
BEGIN
  DELETE FROM admin_login_attempts
  WHERE first_at < (NOW() - (p_older_than_seconds || ' seconds')::interval);
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;
