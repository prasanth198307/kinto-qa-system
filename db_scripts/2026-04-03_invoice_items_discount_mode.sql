-- Add missing discount_mode column to invoice_items
-- This was in the Drizzle schema but never applied to the DB
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS discount_mode varchar(5) NOT NULL DEFAULT '%';
