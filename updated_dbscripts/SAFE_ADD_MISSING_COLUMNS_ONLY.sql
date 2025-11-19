-- =====================================================
-- SAFE MIGRATION - ADD MISSING COLUMNS ONLY
-- Date: 2025-11-19
-- Description: Safely adds ONLY missing columns
-- Uses "ADD COLUMN IF NOT EXISTS" - safe to run multiple times
-- =====================================================

-- =====================================================
-- 1. PRODUCT_CATEGORIES - Add Missing Columns
-- =====================================================

ALTER TABLE product_categories ADD COLUMN IF NOT EXISTS code VARCHAR(50);
ALTER TABLE product_categories ADD COLUMN IF NOT EXISTS display_order INTEGER;

-- Auto-generate codes for existing rows with null code
DO $$
DECLARE
  rec RECORD;
  counter INTEGER := 1;
BEGIN
  FOR rec IN SELECT id FROM product_categories WHERE code IS NULL ORDER BY created_at
  LOOP
    UPDATE product_categories 
    SET code = 'CAT-' || LPAD(counter::TEXT, 3, '0')
    WHERE id = rec.id;
    counter := counter + 1;
  END LOOP;
END $$;

-- Add unique constraint and NOT NULL if not already present
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_categories_code_key') THEN
        ALTER TABLE product_categories ADD CONSTRAINT product_categories_code_key UNIQUE (code);
    END IF;
    
    ALTER TABLE product_categories ALTER COLUMN code SET NOT NULL;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Code constraint already exists or cannot be added';
END $$;

-- =====================================================
-- 2. PRODUCT_TYPES - Add Missing Columns
-- =====================================================

ALTER TABLE product_types ADD COLUMN IF NOT EXISTS code VARCHAR(50);
ALTER TABLE product_types ADD COLUMN IF NOT EXISTS display_order INTEGER;

-- Auto-generate codes for existing rows with null code
DO $$
DECLARE
  rec RECORD;
  counter INTEGER := 1;
BEGIN
  FOR rec IN SELECT id FROM product_types WHERE code IS NULL ORDER BY created_at
  LOOP
    UPDATE product_types 
    SET code = 'TYPE-' || LPAD(counter::TEXT, 3, '0')
    WHERE id = rec.id;
    counter := counter + 1;
  END LOOP;
END $$;

-- Add unique constraint and NOT NULL if not already present
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_types_code_key') THEN
        ALTER TABLE product_types ADD CONSTRAINT product_types_code_key UNIQUE (code);
    END IF;
    
    ALTER TABLE product_types ALTER COLUMN code SET NOT NULL;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Code constraint already exists or cannot be added';
END $$;

-- =====================================================
-- 3. NOTIFICATION_CONFIG - Add Missing SMTP Column
-- =====================================================

-- Only add the missing column if table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_config') THEN
        ALTER TABLE notification_config ADD COLUMN IF NOT EXISTS smtp_from_name VARCHAR(255);
    ELSE
        RAISE NOTICE 'notification_config table does not exist - skipping';
    END IF;
END $$;

-- =====================================================
-- 4. RAW_MATERIAL_TYPES - Add Missing Columns
-- =====================================================

-- Add all missing columns to raw_material_types table
ALTER TABLE raw_material_types ADD COLUMN IF NOT EXISTS type_code VARCHAR(100);
ALTER TABLE raw_material_types ADD COLUMN IF NOT EXISTS type_name VARCHAR(255);
ALTER TABLE raw_material_types ADD COLUMN IF NOT EXISTS conversion_method VARCHAR(50);
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
ALTER TABLE raw_material_types ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE raw_material_types ADD COLUMN IF NOT EXISTS is_active INTEGER DEFAULT 1;
ALTER TABLE raw_material_types ADD COLUMN IF NOT EXISTS record_status INTEGER DEFAULT 1;
ALTER TABLE raw_material_types ADD COLUMN IF NOT EXISTS created_by VARCHAR;
ALTER TABLE raw_material_types ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE raw_material_types ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Auto-generate type_code for existing rows with null type_code
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

-- Add constraints for raw_material_types
DO $$
BEGIN
    -- Add unique constraint to type_code
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'raw_material_types_type_code_key') THEN
        ALTER TABLE raw_material_types ADD CONSTRAINT raw_material_types_type_code_key UNIQUE (type_code);
    END IF;
    
    -- Make type_code NOT NULL
    ALTER TABLE raw_material_types ALTER COLUMN type_code SET NOT NULL;
    
    -- Make type_name NOT NULL if it has data
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'raw_material_types' AND column_name = 'type_name') THEN
        UPDATE raw_material_types SET type_name = 'Unnamed Type' WHERE type_name IS NULL;
        ALTER TABLE raw_material_types ALTER COLUMN type_name SET NOT NULL;
    END IF;
    
    -- Add foreign key for created_by
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'raw_material_types_created_by_users_id_fk') THEN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
            ALTER TABLE raw_material_types ADD CONSTRAINT raw_material_types_created_by_users_id_fk
                FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
        END IF;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Some constraints already exist or cannot be added';
