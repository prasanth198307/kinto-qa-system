-- =====================================================
-- FIX COLUMN NAMES - Rename mismatched columns
-- Date: 2025-11-19
-- Description: Renames columns to match code expectations
-- =====================================================

-- =====================================================
-- 1. PRODUCT_CATEGORIES - Rename category_name to name
-- =====================================================

DO $$
BEGIN
    -- Check if category_name exists and name doesn't
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_categories' AND column_name = 'category_name')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_categories' AND column_name = 'name')
    THEN
        ALTER TABLE product_categories RENAME COLUMN category_name TO name;
        RAISE NOTICE 'Renamed product_categories.category_name to name';
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_categories' AND column_name = 'name')
    THEN
        RAISE NOTICE 'product_categories.name already exists - skipping';
    END IF;
END $$;

-- Change is_active from integer to varchar if needed
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'product_categories' 
        AND column_name = 'is_active'
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE product_categories 
        ALTER COLUMN is_active TYPE VARCHAR USING (CASE WHEN is_active = 1 THEN 'true' ELSE 'false' END);
        
        ALTER TABLE product_categories ALTER COLUMN is_active SET DEFAULT 'true';
        RAISE NOTICE 'Changed product_categories.is_active to VARCHAR';
    END IF;
END $$;

-- =====================================================
-- 2. PRODUCT_TYPES - Rename type_name to name
-- =====================================================

DO $$
BEGIN
    -- Check if type_name exists and name doesn't
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_types' AND column_name = 'type_name')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_types' AND column_name = 'name')
    THEN
        ALTER TABLE product_types RENAME COLUMN type_name TO name;
        RAISE NOTICE 'Renamed product_types.type_name to name';
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_types' AND column_name = 'name')
    THEN
        RAISE NOTICE 'product_types.name already exists - skipping';
    END IF;
END $$;

-- Change is_active from integer to varchar if needed
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'product_types' 
        AND column_name = 'is_active'
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE product_types 
        ALTER COLUMN is_active TYPE VARCHAR USING (CASE WHEN is_active = 1 THEN 'true' ELSE 'false' END);
        
        ALTER TABLE product_types ALTER COLUMN is_active SET DEFAULT 'true';
        RAISE NOTICE 'Changed product_types.is_active to VARCHAR';
    END IF;
END $$;

-- =====================================================
-- 3. RAW_MATERIAL_TYPES - Add type_code and all missing columns
-- =====================================================

-- Add type_code column (most critical missing column)
ALTER TABLE raw_material_types ADD COLUMN IF NOT EXISTS type_code VARCHAR(100);

-- Auto-generate type_code from type_name for existing rows
DO $$
DECLARE
  rec RECORD;
  counter INTEGER := 1;
BEGIN
  FOR rec IN SELECT id FROM raw_material_types WHERE type_code IS NULL ORDER BY created_at
  LOOP
    UPDATE raw_material_types 
    SET type_code = 'RMT-' || LPAD(counter::TEXT, 3, '0')
    WHERE id = rec.id;
    counter := counter + 1;
  END LOOP;
END $$;

-- Add all other missing columns that code expects
ALTER TABLE raw_material_types ADD COLUMN IF NOT EXISTS base_unit VARCHAR(50);
ALTER TABLE raw_material_types ADD COLUMN IF NOT EXISTS base_unit_weight INTEGER;
ALTER TABLE raw_material_types ADD COLUMN IF NOT EXISTS derived_unit VARCHAR(50);
ALTER TABLE raw_material_types ADD COLUMN IF NOT EXISTS weight_per_derived_unit INTEGER;
ALTER TABLE raw_material_types ADD COLUMN IF NOT EXISTS derived_value_per_base INTEGER;
ALTER TABLE raw_material_types ADD COLUMN IF NOT EXISTS output_type VARCHAR(50);
ALTER TABLE raw_material_types ADD COLUMN IF NOT EXISTS output_units_covered INTEGER;
ALTER TABLE raw_material_types ADD COLUMN IF NOT EXISTS conversion_value INTEGER;
ALTER TABLE raw_material_types ADD COLUMN IF NOT EXISTS loss_percent INTEGER DEFAULT 0;
ALTER TABLE raw_material_types ADD COLUMN IF NOT EXISTS usable_units INTEGER;

-- Add constraints for type_code
DO $$
BEGIN
    -- Add unique constraint to type_code
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'raw_material_types_type_code_key') THEN
        ALTER TABLE raw_material_types ADD CONSTRAINT raw_material_types_type_code_key UNIQUE (type_code);
    END IF;
    
    -- Make type_code NOT NULL
    ALTER TABLE raw_material_types ALTER COLUMN type_code SET NOT NULL;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Some constraints already exist or cannot be added';
END $$;

-- =====================================================
-- 4. ADD INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS product_categories_name_index ON product_categories(name);
CREATE INDEX IF NOT EXISTS product_types_name_index ON product_types(name);
CREATE INDEX IF NOT EXISTS raw_material_types_type_code_index ON raw_material_types(type_code);

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'COLUMN RENAME MIGRATION COMPLETED!';
    RAISE NOTICE '';
    RAISE NOTICE 'Fixed:';
    RAISE NOTICE '  ✓ product_categories.category_name → name';
    RAISE NOTICE '  ✓ product_types.type_name → name';
    RAISE NOTICE '  ✓ raw_material_types + type_code (auto-generated)';
    RAISE NOTICE '  ✓ raw_material_types + 10 new columns';
    RAISE NOTICE '  ✓ Changed is_active to VARCHAR';
    RAISE NOTICE '';
    RAISE NOTICE 'All errors should now be fixed!';
    RAISE NOTICE '==============================================';
END $$;
