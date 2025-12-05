-- Add manual vendor entry fields to purchase_orders table
-- Created: 2025-12-05
-- Purpose: Allow PO creation without requiring an existing vendor record

-- Add new columns for manual vendor entry
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS vendor_name VARCHAR(255);
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS vendor_address TEXT;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS vendor_gst VARCHAR(20);
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS vendor_phone VARCHAR(20);
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS vendor_email VARCHAR(255);

-- Add comments for documentation
COMMENT ON COLUMN purchase_orders.vendor_name IS 'Manually entered vendor name (used when vendor_id is null)';
COMMENT ON COLUMN purchase_orders.vendor_address IS 'Manually entered vendor address';
COMMENT ON COLUMN purchase_orders.vendor_gst IS 'Manually entered vendor GSTIN';
COMMENT ON COLUMN purchase_orders.vendor_phone IS 'Manually entered vendor phone number';
COMMENT ON COLUMN purchase_orders.vendor_email IS 'Manually entered vendor email address';
