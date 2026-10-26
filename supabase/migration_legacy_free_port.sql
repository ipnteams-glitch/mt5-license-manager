-- Migration: legacy free-promo permanent port entitlement
-- Run once in the Supabase SQL editor against the live database.
--
-- Adds members.legacy_free_port and flags every existing "free" promo member
-- so their permanent 1-port entitlement is preserved even after they later
-- upgrade to a paid package (which overwrites the package key).

ALTER TABLE members
  ADD COLUMN IF NOT EXISTS legacy_free_port BOOLEAN NOT NULL DEFAULT false;

-- Backfill: current legacy free-promo members keep the entitlement.
UPDATE members
  SET legacy_free_port = true
  WHERE package = 'free';

-- Verify (optional): list members holding the entitlement.
-- SELECT email, package, max_ports, expiry_date, legacy_free_port
--   FROM members WHERE legacy_free_port = true;
