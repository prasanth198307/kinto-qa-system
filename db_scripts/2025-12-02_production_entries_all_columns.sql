-- Add ALL missing columns to production_entries table
-- Run this on your local Mac database
-- Date: 2025-12-02

-- Add remarks column
ALTER TABLE production_entries ADD COLUMN IF NOT EXISTS remarks TEXT;

-- Add derived_units column (decimal type for calculated units)
ALTER TABLE production_entries ADD COLUMN IF NOT EXISTS derived_units NUMERIC(12,2) DEFAULT 0;

-- Add empty bottles tracking columns (decimal type)
ALTER TABLE production_entries ADD COLUMN IF NOT EXISTS empty_bottles_opening NUMERIC(12,2) DEFAULT 0;
ALTER TABLE production_entries ADD COLUMN IF NOT EXISTS empty_bottles_produced NUMERIC(12,2) DEFAULT 0;
ALTER TABLE production_entries ADD COLUMN IF NOT EXISTS empty_bottles_used NUMERIC(12,2) DEFAULT 0;
ALTER TABLE production_entries ADD COLUMN IF NOT EXISTS empty_bottles_pending NUMERIC(12,2) DEFAULT 0;

-- Verify columns were added
SELECT 'production_entries columns:' as info;
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'production_entries' 
ORDER BY ordinal_position;
