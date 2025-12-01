-- Raw Material FIFO Tracking Columns
-- Created: 2025-12-01
-- Purpose: Support FIFO (First-In, First-Out) inventory allocation during raw material issuance
-- Batch codes help operators identify which stock to use first

-- 1. Add received_date column to raw_materials table
-- This tracks when each raw material batch was received for FIFO ordering
ALTER TABLE raw_materials 
ADD COLUMN IF NOT EXISTS received_date DATE;

-- 2. Add batch_code column to raw_materials table
-- System-generated lot code following LOT-YYYYMMDD format
ALTER TABLE raw_materials 
ADD COLUMN IF NOT EXISTS batch_code VARCHAR(50);

-- 3. Create indexes for FIFO queries (sorting by received_date)
CREATE INDEX IF NOT EXISTS raw_materials_received_date_idx ON raw_materials(received_date);
CREATE INDEX IF NOT EXISTS raw_materials_batch_code_idx ON raw_materials(batch_code);

-- 4. Backfill batch_code for existing records that have received_date but no batch_code
UPDATE raw_materials 
SET batch_code = 'LOT-' || TO_CHAR(received_date, 'YYYYMMDD')
WHERE received_date IS NOT NULL 
  AND (batch_code IS NULL OR batch_code = '');

-- Notes:
-- - received_date: Tracks when material was received for FIFO ordering
-- - batch_code: Format is LOT-YYYYMMDD (e.g., LOT-20241115)
-- - During issuance, system shows materials ordered by received_date (oldest first)
-- - Batch allocation breakdown shows which batches and quantities are used
-- - generateBatchCode() in schema.ts creates batch codes from received dates
-- - formatBatchCodeDisplay() provides human-readable batch info
