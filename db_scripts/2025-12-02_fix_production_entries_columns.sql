-- Fix production_entries table column names to match current schema
-- Run this on your local Mac database
-- Date: 2025-12-02

-- Rename columns to match current Drizzle schema (using DO block for IF EXISTS logic)
DO $$
BEGIN
    -- Rename quantity_produced to produced_quantity if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'production_entries' AND column_name = 'quantity_produced') THEN
        ALTER TABLE production_entries RENAME COLUMN quantity_produced TO produced_quantity;
        RAISE NOTICE 'Renamed quantity_produced to produced_quantity';
    END IF;
    
    -- Rename quantity_rejected to rejected_quantity if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'production_entries' AND column_name = 'quantity_rejected') THEN
        ALTER TABLE production_entries RENAME COLUMN quantity_rejected TO rejected_quantity;
        RAISE NOTICE 'Renamed quantity_rejected to rejected_quantity';
    END IF;
END $$;

-- Add product_id column if it doesn't exist (for linking to products table)
ALTER TABLE production_entries ADD COLUMN IF NOT EXISTS product_id VARCHAR REFERENCES products(id);
