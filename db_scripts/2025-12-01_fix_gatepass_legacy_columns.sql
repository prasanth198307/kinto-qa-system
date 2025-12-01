-- Migration: Fix gatepass legacy columns
-- Date: 2025-12-01
-- Description: The gatepasses table has legacy columns that are NOT NULL but no longer used.
--              The current schema tracks items in gatepass_items table instead.
--              This script makes these columns nullable to allow gatepass creation.

-- Fix legacy columns - make them nullable
ALTER TABLE gatepasses ALTER COLUMN finished_goods_id DROP NOT NULL;
ALTER TABLE gatepasses ALTER COLUMN quantity_dispatched DROP NOT NULL;

-- In case there are other legacy columns, also fix these if they exist
DO $$ 
BEGIN
    -- product_id if exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gatepasses' AND column_name = 'product_id') THEN
        EXECUTE 'ALTER TABLE gatepasses ALTER COLUMN product_id DROP NOT NULL';
    END IF;
    
    -- product_name if exists  
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gatepasses' AND column_name = 'product_name') THEN
        EXECUTE 'ALTER TABLE gatepasses ALTER COLUMN product_name DROP NOT NULL';
    END IF;
END $$;

-- Verify the changes
SELECT column_name, is_nullable, data_type 
FROM information_schema.columns 
WHERE table_name = 'gatepasses' 
ORDER BY ordinal_position;
