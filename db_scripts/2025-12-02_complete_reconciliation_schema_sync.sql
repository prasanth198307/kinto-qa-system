-- COMPLETE Schema Sync for Production Reconciliation Tables
-- Run this on your local Mac database to fix ALL schema issues
-- Date: 2025-12-02

-- ============================================
-- STEP 1: Fix production_reconciliations table
-- Remove legacy columns that code doesn't use
-- ============================================

ALTER TABLE production_reconciliations DROP COLUMN IF EXISTS total_issued_quantity;
ALTER TABLE production_reconciliations DROP COLUMN IF EXISTS total_used_quantity;
ALTER TABLE production_reconciliations DROP COLUMN IF EXISTS total_returned_quantity;
ALTER TABLE production_reconciliations DROP COLUMN IF EXISTS total_pending_quantity;
ALTER TABLE production_reconciliations DROP COLUMN IF EXISTS variance_quantity;
ALTER TABLE production_reconciliations DROP COLUMN IF EXISTS variance_percentage;

-- Ensure all required columns exist
ALTER TABLE production_reconciliations ADD COLUMN IF NOT EXISTS product_id VARCHAR REFERENCES products(id);
ALTER TABLE production_reconciliations ADD COLUMN IF NOT EXISTS production_entry_id VARCHAR REFERENCES production_entries(id);
ALTER TABLE production_reconciliations ADD COLUMN IF NOT EXISTS produced_cases INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE production_reconciliations ADD COLUMN IF NOT EXISTS rejected_cases INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE production_reconciliations ADD COLUMN IF NOT EXISTS empty_bottles_produced INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE production_reconciliations ADD COLUMN IF NOT EXISTS empty_bottles_used INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE production_reconciliations ADD COLUMN IF NOT EXISTS empty_bottles_pending INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE production_reconciliations ADD COLUMN IF NOT EXISTS edit_count INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE production_reconciliations ADD COLUMN IF NOT EXISTS last_edited_by VARCHAR;
ALTER TABLE production_reconciliations ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMP;
ALTER TABLE production_reconciliations ADD COLUMN IF NOT EXISTS created_by VARCHAR;

-- ============================================
-- STEP 2: Fix production_reconciliation_items table
-- Add missing columns that code requires
-- ============================================

-- Add the missing issuance_item_id column (THIS IS THE ERROR YOU'RE SEEING)
ALTER TABLE production_reconciliation_items ADD COLUMN IF NOT EXISTS issuance_item_id VARCHAR;

-- Ensure all quantity columns exist with correct types (NUMERIC for decimal support)
ALTER TABLE production_reconciliation_items 
  ALTER COLUMN quantity_issued TYPE NUMERIC(12,2) USING COALESCE(quantity_issued, 0)::NUMERIC(12,2);

ALTER TABLE production_reconciliation_items 
  ALTER COLUMN quantity_used TYPE NUMERIC(12,2) USING COALESCE(quantity_used, 0)::NUMERIC(12,2);

ALTER TABLE production_reconciliation_items 
  ALTER COLUMN quantity_returned TYPE NUMERIC(12,2) USING COALESCE(quantity_returned, 0)::NUMERIC(12,2);

ALTER TABLE production_reconciliation_items 
  ALTER COLUMN quantity_pending TYPE NUMERIC(12,2) USING COALESCE(quantity_pending, 0)::NUMERIC(12,2);

-- Add variance columns if missing
ALTER TABLE production_reconciliation_items ADD COLUMN IF NOT EXISTS variance_quantity NUMERIC(12,2);
ALTER TABLE production_reconciliation_items ADD COLUMN IF NOT EXISTS variance_percentage NUMERIC(8,2);

-- Add UOM column if missing
ALTER TABLE production_reconciliation_items ADD COLUMN IF NOT EXISTS uom_id VARCHAR;

-- ============================================
-- STEP 3: Verify the schema is correct
-- ============================================

-- Show production_reconciliations columns
SELECT 'production_reconciliations' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'production_reconciliations' 
ORDER BY ordinal_position;

-- Show production_reconciliation_items columns
SELECT 'production_reconciliation_items' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'production_reconciliation_items' 
ORDER BY ordinal_position;
