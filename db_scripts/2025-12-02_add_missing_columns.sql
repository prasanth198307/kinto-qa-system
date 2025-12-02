-- Migration: Add missing columns to local database
-- Date: 2025-12-02
-- Purpose: Sync local database schema with Replit codebase

-- =========================================
-- 1. Production Entries - empty_bottles_used
-- =========================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'production_entries' 
        AND column_name = 'empty_bottles_used'
    ) THEN
        ALTER TABLE production_entries ADD COLUMN empty_bottles_used NUMERIC(12, 2) DEFAULT '0';
        RAISE NOTICE 'Added empty_bottles_used column to production_entries';
    ELSE
        RAISE NOTICE 'Column empty_bottles_used already exists in production_entries';
    END IF;
END $$;

-- =========================================
-- 2. Raw Material Issuance - make legacy columns nullable
-- =========================================
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'raw_material_issuance' 
        AND column_name = 'raw_material_id'
    ) THEN
        ALTER TABLE raw_material_issuance ALTER COLUMN raw_material_id DROP NOT NULL;
        RAISE NOTICE 'Made raw_material_id nullable in raw_material_issuance';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'raw_material_issuance' 
        AND column_name = 'quantity_issued'
    ) THEN
        ALTER TABLE raw_material_issuance ALTER COLUMN quantity_issued DROP NOT NULL;
        RAISE NOTICE 'Made quantity_issued nullable in raw_material_issuance';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'raw_material_issuance' 
        AND column_name = 'uom_id'
    ) THEN
        ALTER TABLE raw_material_issuance ALTER COLUMN uom_id DROP NOT NULL;
        RAISE NOTICE 'Made uom_id nullable in raw_material_issuance';
    END IF;
END $$;

-- =========================================
-- 3. Raw Material Issuance - add missing header columns
-- =========================================
DO $$
BEGIN
    -- Add product_id if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'raw_material_issuance' 
        AND column_name = 'product_id'
    ) THEN
        ALTER TABLE raw_material_issuance ADD COLUMN product_id VARCHAR;
        RAISE NOTICE 'Added product_id column to raw_material_issuance';
    END IF;
    
    -- Add bom_configuration_id if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'raw_material_issuance' 
        AND column_name = 'bom_configuration_id'
    ) THEN
        ALTER TABLE raw_material_issuance ADD COLUMN bom_configuration_id VARCHAR;
        RAISE NOTICE 'Added bom_configuration_id column to raw_material_issuance';
    END IF;
    
    -- Add planned_output if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'raw_material_issuance' 
        AND column_name = 'planned_output'
    ) THEN
        ALTER TABLE raw_material_issuance ADD COLUMN planned_output NUMERIC(12, 2);
        RAISE NOTICE 'Added planned_output column to raw_material_issuance';
    END IF;
    
    -- Add production_reference if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'raw_material_issuance' 
        AND column_name = 'production_reference'
    ) THEN
        ALTER TABLE raw_material_issuance ADD COLUMN production_reference TEXT;
        RAISE NOTICE 'Added production_reference column to raw_material_issuance';
    END IF;
END $$;

-- =========================================
-- 4. Raw Material Issuance Items - create table if missing
-- =========================================
CREATE TABLE IF NOT EXISTS raw_material_issuance_items (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
    issuance_id VARCHAR NOT NULL,
    raw_material_id VARCHAR NOT NULL,
    product_id VARCHAR,
    quantity_issued NUMERIC(12, 2) NOT NULL DEFAULT '0',
    suggested_quantity NUMERIC(12, 2),
    calculation_basis VARCHAR,
    uom_id VARCHAR,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add index on issuance_id for better query performance
CREATE INDEX IF NOT EXISTS idx_issuance_items_issuance_id ON raw_material_issuance_items(issuance_id);

-- =========================================
-- 5. Verification
-- =========================================
-- Run these queries to verify the changes:
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'production_entries' AND column_name = 'empty_bottles_used';
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'raw_material_issuance' ORDER BY ordinal_position;
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'raw_material_issuance_items' ORDER BY ordinal_position;
