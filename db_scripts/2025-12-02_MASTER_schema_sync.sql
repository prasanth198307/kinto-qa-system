-- ================================================================
-- MASTER SCHEMA SYNC SCRIPT
-- Run this ONCE on your Mac database to fix ALL column issues
-- Date: 2025-12-02
-- ================================================================

BEGIN;

-- ============================================
-- 1. FINISHED_GOODS TABLE
-- ============================================
ALTER TABLE finished_goods ADD COLUMN IF NOT EXISTS product_id VARCHAR;
ALTER TABLE finished_goods ADD COLUMN IF NOT EXISTS batch_number VARCHAR(100);
ALTER TABLE finished_goods ADD COLUMN IF NOT EXISTS production_date TIMESTAMP;
ALTER TABLE finished_goods ADD COLUMN IF NOT EXISTS quantity INTEGER;
ALTER TABLE finished_goods ADD COLUMN IF NOT EXISTS uom_id VARCHAR;
ALTER TABLE finished_goods ADD COLUMN IF NOT EXISTS quality_status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE finished_goods ADD COLUMN IF NOT EXISTS machine_id VARCHAR;
ALTER TABLE finished_goods ADD COLUMN IF NOT EXISTS operator_id VARCHAR;
ALTER TABLE finished_goods ADD COLUMN IF NOT EXISTS inspected_by VARCHAR;
ALTER TABLE finished_goods ADD COLUMN IF NOT EXISTS inspection_date TIMESTAMP;
ALTER TABLE finished_goods ADD COLUMN IF NOT EXISTS storage_location VARCHAR(255);
ALTER TABLE finished_goods ADD COLUMN IF NOT EXISTS remarks TEXT;
ALTER TABLE finished_goods ADD COLUMN IF NOT EXISTS record_status INTEGER DEFAULT 1;
ALTER TABLE finished_goods ADD COLUMN IF NOT EXISTS created_by VARCHAR;
ALTER TABLE finished_goods ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE finished_goods ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- ============================================
-- 2. RAW_MATERIAL_ISSUANCE TABLE
-- ============================================
ALTER TABLE raw_material_issuance ADD COLUMN IF NOT EXISTS issuance_number VARCHAR(100);
ALTER TABLE raw_material_issuance ADD COLUMN IF NOT EXISTS issuance_date TIMESTAMP;
ALTER TABLE raw_material_issuance ADD COLUMN IF NOT EXISTS issued_to VARCHAR(255);
ALTER TABLE raw_material_issuance ADD COLUMN IF NOT EXISTS product_id VARCHAR;
ALTER TABLE raw_material_issuance ADD COLUMN IF NOT EXISTS bom_configuration_id VARCHAR;
ALTER TABLE raw_material_issuance ADD COLUMN IF NOT EXISTS production_reference VARCHAR(255);
ALTER TABLE raw_material_issuance ADD COLUMN IF NOT EXISTS planned_output NUMERIC(12,2);
ALTER TABLE raw_material_issuance ADD COLUMN IF NOT EXISTS remarks TEXT;
ALTER TABLE raw_material_issuance ADD COLUMN IF NOT EXISTS record_status INTEGER DEFAULT 1;
ALTER TABLE raw_material_issuance ADD COLUMN IF NOT EXISTS issued_by VARCHAR;
ALTER TABLE raw_material_issuance ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE raw_material_issuance ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- ============================================
-- 3. RAW_MATERIAL_ISSUANCE_ITEMS TABLE
-- ============================================
ALTER TABLE raw_material_issuance_items ADD COLUMN IF NOT EXISTS issuance_id VARCHAR;
ALTER TABLE raw_material_issuance_items ADD COLUMN IF NOT EXISTS raw_material_id VARCHAR;
ALTER TABLE raw_material_issuance_items ADD COLUMN IF NOT EXISTS product_id VARCHAR;
ALTER TABLE raw_material_issuance_items ADD COLUMN IF NOT EXISTS quantity_issued NUMERIC(12,6);
ALTER TABLE raw_material_issuance_items ADD COLUMN IF NOT EXISTS suggested_quantity NUMERIC(12,6);
ALTER TABLE raw_material_issuance_items ADD COLUMN IF NOT EXISTS calculation_basis VARCHAR(50);
ALTER TABLE raw_material_issuance_items ADD COLUMN IF NOT EXISTS uom_id VARCHAR;
ALTER TABLE raw_material_issuance_items ADD COLUMN IF NOT EXISTS remarks TEXT;
ALTER TABLE raw_material_issuance_items ADD COLUMN IF NOT EXISTS record_status INTEGER DEFAULT 1;
ALTER TABLE raw_material_issuance_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE raw_material_issuance_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- ============================================
-- 4. PRODUCTION_ENTRIES TABLE
-- ============================================
ALTER TABLE production_entries ADD COLUMN IF NOT EXISTS issuance_id VARCHAR;
ALTER TABLE production_entries ADD COLUMN IF NOT EXISTS product_id VARCHAR;
ALTER TABLE production_entries ADD COLUMN IF NOT EXISTS uom_id VARCHAR;
ALTER TABLE production_entries ADD COLUMN IF NOT EXISTS batch_number VARCHAR(100);
ALTER TABLE production_entries ADD COLUMN IF NOT EXISTS production_date TIMESTAMP;
ALTER TABLE production_entries ADD COLUMN IF NOT EXISTS shift VARCHAR(20);
ALTER TABLE production_entries ADD COLUMN IF NOT EXISTS produced_quantity NUMERIC(12,2);
ALTER TABLE production_entries ADD COLUMN IF NOT EXISTS rejected_quantity NUMERIC(12,2) DEFAULT 0;
ALTER TABLE production_entries ADD COLUMN IF NOT EXISTS empty_bottles_opening NUMERIC(12,2) DEFAULT 0;
ALTER TABLE production_entries ADD COLUMN IF NOT EXISTS empty_bottles_produced NUMERIC(12,2) DEFAULT 0;
ALTER TABLE production_entries ADD COLUMN IF NOT EXISTS empty_bottles_used NUMERIC(12,2) DEFAULT 0;
ALTER TABLE production_entries ADD COLUMN IF NOT EXISTS empty_bottles_pending NUMERIC(12,2) DEFAULT 0;
ALTER TABLE production_entries ADD COLUMN IF NOT EXISTS derived_units NUMERIC(12,2);
ALTER TABLE production_entries ADD COLUMN IF NOT EXISTS remarks TEXT;
ALTER TABLE production_entries ADD COLUMN IF NOT EXISTS record_status INTEGER DEFAULT 1;
ALTER TABLE production_entries ADD COLUMN IF NOT EXISTS created_by VARCHAR;
ALTER TABLE production_entries ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE production_entries ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- ============================================
-- 5. PRODUCTION_RECONCILIATIONS TABLE
-- ============================================
-- First DROP legacy columns that code doesn't use
ALTER TABLE production_reconciliations DROP COLUMN IF EXISTS total_issued_quantity;
ALTER TABLE production_reconciliations DROP COLUMN IF EXISTS total_used_quantity;
ALTER TABLE production_reconciliations DROP COLUMN IF EXISTS total_returned_quantity;
ALTER TABLE production_reconciliations DROP COLUMN IF EXISTS total_pending_quantity;
ALTER TABLE production_reconciliations DROP COLUMN IF EXISTS variance_quantity;
ALTER TABLE production_reconciliations DROP COLUMN IF EXISTS variance_percentage;
ALTER TABLE production_reconciliations DROP COLUMN IF EXISTS status;

