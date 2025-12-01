-- Migration: Fix gatepass legacy columns
-- Date: 2025-12-01
-- Description: The gatepasses table has legacy columns that are NOT NULL but no longer used.
--              The current schema tracks items in gatepass_items table instead.
--              This script makes these columns nullable to allow gatepass creation.

-- Fix ALL legacy columns - make them nullable
-- Run each statement, ignore errors if column doesn't exist

DO $$ 
BEGIN
    -- finished_goods_id
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gatepasses' AND column_name = 'finished_goods_id') THEN
        EXECUTE 'ALTER TABLE gatepasses ALTER COLUMN finished_goods_id DROP NOT NULL';
        RAISE NOTICE 'Fixed: finished_goods_id';
    END IF;
    
    -- quantity_dispatched
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gatepasses' AND column_name = 'quantity_dispatched') THEN
        EXECUTE 'ALTER TABLE gatepasses ALTER COLUMN quantity_dispatched DROP NOT NULL';
        RAISE NOTICE 'Fixed: quantity_dispatched';
    END IF;
    
    -- dispatch_date
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gatepasses' AND column_name = 'dispatch_date') THEN
        EXECUTE 'ALTER TABLE gatepasses ALTER COLUMN dispatch_date DROP NOT NULL';
        RAISE NOTICE 'Fixed: dispatch_date';
    END IF;
    
    -- product_id
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gatepasses' AND column_name = 'product_id') THEN
        EXECUTE 'ALTER TABLE gatepasses ALTER COLUMN product_id DROP NOT NULL';
        RAISE NOTICE 'Fixed: product_id';
    END IF;
    
    -- product_name
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gatepasses' AND column_name = 'product_name') THEN
        EXECUTE 'ALTER TABLE gatepasses ALTER COLUMN product_name DROP NOT NULL';
        RAISE NOTICE 'Fixed: product_name';
    END IF;
    
    -- batch_number
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gatepasses' AND column_name = 'batch_number') THEN
        EXECUTE 'ALTER TABLE gatepasses ALTER COLUMN batch_number DROP NOT NULL';
        RAISE NOTICE 'Fixed: batch_number';
    END IF;
    
    -- unit_price
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gatepasses' AND column_name = 'unit_price') THEN
        EXECUTE 'ALTER TABLE gatepasses ALTER COLUMN unit_price DROP NOT NULL';
        RAISE NOTICE 'Fixed: unit_price';
    END IF;
    
    -- total_amount
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gatepasses' AND column_name = 'total_amount') THEN
        EXECUTE 'ALTER TABLE gatepasses ALTER COLUMN total_amount DROP NOT NULL';
        RAISE NOTICE 'Fixed: total_amount';
    END IF;

END $$;

-- Verify the changes - show all columns and their nullability
SELECT column_name, is_nullable, data_type 
FROM information_schema.columns 
WHERE table_name = 'gatepasses' 
ORDER BY ordinal_position;
