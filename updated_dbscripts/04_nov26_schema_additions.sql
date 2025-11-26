-- ============================================================
-- SCHEMA ADDITIONS SINCE NOV 25, 2025
-- Run this on OCI production and Mac localhost:5050 to sync
-- 
-- NOTE: Neon DB (Replit development) is already up to date!
--       This script is ONLY needed for Mac and OCI deployments.
--
-- Created: November 26, 2025
-- ============================================================

-- ==================== CASH REGISTER DAYS UPDATES ====================
-- Add new columns for reconciliation workflow

-- Actual closing balance (cash on hand when closing)
ALTER TABLE cash_register_days 
ADD COLUMN IF NOT EXISTS actual_closing_balance INTEGER;

-- Variance notes (explanation for any discrepancy)
ALTER TABLE cash_register_days 
ADD COLUMN IF NOT EXISTS variance_notes TEXT;

-- ==================== CASH REGISTER TRANSACTIONS UPDATES ====================
-- Add source type and document attachment columns

-- Source type for cash_received transactions
-- Values: 'secondary_sale', 'sale_cash', 'upi', 'bank_transfer', 'other'
ALTER TABLE cash_register_transactions 
ADD COLUMN IF NOT EXISTS source_type VARCHAR(50);

-- Document attachment path
ALTER TABLE cash_register_transactions 
ADD COLUMN IF NOT EXISTS document_path VARCHAR(500);

-- Document attachment filename
ALTER TABLE cash_register_transactions 
ADD COLUMN IF NOT EXISTS document_name VARCHAR(255);

-- ==================== EXPENSE CATEGORIES UPDATES ====================
-- Add GST-related columns

-- GST applicable flag (0 = No, 1 = Yes)
ALTER TABLE expense_categories 
ADD COLUMN IF NOT EXISTS gst_applicable INTEGER DEFAULT 0 NOT NULL;

-- Default GST rate for the category
ALTER TABLE expense_categories 
ADD COLUMN IF NOT EXISTS default_gst_rate NUMERIC(5,2) DEFAULT 0;

-- ==================== EXPENSE VOUCHERS STRUCTURE UPDATE ====================
-- The expense_vouchers table structure differs from original SQL
-- Add missing columns to match current schema

-- Purpose field
ALTER TABLE expense_vouchers 
ADD COLUMN IF NOT EXISTS purpose TEXT;

-- Prepared by reference
ALTER TABLE expense_vouchers 
ADD COLUMN IF NOT EXISTS prepared_by VARCHAR REFERENCES users(id);

-- Approved at timestamp  
ALTER TABLE expense_vouchers 
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;

-- ==================== EXPENSE ITEMS TABLE ====================
-- Note: Original SQL created 'expense_voucher_items' but schema uses 'expense_items'
-- Create expense_items if it doesn't exist (using correct name)

CREATE TABLE IF NOT EXISTS expense_items (
    id VARCHAR DEFAULT gen_random_uuid() PRIMARY KEY,
    voucher_id VARCHAR REFERENCES expense_vouchers(id) ON DELETE CASCADE NOT NULL,
    category_id VARCHAR REFERENCES expense_categories(id),
    
    description TEXT NOT NULL,
    quantity INTEGER DEFAULT 1 NOT NULL,
    unit_price INTEGER DEFAULT 0 NOT NULL,
    amount INTEGER DEFAULT 0 NOT NULL,
    
    -- GST details
    gst_rate NUMERIC(5,2) DEFAULT 0,
    gst_amount INTEGER DEFAULT 0 NOT NULL,
    
    -- Optional reference to purchase invoice
    reference_invoice_number VARCHAR(100),
    reference_invoice_date DATE,
    
    cost_center VARCHAR(100),
    remarks TEXT,
    
    record_status INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS expense_items_voucher_idx ON expense_items(voucher_id);
CREATE INDEX IF NOT EXISTS expense_items_category_idx ON expense_items(category_id);

-- ==================== EXPENSE ATTACHMENTS TABLE ====================
-- New table for expense voucher attachments (not in original SQL)

CREATE TABLE IF NOT EXISTS expense_attachments (
    id VARCHAR DEFAULT gen_random_uuid() PRIMARY KEY,
    voucher_id VARCHAR REFERENCES expense_vouchers(id) ON DELETE CASCADE NOT NULL,
    
    file_name VARCHAR(500) NOT NULL,
    file_type VARCHAR(100),
    file_size INTEGER,
    file_path TEXT NOT NULL,
    
    description TEXT,
    uploaded_by VARCHAR REFERENCES users(id),
    
    record_status INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS expense_attachments_voucher_idx ON expense_attachments(voucher_id);

-- ==================== DATA MIGRATION ====================
-- Migrate data from expense_voucher_items to expense_items if needed

INSERT INTO expense_items (
    id, voucher_id, category_id, description, quantity, unit_price, amount, 
    gst_rate, gst_amount, remarks, record_status, created_at
)
SELECT 
    id, voucher_id, category_id, description, 
    COALESCE(quantity::INTEGER, 1), 
    COALESCE(unit_price, 0), 
    COALESCE(amount, 0),
    COALESCE(tax_rate, 0), 
    COALESCE(tax_amount, 0), 
    remarks, record_status, created_at
FROM expense_voucher_items
WHERE NOT EXISTS (SELECT 1 FROM expense_items WHERE expense_items.id = expense_voucher_items.id)
ON CONFLICT DO NOTHING;

-- ==================== VERIFICATION QUERIES ====================
-- Run these to verify the schema is correct

-- Check cash_register_days columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'cash_register_days'
ORDER BY ordinal_position;

-- Check cash_register_transactions columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'cash_register_transactions'
ORDER BY ordinal_position;

-- Check expense_items exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'expense_items'
) AS expense_items_exists;

-- Check expense_attachments exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'expense_attachments'
) AS expense_attachments_exists;

-- ============================================================
-- END OF SCRIPT
-- ============================================================