END $$;

-- =====================================================
-- 5. PRODUCTS - Add Missing Columns
-- =====================================================

ALTER TABLE products ADD COLUMN IF NOT EXISTS product_code VARCHAR(50);
ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id VARCHAR;
ALTER TABLE products ADD COLUMN IF NOT EXISTS type_id VARCHAR;
ALTER TABLE products ADD COLUMN IF NOT EXISTS base_price INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sku VARCHAR(100);
ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode VARCHAR(100);
ALTER TABLE products ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(20);
ALTER TABLE products ADD COLUMN IF NOT EXISTS gst_rate INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS reorder_level INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS max_stock_level INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS bottle_size VARCHAR(50);
ALTER TABLE products ADD COLUMN IF NOT EXISTS case_configuration VARCHAR(100);
ALTER TABLE products ADD COLUMN IF NOT EXISTS weight_per_case INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_visible_in_production INTEGER DEFAULT 1;

-- Add foreign keys if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_category_id_product_categories_id_fk') THEN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product_categories') THEN
            ALTER TABLE products ADD CONSTRAINT products_category_id_product_categories_id_fk
                FOREIGN KEY (category_id) REFERENCES product_categories(id) ON DELETE SET NULL;
        END IF;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_type_id_product_types_id_fk') THEN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product_types') THEN
            ALTER TABLE products ADD CONSTRAINT products_type_id_product_types_id_fk
                FOREIGN KEY (type_id) REFERENCES product_types(id) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

-- =====================================================
-- 6. RAW_MATERIALS - Add Missing Columns
-- =====================================================

ALTER TABLE raw_materials ADD COLUMN IF NOT EXISTS weight_per_unit INTEGER;
ALTER TABLE raw_materials ADD COLUMN IF NOT EXISTS conversion_type VARCHAR(50);
ALTER TABLE raw_materials ADD COLUMN IF NOT EXISTS conversion_value INTEGER;
ALTER TABLE raw_materials ADD COLUMN IF NOT EXISTS weight_per_piece INTEGER;
ALTER TABLE raw_materials ADD COLUMN IF NOT EXISTS loss_percent INTEGER DEFAULT 0;
ALTER TABLE raw_materials ADD COLUMN IF NOT EXISTS base_unit VARCHAR(50);
ALTER TABLE raw_materials ADD COLUMN IF NOT EXISTS max_stock_level INTEGER;
ALTER TABLE raw_materials ADD COLUMN IF NOT EXISTS opening_date DATE;
ALTER TABLE raw_materials ADD COLUMN IF NOT EXISTS is_opening_stock_only INTEGER DEFAULT 1;
ALTER TABLE raw_materials ADD COLUMN IF NOT EXISTS opening_stock INTEGER;
ALTER TABLE raw_materials ADD COLUMN IF NOT EXISTS closing_stock INTEGER;
ALTER TABLE raw_materials ADD COLUMN IF NOT EXISTS closing_stock_usable INTEGER;
ALTER TABLE raw_materials ADD COLUMN IF NOT EXISTS received_quantity INTEGER;
ALTER TABLE raw_materials ADD COLUMN IF NOT EXISTS returned_quantity INTEGER;
ALTER TABLE raw_materials ADD COLUMN IF NOT EXISTS adjustments INTEGER;
ALTER TABLE raw_materials ADD COLUMN IF NOT EXISTS type_id VARCHAR;

-- Add foreign key if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'raw_materials_type_id_raw_material_types_id_fk') THEN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'raw_material_types') THEN
            ALTER TABLE raw_materials ADD CONSTRAINT raw_materials_type_id_raw_material_types_id_fk
                FOREIGN KEY (type_id) REFERENCES raw_material_types(id) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

-- Change is_active to VARCHAR if currently INTEGER
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
        
        ALTER TABLE raw_materials ALTER COLUMN is_active SET DEFAULT 'true';
    END IF;
END $$;

-- Make uom_id nullable
ALTER TABLE raw_materials ALTER COLUMN uom_id DROP NOT NULL;

-- =====================================================
-- 7. MACHINES - Add Missing Column
-- =====================================================

ALTER TABLE machines ADD COLUMN IF NOT EXISTS warmup_time_minutes INTEGER;

-- =====================================================
-- 8. RAW_MATERIAL_ISSUANCE - Add Missing Column
-- =====================================================

ALTER TABLE raw_material_issuance ADD COLUMN IF NOT EXISTS production_reference VARCHAR(255);

-- =====================================================
-- 9. RAW_MATERIAL_ISSUANCE_ITEMS - Add Missing Columns
-- =====================================================

