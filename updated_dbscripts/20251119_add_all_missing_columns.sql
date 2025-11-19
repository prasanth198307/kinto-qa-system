-- Migration: Add ALL Missing Columns to Mac Production Database
-- Date: 2025-11-19
-- Description: Comprehensive migration to sync production database with current schema

-- =====================================================
-- MACHINES TABLE - Add Missing Columns
-- =====================================================

-- Add warmup time column (for machine startup workflow)
ALTER TABLE machines ADD COLUMN IF NOT EXISTS warmup_time_minutes INTEGER DEFAULT 0;

COMMENT ON COLUMN machines.warmup_time_minutes IS 'Machine warmup time in minutes for startup workflow';

-- =====================================================
-- RAW_MATERIAL_ISSUANCE TABLE - Add Missing Columns
-- =====================================================

-- Add production reference (batch ID / FG name / shift number)
ALTER TABLE raw_material_issuance ADD COLUMN IF NOT EXISTS production_reference VARCHAR(255);

-- Add planned output (expected production quantity)
ALTER TABLE raw_material_issuance ADD COLUMN IF NOT EXISTS planned_output NUMERIC(12,2);

COMMENT ON COLUMN raw_material_issuance.production_reference IS 'Batch ID, FG Name, or Shift Number for tracking';
COMMENT ON COLUMN raw_material_issuance.planned_output IS 'Expected/planned production quantity';

-- =====================================================
-- RAW_MATERIAL_ISSUANCE_ITEMS TABLE - Add Missing Columns
-- =====================================================

-- Add suggested quantity (auto-calculated from BOM)
ALTER TABLE raw_material_issuance_items ADD COLUMN IF NOT EXISTS suggested_quantity NUMERIC(12,6);

-- Add calculation basis (how quantity was determined)
ALTER TABLE raw_material_issuance_items ADD COLUMN IF NOT EXISTS calculation_basis VARCHAR(50);

-- Change quantity_issued to NUMERIC for better precision (if currently INTEGER)
DO $$
BEGIN
    -- Check if column exists and is INTEGER, then alter it
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'raw_material_issuance_items' 
        AND column_name = 'quantity_issued'
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE raw_material_issuance_items 
        ALTER COLUMN quantity_issued TYPE NUMERIC(12,6);
    END IF;
END $$;

COMMENT ON COLUMN raw_material_issuance_items.suggested_quantity IS 'Auto-calculated quantity from BOM (formula-based/direct-value/output-coverage)';
COMMENT ON COLUMN raw_material_issuance_items.calculation_basis IS 'Method used: formula-based | direct-value | output-coverage | manual';

-- =====================================================
-- CREATE INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS machines_warmup_time_index ON machines(warmup_time_minutes);
CREATE INDEX IF NOT EXISTS raw_material_issuance_production_ref_index ON raw_material_issuance(production_reference);
CREATE INDEX IF NOT EXISTS raw_material_issuance_planned_output_index ON raw_material_issuance(planned_output);

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Success message
DO $$
BEGIN
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE 'Added missing columns:';
    RAISE NOTICE '  - machines.warmup_time_minutes';
    RAISE NOTICE '  - raw_material_issuance.production_reference';
    RAISE NOTICE '  - raw_material_issuance.planned_output';
    RAISE NOTICE '  - raw_material_issuance_items.suggested_quantity';
    RAISE NOTICE '  - raw_material_issuance_items.calculation_basis';
    RAISE NOTICE '==============================================';
END $$;
