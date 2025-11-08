-- Complete Fix for Mac Invoices Table
-- This adds ALL missing columns to match Replit schema
-- Run this on your Mac database

BEGIN;

-- Template and T&C References
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS template_id VARCHAR;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS terms_conditions_id VARCHAR;

-- Seller Details
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS seller_gstin VARCHAR(15);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS seller_name VARCHAR(255);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS seller_address TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS seller_state VARCHAR(100);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS seller_state_code VARCHAR(2);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS seller_phone VARCHAR(50);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS seller_email VARCHAR(255);

-- Buyer Details (Bill To)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS buyer_gstin VARCHAR(15);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS buyer_state VARCHAR(100);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS buyer_state_code VARCHAR(2);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS buyer_contact VARCHAR(50);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS is_cluster INTEGER DEFAULT 0 NOT NULL;

-- Ship To Details
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS ship_to_name VARCHAR(255);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS ship_to_address TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS ship_to_city VARCHAR(100);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS ship_to_state VARCHAR(100);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS ship_to_pincode VARCHAR(10);

-- Amounts (stored as integers in paise)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS subtotal INTEGER;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS cgst_amount INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS sgst_amount INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS igst_amount INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS cess_amount INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS round_off INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS total_amount INTEGER;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS amount_received INTEGER DEFAULT 0 NOT NULL;

-- Payment Details
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_terms VARCHAR(255);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS bank_name VARCHAR(255);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(50);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS bank_ifsc_code VARCHAR(11);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS account_holder_name VARCHAR(255);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS branch_name VARCHAR(255);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS upi_id VARCHAR(100);

-- Other Details
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS place_of_supply VARCHAR(100);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS reverse_charge INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS transport_mode VARCHAR(50);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS vehicle_number VARCHAR(50);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS date_of_supply TIMESTAMP;

-- *** CRITICAL: Status Tracking & Dispatch Workflow Columns ***
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft' NOT NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS dispatch_date TIMESTAMP;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS delivery_date TIMESTAMP;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS received_by VARCHAR(255);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS pod_remarks TEXT;

-- Make sure old column names still exist (if your old schema used these)
-- Uncomment if needed:
-- ALTER TABLE invoices ADD COLUMN IF NOT EXISTS buyer_name VARCHAR(255);
-- ALTER TABLE invoices ADD COLUMN IF NOT EXISTS buyer_address TEXT;
-- ALTER TABLE invoices ADD COLUMN IF NOT EXISTS remarks TEXT;
-- ALTER TABLE invoices ADD COLUMN IF NOT EXISTS generated_by VARCHAR;

COMMIT;

-- Verify the columns were added
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'invoices' 
  AND column_name IN ('status', 'dispatch_date', 'delivery_date', 'received_by', 'pod_remarks', 'subtotal', 'cgst_amount', 'sgst_amount', 'igst_amount')
ORDER BY column_name;
