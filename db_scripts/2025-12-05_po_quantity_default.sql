-- Add default value to quantity column in purchase_orders table
-- Created: 2025-12-05
-- Purpose: For multi-item POs, quantity is stored in line items, so header quantity defaults to 0

ALTER TABLE purchase_orders ALTER COLUMN quantity SET DEFAULT 0;

-- Verify the change
SELECT column_name, column_default, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'purchase_orders' AND column_name = 'quantity';
