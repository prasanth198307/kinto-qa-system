-- Add missing columns to purchase_orders table
-- Created: 2025-12-05
-- Purpose: Ensure all columns from schema exist in database

-- Add PO date column if missing
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS po_date TIMESTAMP DEFAULT NOW();

-- Add spare part reference if missing
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS spare_part_id VARCHAR(255);

-- Add urgency column if missing
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS urgency VARCHAR(50) DEFAULT 'medium';

-- Add status column if missing
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';

-- Add user references if missing
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS requested_by VARCHAR(255);
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS approved_by VARCHAR(255);
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS approved_date TIMESTAMP;

-- Add supplier and cost columns if missing
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS supplier VARCHAR(255);
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS estimated_cost INTEGER;

-- Add delivery columns if missing
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS expected_delivery_date TIMESTAMP;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS actual_delivery_date TIMESTAMP;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS delivery_address TEXT;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS payment_terms TEXT;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS transport_mode VARCHAR(100);

-- Add GST columns if missing
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS gst_applicable INTEGER DEFAULT 1;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS gst_rate INTEGER DEFAULT 1800;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS cgst_amount INTEGER;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS sgst_amount INTEGER;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS igst_amount INTEGER;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS grand_total INTEGER;

-- Add signature columns if missing
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS signature_image TEXT;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS include_signature INTEGER DEFAULT 1;

-- Add remarks and T&C if missing
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS remarks TEXT;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS terms_and_conditions TEXT;

-- Add record status if missing
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS record_status INTEGER DEFAULT 1 NOT NULL;

-- Add timestamps if missing
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Add manual vendor entry fields (from previous migration)
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS vendor_name VARCHAR(255);
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS vendor_address TEXT;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS vendor_gst VARCHAR(20);
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS vendor_phone VARCHAR(20);
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS vendor_email VARCHAR(255);

-- Verify the table structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'purchase_orders' 
ORDER BY ordinal_position;
