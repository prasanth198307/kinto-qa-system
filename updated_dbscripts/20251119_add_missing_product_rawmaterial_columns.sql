-- Migration: Add Missing Columns to Products and Raw Materials Tables
-- Date: 2025-11-19
-- Description: Adds new columns that exist in schema.ts but missing from baseline schema

-- =====================================================
-- PRODUCTS TABLE - Add Missing Columns
-- =====================================================

-- Add SKU Code
ALTER TABLE products ADD COLUMN IF NOT EXISTS sku_code VARCHAR(100);
CREATE UNIQUE INDEX IF NOT EXISTS products_sku_code_unique ON products(sku_code) WHERE sku_code IS NOT NULL;

-- Add Category and Type IDs (for relationships with master tables)
ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id VARCHAR;
ALTER TABLE products ADD COLUMN IF NOT EXISTS type_id VARCHAR;

-- Add Product Type (legacy field)
ALTER TABLE products ADD COLUMN IF NOT EXISTS product_type VARCHAR(100);

-- Add Packaging & Conversion Details
ALTER TABLE products ADD COLUMN IF NOT EXISTS base_unit VARCHAR(50);
ALTER TABLE products ADD COLUMN IF NOT EXISTS derived_unit VARCHAR(50);
ALTER TABLE products ADD COLUMN IF NOT EXISTS conversion_method VARCHAR(50);
ALTER TABLE products ADD COLUMN IF NOT EXISTS derived_value_per_base NUMERIC(10,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS weight_per_base NUMERIC(10,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS weight_per_derived NUMERIC(10,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS default_loss_percent NUMERIC(5,2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS usable_derived_units NUMERIC(12,4);
ALTER TABLE products ADD COLUMN IF NOT EXISTS net_volume INTEGER;

-- Add Pricing & Tax Information
ALTER TABLE products ADD COLUMN IF NOT EXISTS base_price INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS gst_percent NUMERIC(5,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS total_price INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS mrp INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(50);
ALTER TABLE products ADD COLUMN IF NOT EXISTS sac_code VARCHAR(50);
ALTER TABLE products ADD COLUMN IF NOT EXISTS tax_type VARCHAR(50);
ALTER TABLE products ADD COLUMN IF NOT EXISTS minimum_stock_level NUMERIC(10,2);

-- Add Active Status and Created By
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active VARCHAR DEFAULT 'true';
ALTER TABLE products ADD COLUMN IF NOT EXISTS created_by VARCHAR;
ALTER TABLE products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT now();

-- Add Foreign Keys for Products
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_category_id_product_categories_id_fk') THEN
        ALTER TABLE products ADD CONSTRAINT products_category_id_product_categories_id_fk
            FOREIGN KEY (category_id) REFERENCES product_categories(id) ON DELETE SET NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_type_id_product_types_id_fk') THEN
        ALTER TABLE products ADD CONSTRAINT products_type_id_product_types_id_fk
            FOREIGN KEY (type_id) REFERENCES product_types(id) ON DELETE SET NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_created_by_users_id_fk') THEN
        ALTER TABLE products ADD CONSTRAINT products_created_by_users_id_fk
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- =====================================================
-- RAW_MATERIALS TABLE - Add Missing Columns
-- =====================================================

-- Add Type ID relationship
ALTER TABLE raw_materials ADD COLUMN IF NOT EXISTS type_id VARCHAR;

-- Add Stock Management Columns
ALTER TABLE raw_materials ADD COLUMN IF NOT EXISTS is_opening_stock_only INTEGER DEFAULT 1;
ALTER TABLE raw_materials ADD COLUMN IF NOT EXISTS opening_stock INTEGER DEFAULT 0;
ALTER TABLE raw_materials ADD COLUMN IF NOT EXISTS received_quantity INTEGER DEFAULT 0;
ALTER TABLE raw_materials ADD COLUMN IF NOT EXISTS returned_quantity INTEGER DEFAULT 0;
ALTER TABLE raw_materials ADD COLUMN IF NOT EXISTS adjustments INTEGER DEFAULT 0;
ALTER TABLE raw_materials ADD COLUMN IF NOT EXISTS closing_stock INTEGER;
ALTER TABLE raw_materials ADD COLUMN IF NOT EXISTS closing_stock_usable INTEGER;

-- Add Unit and Conversion Columns
ALTER TABLE raw_materials ADD COLUMN IF NOT EXISTS base_unit VARCHAR(50);
ALTER TABLE raw_materials ADD COLUMN IF NOT EXISTS derived_unit VARCHAR(50);

-- Add Active Status and Created By
ALTER TABLE raw_materials ADD COLUMN IF NOT EXISTS is_active INTEGER DEFAULT 1;
ALTER TABLE raw_materials ADD COLUMN IF NOT EXISTS created_by VARCHAR;
ALTER TABLE raw_materials ADD COLUMN IF NOT EXISTS updated_by VARCHAR;

-- Update existing timestamp column if needed
ALTER TABLE raw_materials ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT now();

-- Add Foreign Key for Raw Material Type
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'raw_materials_type_id_raw_material_types_id_fk') THEN
        ALTER TABLE raw_materials ADD CONSTRAINT raw_materials_type_id_raw_material_types_id_fk
            FOREIGN KEY (type_id) REFERENCES raw_material_types(id) ON DELETE SET NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'raw_materials_created_by_users_id_fk') THEN
        ALTER TABLE raw_materials ADD CONSTRAINT raw_materials_created_by_users_id_fk
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'raw_materials_updated_by_users_id_fk') THEN
        ALTER TABLE raw_materials ADD CONSTRAINT raw_materials_updated_by_users_id_fk
            FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- =====================================================
-- CREATE INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS products_category_id_index ON products(category_id);
CREATE INDEX IF NOT EXISTS products_type_id_index ON products(type_id);
CREATE INDEX IF NOT EXISTS products_is_active_index ON products(is_active);

CREATE INDEX IF NOT EXISTS raw_materials_type_id_index ON raw_materials(type_id);
CREATE INDEX IF NOT EXISTS raw_materials_is_active_index ON raw_materials(is_active);

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE 'Added missing columns to products and raw_materials tables';
END $$;
