-- Full Schema Sync for Local Mac Database
-- Date: 2025-12-02
-- Purpose: Fix all column name mismatches and duplicates

-- ============================================
-- PRODUCTION_ENTRIES TABLE FIXES
-- ============================================

-- Drop old column names if they exist (keep the correct ones)
ALTER TABLE production_entries DROP COLUMN IF EXISTS quantity_produced;
ALTER TABLE production_entries DROP COLUMN IF EXISTS quantity_rejected;

-- Ensure correct columns exist
ALTER TABLE production_entries ADD COLUMN IF NOT EXISTS produced_quantity NUMERIC(12,2);
ALTER TABLE production_entries ADD COLUMN IF NOT EXISTS rejected_quantity NUMERIC(12,2) DEFAULT 0;
ALTER TABLE production_entries ADD COLUMN IF NOT EXISTS product_id VARCHAR REFERENCES products(id);
ALTER TABLE production_entries ADD COLUMN IF NOT EXISTS empty_bottles_opening NUMERIC(12,2) DEFAULT 0;
ALTER TABLE production_entries ADD COLUMN IF NOT EXISTS empty_bottles_produced NUMERIC(12,2) DEFAULT 0;
ALTER TABLE production_entries ADD COLUMN IF NOT EXISTS empty_bottles_used NUMERIC(12,2) DEFAULT 0;
ALTER TABLE production_entries ADD COLUMN IF NOT EXISTS empty_bottles_pending NUMERIC(12,2) DEFAULT 0;
ALTER TABLE production_entries ADD COLUMN IF NOT EXISTS derived_units NUMERIC(12,2);

-- ============================================
-- RAW_MATERIAL_ISSUANCE TABLE FIXES
-- ============================================

ALTER TABLE raw_material_issuance ADD COLUMN IF NOT EXISTS product_id VARCHAR REFERENCES products(id);
ALTER TABLE raw_material_issuance ADD COLUMN IF NOT EXISTS bom_configuration_id VARCHAR;

-- ============================================
-- RAW_MATERIALS TABLE FIXES (FIFO tracking)
-- ============================================

ALTER TABLE raw_materials ADD COLUMN IF NOT EXISTS received_date DATE;
ALTER TABLE raw_materials ADD COLUMN IF NOT EXISTS batch_code VARCHAR(50);

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
DECLARE
    col_count INTEGER;
BEGIN
    -- Check production_entries has correct columns
    SELECT COUNT(*) INTO col_count 
    FROM information_schema.columns 
    WHERE table_name = 'production_entries' 
    AND column_name IN ('produced_quantity', 'rejected_quantity', 'product_id');
    
    IF col_count >= 3 THEN
        RAISE NOTICE 'SUCCESS: production_entries has all required columns';
    ELSE
        RAISE WARNING 'WARNING: production_entries may be missing columns (found %)', col_count;
    END IF;
    
    -- Check no old columns exist
    SELECT COUNT(*) INTO col_count 
    FROM information_schema.columns 
    WHERE table_name = 'production_entries' 
    AND column_name IN ('quantity_produced', 'quantity_rejected');
    
    IF col_count = 0 THEN
        RAISE NOTICE 'SUCCESS: No old duplicate columns found';
    ELSE
        RAISE WARNING 'WARNING: Found % old columns still present', col_count;
    END IF;
END $$;
