-- Migration: Add discount mode tracking to invoice items
-- Purpose: Track whether discount is in percentage (%) or flat rupees (₹)
-- Author: Claude
-- Date: 2026-04-03

-- Add discountMode column to invoice_items table
-- Values: '%' (percentage) or '₹' (rupees). Default: '%' (percentage mode)
ALTER TABLE invoice_items 
ADD COLUMN IF NOT EXISTS discount_mode VARCHAR(5) DEFAULT '%' NOT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN invoice_items.discount_mode IS 'Discount type: % (percentage) or ₹ (flat rupees amount)';

-- Ensure all existing records have a discount_mode set to '%' (default)
UPDATE invoice_items 
SET discount_mode = '%' 
WHERE discount_mode IS NULL;

-- Create index on discount_mode for faster filtering if needed
CREATE INDEX IF NOT EXISTS idx_invoice_items_discount_mode ON invoice_items(discount_mode);
