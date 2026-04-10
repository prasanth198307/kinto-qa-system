-- Add missing columns to sales_return_items that exist in Drizzle schema but were missing in DB
-- These columns support the bottles/cases tracking and inspection verification workflow
ALTER TABLE sales_return_items 
  ADD COLUMN IF NOT EXISTS bottles_per_case INTEGER,
  ADD COLUMN IF NOT EXISTS cases_returned INTEGER,
  ADD COLUMN IF NOT EXISTS loose_bottles_returned INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS verified_quantity INTEGER,
  ADD COLUMN IF NOT EXISTS variance_reason VARCHAR(255);
