-- ============================================================
-- COMPLETE Migration Script for Cash Register Import
-- Date: 2025-11-26
-- Run this on your Mac (localhost:5050) database
-- ============================================================

-- ============================================================
-- EXPENSE_VOUCHERS TABLE - All columns
-- ============================================================

-- Base columns (should already exist, but adding for safety)
ALTER TABLE expense_vouchers ADD COLUMN IF NOT EXISTS voucher_number VARCHAR(50);
ALTER TABLE expense_vouchers ADD COLUMN IF NOT EXISTS voucher_date DATE;
ALTER TABLE expense_vouchers ADD COLUMN IF NOT EXISTS payee_type VARCHAR(20);
ALTER TABLE expense_vouchers ADD COLUMN IF NOT EXISTS payee_id VARCHAR(255);
ALTER TABLE expense_vouchers ADD COLUMN IF NOT EXISTS payee_name VARCHAR(255);
ALTER TABLE expense_vouchers ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(50);
ALTER TABLE expense_vouchers ADD COLUMN IF NOT EXISTS prepared_by VARCHAR(255);

-- Payment details columns
ALTER TABLE expense_vouchers ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100);
ALTER TABLE expense_vouchers ADD COLUMN IF NOT EXISTS cheque_number VARCHAR(50);
ALTER TABLE expense_vouchers ADD COLUMN IF NOT EXISTS transaction_reference VARCHAR(100);

-- Amount columns (stored in paise)
ALTER TABLE expense_vouchers ADD COLUMN IF NOT EXISTS subtotal INTEGER DEFAULT 0;
ALTER TABLE expense_vouchers ADD COLUMN IF NOT EXISTS gst_amount INTEGER DEFAULT 0;
ALTER TABLE expense_vouchers ADD COLUMN IF NOT EXISTS total_amount INTEGER DEFAULT 0;

-- Workflow columns
ALTER TABLE expense_vouchers ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'draft';
ALTER TABLE expense_vouchers ADD COLUMN IF NOT EXISTS purpose TEXT;
ALTER TABLE expense_vouchers ADD COLUMN IF NOT EXISTS remarks TEXT;

-- Audit trail columns
ALTER TABLE expense_vouchers ADD COLUMN IF NOT EXISTS approved_by VARCHAR(255);
ALTER TABLE expense_vouchers ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;

-- System columns
ALTER TABLE expense_vouchers ADD COLUMN IF NOT EXISTS record_status INTEGER DEFAULT 1;
ALTER TABLE expense_vouchers ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE expense_vouchers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- ============================================================
-- EXPENSE_ITEMS TABLE - All columns
-- ============================================================

-- Base columns
ALTER TABLE expense_items ADD COLUMN IF NOT EXISTS voucher_id VARCHAR(255);
ALTER TABLE expense_items ADD COLUMN IF NOT EXISTS category_id VARCHAR(255);
ALTER TABLE expense_items ADD COLUMN IF NOT EXISTS description TEXT;

-- Amount columns
ALTER TABLE expense_items ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1;
ALTER TABLE expense_items ADD COLUMN IF NOT EXISTS unit_price INTEGER DEFAULT 0;
ALTER TABLE expense_items ADD COLUMN IF NOT EXISTS amount INTEGER DEFAULT 0;

-- GST columns
ALTER TABLE expense_items ADD COLUMN IF NOT EXISTS gst_rate NUMERIC(5,2) DEFAULT 0;
ALTER TABLE expense_items ADD COLUMN IF NOT EXISTS gst_amount INTEGER DEFAULT 0;

-- Reference columns
ALTER TABLE expense_items ADD COLUMN IF NOT EXISTS reference_invoice_number VARCHAR(100);
ALTER TABLE expense_items ADD COLUMN IF NOT EXISTS reference_invoice_date DATE;
ALTER TABLE expense_items ADD COLUMN IF NOT EXISTS cost_center VARCHAR(100);
ALTER TABLE expense_items ADD COLUMN IF NOT EXISTS remarks TEXT;

-- System columns
ALTER TABLE expense_items ADD COLUMN IF NOT EXISTS record_status INTEGER DEFAULT 1;
ALTER TABLE expense_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE expense_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- ============================================================
-- VERIFY - Show all columns
-- ============================================================

SELECT 'expense_vouchers' as table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'expense_vouchers'
UNION ALL
SELECT 'expense_items' as table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'expense_items'
ORDER BY table_name, column_name;
