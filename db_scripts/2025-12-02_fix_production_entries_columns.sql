-- Fix production_entries table column names to match current schema
-- Run this on your local Mac database
-- Date: 2025-12-02

-- Rename columns to match current Drizzle schema
ALTER TABLE production_entries RENAME COLUMN IF EXISTS quantity_produced TO produced_quantity;
ALTER TABLE production_entries RENAME COLUMN IF EXISTS quantity_rejected TO rejected_quantity;

-- Add product_id column if it doesn't exist (for linking to products table)
ALTER TABLE production_entries ADD COLUMN IF NOT EXISTS product_id VARCHAR REFERENCES products(id);

-- Verify the columns exist with correct names
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'production_entries';
