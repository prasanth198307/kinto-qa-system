-- Migration: Fix raw_material_issuance table schema
-- Date: 2025-12-02
-- Purpose: Remove legacy raw_material_id column from raw_material_issuance header table
-- Background: Raw material IDs are now stored in raw_material_issuance_items table (header-detail pattern)
--             The main issuance table tracks the issuance metadata only.

-- Step 1: Drop the NOT NULL constraint on raw_material_id if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'raw_material_issuance' 
        AND column_name = 'raw_material_id'
    ) THEN
        ALTER TABLE raw_material_issuance ALTER COLUMN raw_material_id DROP NOT NULL;
        RAISE NOTICE 'Made raw_material_id nullable in raw_material_issuance';
    ELSE
        RAISE NOTICE 'Column raw_material_id does not exist in raw_material_issuance - no action needed';
    END IF;
END $$;

-- Step 2: (Optional) Drop the column entirely since it's no longer used
-- Uncomment the following if you want to remove the column completely:
-- ALTER TABLE raw_material_issuance DROP COLUMN IF EXISTS raw_material_id;

-- Step 3: Also handle other legacy columns that might be NOT NULL
DO $$
BEGIN
    -- Handle quantity_issued if it exists on header
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'raw_material_issuance' 
        AND column_name = 'quantity_issued'
    ) THEN
        ALTER TABLE raw_material_issuance ALTER COLUMN quantity_issued DROP NOT NULL;
        RAISE NOTICE 'Made quantity_issued nullable in raw_material_issuance';
    END IF;
    
    -- Handle uom_id if it exists on header
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'raw_material_issuance' 
        AND column_name = 'uom_id'
    ) THEN
        ALTER TABLE raw_material_issuance ALTER COLUMN uom_id DROP NOT NULL;
        RAISE NOTICE 'Made uom_id nullable in raw_material_issuance';
    END IF;
END $$;

-- Verification query:
-- SELECT column_name, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'raw_material_issuance'
-- ORDER BY ordinal_position;
