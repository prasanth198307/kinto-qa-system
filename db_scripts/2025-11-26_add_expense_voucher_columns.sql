-- Migration Script: Add ALL missing columns to expense_vouchers table
-- Date: 2025-11-26
-- Description: Ensures expense_vouchers table has all required columns
-- Run this on your Mac (localhost:5050) database

-- Payment details columns
ALTER TABLE expense_vouchers ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100);
ALTER TABLE expense_vouchers ADD COLUMN IF NOT EXISTS cheque_number VARCHAR(50);
ALTER TABLE expense_vouchers ADD COLUMN IF NOT EXISTS transaction_reference VARCHAR(100);

-- Amount columns (stored in paise)
ALTER TABLE expense_vouchers ADD COLUMN IF NOT EXISTS subtotal INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE expense_vouchers ADD COLUMN IF NOT EXISTS gst_amount INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE expense_vouchers ADD COLUMN IF NOT EXISTS total_amount INTEGER DEFAULT 0 NOT NULL;

-- Workflow columns
ALTER TABLE expense_vouchers ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'draft' NOT NULL;
ALTER TABLE expense_vouchers ADD COLUMN IF NOT EXISTS purpose TEXT;
ALTER TABLE expense_vouchers ADD COLUMN IF NOT EXISTS remarks TEXT;

-- Audit trail columns
ALTER TABLE expense_vouchers ADD COLUMN IF NOT EXISTS approved_by VARCHAR(255);
ALTER TABLE expense_vouchers ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;

-- System columns
ALTER TABLE expense_vouchers ADD COLUMN IF NOT EXISTS record_status INTEGER DEFAULT 1 NOT NULL;
ALTER TABLE expense_vouchers ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE expense_vouchers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Verify all columns exist
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'expense_vouchers'
ORDER BY ordinal_position;
