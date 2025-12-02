-- Migration: Add uomId and batchNumber fields to production_entries
-- Date: 2025-12-02
-- Purpose: Enable finished goods tracking with UOM and batch number in production entries

-- Add uom_id column (references uom table for finished goods unit of measure)
ALTER TABLE production_entries 
ADD COLUMN IF NOT EXISTS uom_id VARCHAR REFERENCES uom(id);

-- Add batch_number column (for finished goods batch/lot tracking)
ALTER TABLE production_entries 
ADD COLUMN IF NOT EXISTS batch_number VARCHAR(100);

-- Add comment for documentation
COMMENT ON COLUMN production_entries.uom_id IS 'Unit of measure for finished goods (e.g., Case). Defaults to Case if not specified.';
COMMENT ON COLUMN production_entries.batch_number IS 'Batch/Lot number for finished goods tracking. Auto-generated format: YYMMDD-PRODCODE-SHIFT-SEQ';

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'production_entries' 
AND column_name IN ('uom_id', 'batch_number');