ALTER TABLE raw_material_issuance_items ADD COLUMN IF NOT EXISTS base_quantity INTEGER;
ALTER TABLE raw_material_issuance_items ADD COLUMN IF NOT EXISTS derived_quantity INTEGER;
ALTER TABLE raw_material_issuance_items ADD COLUMN IF NOT EXISTS derived_unit VARCHAR(50);

-- =====================================================
-- 10. GATEPASSES - Add Missing Columns
-- =====================================================

ALTER TABLE gatepasses ADD COLUMN IF NOT EXISTS cases_count INTEGER;
ALTER TABLE gatepasses ADD COLUMN IF NOT EXISTS security_seal_no VARCHAR(100);
ALTER TABLE gatepasses ADD COLUMN IF NOT EXISTS is_cluster INTEGER DEFAULT 0;
ALTER TABLE gatepasses ADD COLUMN IF NOT EXISTS invoice_id VARCHAR;
ALTER TABLE gatepasses ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'generated';
ALTER TABLE gatepasses ADD COLUMN IF NOT EXISTS out_time TIMESTAMP;
ALTER TABLE gatepasses ADD COLUMN IF NOT EXISTS in_time TIMESTAMP;
ALTER TABLE gatepasses ADD COLUMN IF NOT EXISTS verified_by VARCHAR(255);
ALTER TABLE gatepasses ADD COLUMN IF NOT EXISTS pod_received_by VARCHAR(255);
ALTER TABLE gatepasses ADD COLUMN IF NOT EXISTS pod_date TIMESTAMP;
ALTER TABLE gatepasses ADD COLUMN IF NOT EXISTS pod_remarks TEXT;
ALTER TABLE gatepasses ADD COLUMN IF NOT EXISTS pod_signature TEXT;

-- Add constraints
DO $$
BEGIN
    -- Make is_cluster NOT NULL if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gatepasses' AND column_name = 'is_cluster') THEN
        ALTER TABLE gatepasses ALTER COLUMN is_cluster SET NOT NULL;
        ALTER TABLE gatepasses ALTER COLUMN is_cluster SET DEFAULT 0;
    END IF;
    
    -- Make status NOT NULL if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gatepasses' AND column_name = 'status') THEN
        UPDATE gatepasses SET status = 'generated' WHERE status IS NULL;
        ALTER TABLE gatepasses ALTER COLUMN status SET NOT NULL;
        ALTER TABLE gatepasses ALTER COLUMN status SET DEFAULT 'generated';
    END IF;
    
    -- Add unique constraint to invoice_id
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'gatepasses_invoice_id_key') THEN
        ALTER TABLE gatepasses ADD CONSTRAINT gatepasses_invoice_id_key UNIQUE (invoice_id);
    END IF;
    
    -- Add foreign key for invoice_id
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'gatepasses_invoice_id_invoices_id_fk') THEN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices') THEN
            ALTER TABLE gatepasses ADD CONSTRAINT gatepasses_invoice_id_invoices_id_fk
                FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

-- =====================================================
-- 11. CREATE INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS product_categories_code_index ON product_categories(code);
CREATE INDEX IF NOT EXISTS product_types_code_index ON product_types(code);
CREATE INDEX IF NOT EXISTS raw_material_types_type_code_index ON raw_material_types(type_code);
CREATE INDEX IF NOT EXISTS raw_material_types_conversion_method_index ON raw_material_types(conversion_method);
CREATE INDEX IF NOT EXISTS products_product_code_index ON products(product_code);
CREATE INDEX IF NOT EXISTS products_category_id_index ON products(category_id);
CREATE INDEX IF NOT EXISTS products_type_id_index ON products(type_id);
CREATE INDEX IF NOT EXISTS raw_materials_type_id_index ON raw_materials(type_id);
CREATE INDEX IF NOT EXISTS gatepasses_invoice_id_index ON gatepasses(invoice_id);
CREATE INDEX IF NOT EXISTS gatepasses_status_index ON gatepasses(status);

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'SAFE MIGRATION COMPLETED SUCCESSFULLY!';
    RAISE NOTICE '';
    RAISE NOTICE 'Columns added (if missing):';
    RAISE NOTICE '  ✓ product_categories: code, display_order';
    RAISE NOTICE '  ✓ product_types: code, display_order';
    RAISE NOTICE '  ✓ notification_config: smtp_from_name';
    RAISE NOTICE '  ✓ raw_material_types: 19 columns (type_code, etc.)';
    RAISE NOTICE '  ✓ products: 14 columns';
    RAISE NOTICE '  ✓ raw_materials: 16 columns';
    RAISE NOTICE '  ✓ machines: warmup_time_minutes';
    RAISE NOTICE '  ✓ raw_material_issuance: production_reference';
    RAISE NOTICE '  ✓ raw_material_issuance_items: 3 columns';
    RAISE NOTICE '  ✓ gatepasses: 12 columns';
    RAISE NOTICE '';
    RAISE NOTICE 'Safe to run multiple times!';
    RAISE NOTICE '==============================================';
END $$;
