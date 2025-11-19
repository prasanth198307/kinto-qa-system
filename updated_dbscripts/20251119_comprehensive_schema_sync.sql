-- =====================================================
-- COMPREHENSIVE SCHEMA SYNCHRONIZATION MIGRATION
-- Date: 2025-11-19
-- Description: Complete sync of Mac production database with current code schema
-- Adds ALL missing columns across ALL tables
-- =====================================================

-- =====================================================
-- GATEPASSES TABLE - Add Missing Columns
-- =====================================================

-- Additional dispatch tracking fields
ALTER TABLE gatepasses ADD COLUMN IF NOT EXISTS cases_count INTEGER;
ALTER TABLE gatepasses ADD COLUMN IF NOT EXISTS security_seal_no VARCHAR(100);
ALTER TABLE gatepasses ADD COLUMN IF NOT EXISTS is_cluster INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE gatepasses ADD COLUMN IF NOT EXISTS invoice_id VARCHAR UNIQUE;

-- Status tracking & vehicle exit/entry
ALTER TABLE gatepasses ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'generated' NOT NULL;
ALTER TABLE gatepasses ADD COLUMN IF NOT EXISTS out_time TIMESTAMP;
ALTER TABLE gatepasses ADD COLUMN IF NOT EXISTS in_time TIMESTAMP;
ALTER TABLE gatepasses ADD COLUMN IF NOT EXISTS verified_by VARCHAR(255);

-- Proof of Delivery (POD) fields
ALTER TABLE gatepasses ADD COLUMN IF NOT EXISTS pod_received_by VARCHAR(255);
ALTER TABLE gatepasses ADD COLUMN IF NOT EXISTS pod_date TIMESTAMP;
ALTER TABLE gatepasses ADD COLUMN IF NOT EXISTS pod_remarks TEXT;
ALTER TABLE gatepasses ADD COLUMN IF NOT EXISTS pod_signature TEXT;

-- Add foreign key constraint for invoice_id (if invoices table exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'gatepasses_invoice_id_invoices_id_fk') THEN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices') THEN
            ALTER TABLE gatepasses ADD CONSTRAINT gatepasses_invoice_id_invoices_id_fk
                FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

COMMENT ON COLUMN gatepasses.cases_count IS 'Number of cases/boxes dispatched';
COMMENT ON COLUMN gatepasses.security_seal_no IS 'Security seal number for tamper protection';
COMMENT ON COLUMN gatepasses.status IS 'Dispatch status: generated, vehicle_out, delivered, completed';
COMMENT ON COLUMN gatepasses.invoice_id IS 'One-to-one relationship with invoice';

-- =====================================================
-- RAW_MATERIALS TABLE - Add Missing Columns
-- =====================================================

-- Weight and conversion fields
ALTER TABLE raw_materials ADD COLUMN IF NOT EXISTS weight_per_unit INTEGER;
ALTER TABLE raw_materials ADD COLUMN IF NOT EXISTS conversion_type VARCHAR(50);
ALTER TABLE raw_materials ADD COLUMN IF NOT EXISTS conversion_value INTEGER;
ALTER TABLE raw_materials ADD COLUMN IF NOT EXISTS weight_per_piece INTEGER;
ALTER TABLE raw_materials ADD COLUMN IF NOT EXISTS loss_percent INTEGER DEFAULT 0;

-- Stock management fields
ALTER TABLE raw_materials ADD COLUMN IF NOT EXISTS max_stock_level INTEGER;
ALTER TABLE raw_materials ADD COLUMN IF NOT EXISTS opening_date DATE;

-- Change is_active to VARCHAR if it's currently INTEGER
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'raw_materials' 
        AND column_name = 'is_active'
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE raw_materials 
        ALTER COLUMN is_active TYPE VARCHAR USING (CASE WHEN is_active = 1 THEN 'true' ELSE 'false' END);
    END IF;
END $$;

-- Change uom_id to allow null if not already
ALTER TABLE raw_materials ALTER COLUMN uom_id DROP NOT NULL;

COMMENT ON COLUMN raw_materials.weight_per_unit IS 'Weight per single unit in grams';
COMMENT ON COLUMN raw_materials.conversion_type IS 'Conversion calculation method';
COMMENT ON COLUMN raw_materials.conversion_value IS 'Calculated conversion value';
COMMENT ON COLUMN raw_materials.loss_percent IS 'Expected loss percentage during processing';
COMMENT ON COLUMN raw_materials.opening_date IS 'Date of opening stock entry';