-- Add required columns
ALTER TABLE production_reconciliations ADD COLUMN IF NOT EXISTS reconciliation_number VARCHAR(100);
ALTER TABLE production_reconciliations ADD COLUMN IF NOT EXISTS reconciliation_date TIMESTAMP;
ALTER TABLE production_reconciliations ADD COLUMN IF NOT EXISTS shift VARCHAR(20);
ALTER TABLE production_reconciliations ADD COLUMN IF NOT EXISTS issuance_id VARCHAR;
ALTER TABLE production_reconciliations ADD COLUMN IF NOT EXISTS production_entry_id VARCHAR;
ALTER TABLE production_reconciliations ADD COLUMN IF NOT EXISTS product_id VARCHAR;
ALTER TABLE production_reconciliations ADD COLUMN IF NOT EXISTS produced_cases INTEGER DEFAULT 0;
ALTER TABLE production_reconciliations ADD COLUMN IF NOT EXISTS rejected_cases INTEGER DEFAULT 0;
ALTER TABLE production_reconciliations ADD COLUMN IF NOT EXISTS empty_bottles_produced INTEGER DEFAULT 0;
ALTER TABLE production_reconciliations ADD COLUMN IF NOT EXISTS empty_bottles_used INTEGER DEFAULT 0;
ALTER TABLE production_reconciliations ADD COLUMN IF NOT EXISTS empty_bottles_pending INTEGER DEFAULT 0;
ALTER TABLE production_reconciliations ADD COLUMN IF NOT EXISTS edit_count INTEGER DEFAULT 0;
ALTER TABLE production_reconciliations ADD COLUMN IF NOT EXISTS last_edited_by VARCHAR;
ALTER TABLE production_reconciliations ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMP;
ALTER TABLE production_reconciliations ADD COLUMN IF NOT EXISTS remarks TEXT;
ALTER TABLE production_reconciliations ADD COLUMN IF NOT EXISTS record_status INTEGER DEFAULT 1;
ALTER TABLE production_reconciliations ADD COLUMN IF NOT EXISTS created_by VARCHAR;
ALTER TABLE production_reconciliations ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE production_reconciliations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- ============================================
-- 6. PRODUCTION_RECONCILIATION_ITEMS TABLE
-- ============================================
ALTER TABLE production_reconciliation_items ADD COLUMN IF NOT EXISTS reconciliation_id VARCHAR;
ALTER TABLE production_reconciliation_items ADD COLUMN IF NOT EXISTS raw_material_id VARCHAR;
ALTER TABLE production_reconciliation_items ADD COLUMN IF NOT EXISTS issuance_item_id VARCHAR;
ALTER TABLE production_reconciliation_items ADD COLUMN IF NOT EXISTS quantity_issued NUMERIC(12,2);
ALTER TABLE production_reconciliation_items ADD COLUMN IF NOT EXISTS quantity_used NUMERIC(12,2);
ALTER TABLE production_reconciliation_items ADD COLUMN IF NOT EXISTS quantity_returned NUMERIC(12,2) DEFAULT 0;
ALTER TABLE production_reconciliation_items ADD COLUMN IF NOT EXISTS quantity_pending NUMERIC(12,2) DEFAULT 0;
ALTER TABLE production_reconciliation_items ADD COLUMN IF NOT EXISTS uom_id VARCHAR;
ALTER TABLE production_reconciliation_items ADD COLUMN IF NOT EXISTS remarks TEXT;
ALTER TABLE production_reconciliation_items ADD COLUMN IF NOT EXISTS record_status INTEGER DEFAULT 1;
ALTER TABLE production_reconciliation_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE production_reconciliation_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- ============================================
-- 7. RAW_MATERIALS TABLE (FIFO tracking)
-- ============================================
ALTER TABLE raw_materials ADD COLUMN IF NOT EXISTS received_date DATE;
ALTER TABLE raw_materials ADD COLUMN IF NOT EXISTS batch_code VARCHAR(50);

COMMIT;

-- ============================================
-- VERIFICATION - Run this to check your schema
-- ============================================
SELECT 'production_reconciliations' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'production_reconciliations' 
ORDER BY ordinal_position;

SELECT 'production_reconciliation_items' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'production_reconciliation_items' 
ORDER BY ordinal_position;

SELECT 'production_entries' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'production_entries' 
ORDER BY ordinal_position;
