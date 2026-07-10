-- Fix columns missing from loyalty tables discovered during production deployment.
-- These were applied live on 2026-07-09 via ALTER TABLE; this script ensures
-- fresh environments also get them.

ALTER TABLE restaurant_customers
  ADD COLUMN IF NOT EXISTS expiry_date DATE;

ALTER TABLE loyalty_customers
  ADD COLUMN IF NOT EXISTS points_balance NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
