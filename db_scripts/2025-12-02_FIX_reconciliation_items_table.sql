-- ================================================================
-- FIX production_reconciliation_items TABLE
-- This script fixes duplicate/legacy columns and syncs with Drizzle
-- Run this on your Mac database
-- ================================================================

BEGIN;

-- 1. Rename legacy columns if they still exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'production_reconciliation_items' AND column_name = 'issued_quantity') THEN
    EXECUTE 'ALTER TABLE production_reconciliation_items RENAME COLUMN issued_quantity TO quantity_issued';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'production_reconciliation_items' AND column_name = 'used_quantity') THEN
    EXECUTE 'ALTER TABLE production_reconciliation_items RENAME COLUMN used_quantity TO quantity_used';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'production_reconciliation_items' AND column_name = 'returned_quantity') THEN
    EXECUTE 'ALTER TABLE production_reconciliation_items RENAME COLUMN returned_quantity TO quantity_returned';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'production_reconciliation_items' AND column_name = 'pending_quantity') THEN
    EXECUTE 'ALTER TABLE production_reconciliation_items RENAME COLUMN pending_quantity TO quantity_pending';
  END IF;
END$$;

-- 2. Drop duplicate/legacy columns that are no longer required
ALTER TABLE production_reconciliation_items
  DROP COLUMN IF EXISTS net_consumed,
  DROP COLUMN IF EXISTS issued_quantity,
  DROP COLUMN IF EXISTS used_quantity,
  DROP COLUMN IF EXISTS returned_quantity,
  DROP COLUMN IF EXISTS pending_quantity;

-- 3. Ensure canonical columns exist with correct data types
ALTER TABLE production_reconciliation_items
  ADD COLUMN IF NOT EXISTS reconciliation_id VARCHAR,
  ADD COLUMN IF NOT EXISTS raw_material_id VARCHAR,
  ADD COLUMN IF NOT EXISTS issuance_item_id VARCHAR,
  ADD COLUMN IF NOT EXISTS quantity_issued NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS quantity_used NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS quantity_returned NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quantity_pending NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS uom_id VARCHAR,
  ADD COLUMN IF NOT EXISTS remarks TEXT,
  ADD COLUMN IF NOT EXISTS record_status INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- 4. Normalize data types (forces NUMERIC(12,2))
ALTER TABLE production_reconciliation_items
  ALTER COLUMN quantity_issued TYPE NUMERIC(12,2) USING quantity_issued::NUMERIC,
  ALTER COLUMN quantity_used TYPE NUMERIC(12,2) USING quantity_used::NUMERIC,
  ALTER COLUMN quantity_returned TYPE NUMERIC(12,2) USING quantity_returned::NUMERIC,
  ALTER COLUMN quantity_pending TYPE NUMERIC(12,2) USING quantity_pending::NUMERIC;

-- 5. Backfill NULLs before asserting NOT NULL
UPDATE production_reconciliation_items
SET
  quantity_issued   = COALESCE(quantity_issued, 0),
  quantity_used     = COALESCE(quantity_used, 0),
  quantity_returned = COALESCE(quantity_returned, 0),
  quantity_pending  = COALESCE(quantity_pending, 0),
  record_status     = COALESCE(record_status, 1),
  created_at        = COALESCE(created_at, NOW()),
  updated_at        = COALESCE(updated_at, NOW());

-- 6. Reassert required NOT NULL / defaults
ALTER TABLE production_reconciliation_items
  ALTER COLUMN quantity_issued   SET NOT NULL,
  ALTER COLUMN quantity_used     SET NOT NULL,
  ALTER COLUMN quantity_returned SET DEFAULT 0,
  ALTER COLUMN quantity_pending  SET DEFAULT 0,
  ALTER COLUMN record_status     SET DEFAULT 1,
  ALTER COLUMN created_at        SET DEFAULT NOW(),
  ALTER COLUMN updated_at        SET DEFAULT NOW();

COMMIT;

-- Verify the fix
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'production_reconciliation_items' 
ORDER BY ordinal_position;
