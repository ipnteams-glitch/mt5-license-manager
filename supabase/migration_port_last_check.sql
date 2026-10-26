-- Migration: track real port usage via last EA verify time
-- Run once in the Supabase SQL editor against the live database.
--
-- Adds ports.last_check. /api/verify-port stamps it = now() on every valid
-- check, so an EA that actually runs updates it within a day. A port whose
-- last_check stays null (or old) after the grace period was never really used.

ALTER TABLE ports
  ADD COLUMN IF NOT EXISTS last_check TIMESTAMPTZ;

-- Inactive legacy permanent-port holders to review AFTER ~30 days of tracking:
-- legacy free, never paid, not admin, and no port checked in recently.
-- SELECT m.email, m.package, m.max_ports
--   FROM members m
--   WHERE m.legacy_free_port = true
--     AND m.role <> 'admin'
--     AND m.email NOT IN (SELECT email FROM payments WHERE status = 'paid')
--     AND NOT EXISTS (
--       SELECT 1 FROM ports p
--       WHERE p.member_email = m.email
--         AND p.last_check > now() - interval '30 days'
--     );
