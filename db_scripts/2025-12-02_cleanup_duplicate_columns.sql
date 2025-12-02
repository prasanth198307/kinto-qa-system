-- Migration: Cleanup duplicate columns in production_entries table
-- Date: 2025-12-02
-- Issue: Table has both quantity_produced (old) and produced_quantity (correct)
-- Solution: Drop the old column, keep the correct one

-- Drop the wrong column if it exists
ALTER TABLE production_entries DROP COLUMN IF EXISTS quantity_produced;

-- Verify the correct column exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'production_entries' AND column_name = 'produced_quantity'
    ) THEN
        RAISE EXCEPTION 'Missing required column: produced_quantity';
    END IF;
    
    RAISE NOTICE 'Cleanup complete. production_entries now has correct column: produced_quantity';
END $$;
