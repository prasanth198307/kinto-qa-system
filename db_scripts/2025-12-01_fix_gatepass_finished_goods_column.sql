-- Migration: Fix gatepass finished_goods_id column
-- Date: 2025-12-01
-- Description: The gatepasses table has a legacy finished_goods_id column marked as NOT NULL
--              but this column is no longer used (finished goods are now tracked per gatepass_item).
--              This script removes the NOT NULL constraint to allow gatepass creation.

-- Option 1: Make the column nullable (safer, preserves existing data)
ALTER TABLE gatepasses ALTER COLUMN finished_goods_id DROP NOT NULL;

-- Option 2: If you want to completely remove the legacy column (uncomment below)
-- WARNING: Only run this if you're sure no code depends on this column
-- ALTER TABLE gatepasses DROP COLUMN IF EXISTS finished_goods_id;

-- Verify the change
SELECT column_name, is_nullable, data_type 
FROM information_schema.columns 
WHERE table_name = 'gatepasses' AND column_name = 'finished_goods_id';
