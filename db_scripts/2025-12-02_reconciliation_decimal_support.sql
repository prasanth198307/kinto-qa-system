-- Migration: Add decimal support for production reconciliation quantities
-- This allows tracking partial bags (e.g., 3.4 bags = 1700 pieces)
-- Run this on your local Mac database

-- Convert integer columns to numeric with 2 decimal places
ALTER TABLE production_reconciliation_items 
  ALTER COLUMN quantity_issued TYPE NUMERIC(12,2) USING quantity_issued::NUMERIC(12,2);

ALTER TABLE production_reconciliation_items 
  ALTER COLUMN quantity_used TYPE NUMERIC(12,2) USING quantity_used::NUMERIC(12,2);

ALTER TABLE production_reconciliation_items 
  ALTER COLUMN quantity_returned TYPE NUMERIC(12,2) USING quantity_returned::NUMERIC(12,2);

ALTER TABLE production_reconciliation_items 
  ALTER COLUMN quantity_pending TYPE NUMERIC(12,2) USING quantity_pending::NUMERIC(12,2);

-- Also add created_by column if missing (from previous migration)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'production_reconciliations' 
        AND column_name = 'created_by'
    ) THEN
        ALTER TABLE production_reconciliations ADD COLUMN created_by VARCHAR(255);
        RAISE NOTICE 'Added created_by column to production_reconciliations';
    ELSE
        RAISE NOTICE 'created_by column already exists';
    END IF;
END $$;

-- Verify changes
SELECT column_name, data_type, numeric_precision, numeric_scale 
FROM information_schema.columns 
WHERE table_name = 'production_reconciliation_items' 
AND column_name IN ('quantity_issued', 'quantity_used', 'quantity_returned', 'quantity_pending');
