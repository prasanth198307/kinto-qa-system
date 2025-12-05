-- Add vendor_id column to purchase_orders table
-- Created: 2025-12-05
-- Purpose: Link purchase orders to vendors table

ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS vendor_id VARCHAR(255);

-- Verify the change
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'purchase_orders' AND column_name = 'vendor_id';
