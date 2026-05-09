-- F12 Fix: Add item_weight, gold_rate_today, item_description to jw_counter_bookings
-- Run: psql $DATABASE_URL -f db_scripts/2026-05-09_f12_counter_bookings_columns.sql

ALTER TABLE jw_counter_bookings
  ADD COLUMN IF NOT EXISTS item_weight      NUMERIC(10,3),
  ADD COLUMN IF NOT EXISTS gold_rate_today  NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS item_description TEXT;
