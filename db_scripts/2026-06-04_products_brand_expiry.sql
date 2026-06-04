-- Add brand and expiry_tracking columns to products table (retail mode only, nullable)
ALTER TABLE products ADD COLUMN IF NOT EXISTS brand VARCHAR(100);
ALTER TABLE products ADD COLUMN IF NOT EXISTS expiry_tracking BOOLEAN DEFAULT false;
-- No backfill needed — existing KINTO/Microgrid products keep NULL/false defaults