-- =====================================================
-- RAW_MATERIAL_TYPES TABLE - CREATE IF NOT EXISTS
-- =====================================================

CREATE TABLE IF NOT EXISTS raw_material_types (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    type_code VARCHAR(100) NOT NULL UNIQUE,
    type_name VARCHAR(255) NOT NULL,
    
    -- Conversion Method: formula-based | direct-value | output-coverage
    conversion_method VARCHAR(50),
    
    -- Base Unit fields (common to all methods)
    base_unit VARCHAR(50),
    base_unit_weight INTEGER,
    
    -- Derived Unit fields (for formula-based and direct-value)
    derived_unit VARCHAR(50),
    weight_per_derived_unit INTEGER,
    derived_value_per_base INTEGER,
    
    -- Output Coverage fields (for output-coverage method)
    output_type VARCHAR(50),
    output_units_covered INTEGER,
    
    -- Calculated fields
    conversion_value INTEGER,
    loss_percent INTEGER DEFAULT 0,
    usable_units INTEGER,
    
    description TEXT,
    is_active INTEGER DEFAULT 1 NOT NULL,
    record_status INTEGER DEFAULT 1 NOT NULL,
    created_by VARCHAR REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key constraint for raw_materials.type_id
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'raw_materials_type_id_raw_material_types_id_fk') THEN
        ALTER TABLE raw_materials ADD CONSTRAINT raw_materials_type_id_raw_material_types_id_fk
            FOREIGN KEY (type_id) REFERENCES raw_material_types(id) ON DELETE SET NULL;
    END IF;
END $$;

COMMENT ON TABLE raw_material_types IS 'Master data for raw material types with conversion methods';
COMMENT ON COLUMN raw_material_types.type_code IS 'Auto-generated code: RMT-001, RMT-002, etc.';
COMMENT ON COLUMN raw_material_types.conversion_method IS 'Conversion calculation method: formula-based, direct-value, or output-coverage';

-- =====================================================
-- CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Gatepasses indexes
CREATE INDEX IF NOT EXISTS gatepasses_invoice_id_index ON gatepasses(invoice_id);
CREATE INDEX IF NOT EXISTS gatepasses_status_index ON gatepasses(status);
CREATE INDEX IF NOT EXISTS gatepasses_cases_count_index ON gatepasses(cases_count);

-- Raw Materials indexes
CREATE INDEX IF NOT EXISTS raw_materials_weight_per_unit_index ON raw_materials(weight_per_unit);
CREATE INDEX IF NOT EXISTS raw_materials_loss_percent_index ON raw_materials(loss_percent);

-- Raw Material Types indexes
CREATE INDEX IF NOT EXISTS raw_material_types_type_code_index ON raw_material_types(type_code);
CREATE INDEX IF NOT EXISTS raw_material_types_conversion_method_index ON raw_material_types(conversion_method);
CREATE INDEX IF NOT EXISTS raw_material_types_is_active_index ON raw_material_types(is_active);

-- =====================================================
-- UPDATE EXISTING DATA (IF NEEDED)
-- =====================================================

-- Update any null status values in gatepasses to 'generated'
UPDATE gatepasses SET status = 'generated' WHERE status IS NULL;

-- Update any null loss_percent values to 0
UPDATE raw_materials SET loss_percent = 0 WHERE loss_percent IS NULL;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Success message
DO $$
BEGIN
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'COMPREHENSIVE SCHEMA MIGRATION COMPLETED!';
    RAISE NOTICE '';
    RAISE NOTICE 'Added columns to gatepasses table:';
    RAISE NOTICE '  - cases_count, security_seal_no, is_cluster';
    RAISE NOTICE '  - invoice_id, status, out_time, in_time';
    RAISE NOTICE '  - verified_by, POD fields (4 columns)';
    RAISE NOTICE '';
    RAISE NOTICE 'Added columns to raw_materials table:';
    RAISE NOTICE '  - weight_per_unit, conversion_type';
    RAISE NOTICE '  - conversion_value, weight_per_piece';
    RAISE NOTICE '  - loss_percent, max_stock_level, opening_date';
    RAISE NOTICE '';
    RAISE NOTICE 'Created raw_material_types table (if not exists)';
    RAISE NOTICE '  - Complete type master with conversion methods';
    RAISE NOTICE '';
    RAISE NOTICE 'Performance indexes created';
    RAISE NOTICE '==============================================';
END $$;
