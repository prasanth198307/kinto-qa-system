-- Add ALL missing columns to purchase_orders table
-- Created: 2025-12-05
-- Purpose: Ensure production database matches schema

-- Vendor selection
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS vendor_id VARCHAR(255);

-- Price columns (for old single-item PO format, not used in multi-item)
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS unit_price INTEGER;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS total_amount INTEGER;

-- Set default for quantity since multi-item POs use line items
ALTER TABLE purchase_orders ALTER COLUMN quantity SET DEFAULT 0;

-- Verify all columns exist
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'purchase_orders' 
ORDER BY ordinal_position;
