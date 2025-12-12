-- Migration: Create Expense Tracking tables
-- Date: 2025-12-12
-- Description: Creates expense_categories, expense_vouchers, expense_items, and expense_attachments tables

-- =====================================================
-- EXPENSE CATEGORIES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS expense_categories (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    parent_id VARCHAR,
    gst_applicable INTEGER DEFAULT 0 NOT NULL,
    default_gst_rate NUMERIC(5, 2) DEFAULT 0,
    record_status INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- EXPENSE VOUCHERS TABLE (Header)
-- =====================================================
CREATE TABLE IF NOT EXISTS expense_vouchers (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    voucher_number VARCHAR(50) NOT NULL UNIQUE,
    voucher_date DATE NOT NULL,
    
    -- Payee information
    payee_type VARCHAR(20) NOT NULL,
    payee_id VARCHAR,
    payee_name VARCHAR(255) NOT NULL,
    
    -- Payment details
    payment_mode VARCHAR(50) NOT NULL,
    bank_name VARCHAR(100),
    cheque_number VARCHAR(50),
    transaction_reference VARCHAR(100),
    
    -- Amount summary (in paise)
    subtotal INTEGER DEFAULT 0 NOT NULL,
    gst_amount INTEGER DEFAULT 0 NOT NULL,
    total_amount INTEGER DEFAULT 0 NOT NULL,
    
    -- Workflow
    status VARCHAR(20) DEFAULT 'draft' NOT NULL,
    submitted_at TIMESTAMP,
    submitted_by VARCHAR REFERENCES users(id),
    approved_at TIMESTAMP,
    approved_by VARCHAR REFERENCES users(id),
    rejected_at TIMESTAMP,
    rejected_by VARCHAR REFERENCES users(id),
    rejection_reason TEXT,
    paid_at TIMESTAMP,
    paid_by VARCHAR REFERENCES users(id),
    
    -- Reference to cash register
    cash_register_day_id VARCHAR,
    
    purpose TEXT,
    notes TEXT,
    
    created_by VARCHAR REFERENCES users(id),
    record_status INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- EXPENSE ITEMS TABLE (Line Items)
-- =====================================================
CREATE TABLE IF NOT EXISTS expense_items (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    voucher_id VARCHAR REFERENCES expense_vouchers(id) ON DELETE CASCADE NOT NULL,
    
    description VARCHAR(500) NOT NULL,
    category_id VARCHAR REFERENCES expense_categories(id),
    
    -- Amount (in paise)
    amount INTEGER DEFAULT 0 NOT NULL,
    
    -- GST details (in basis points)
    gst_rate INTEGER DEFAULT 0,
    gst_amount INTEGER DEFAULT 0,
    total_amount INTEGER DEFAULT 0 NOT NULL,
    
    -- HSN/SAC code for GST
    hsn_sac_code VARCHAR(20),
    
    record_status INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- EXPENSE ATTACHMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS expense_attachments (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- =====================================================
-- INDEXES
-- =====================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_expense_vouchers_date') THEN
        CREATE INDEX idx_expense_vouchers_date ON expense_vouchers(voucher_date);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_expense_vouchers_status') THEN
        CREATE INDEX idx_expense_vouchers_status ON expense_vouchers(status);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_expense_vouchers_payee_id') THEN
        CREATE INDEX idx_expense_vouchers_payee_id ON expense_vouchers(payee_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_expense_items_voucher_id') THEN
        CREATE INDEX idx_expense_items_voucher_id ON expense_items(voucher_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_expense_items_category_id') THEN
        CREATE INDEX idx_expense_items_category_id ON expense_items(category_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_expense_attachments_voucher_id') THEN
        CREATE INDEX idx_expense_attachments_voucher_id ON expense_attachments(voucher_id);
    END IF;
END $$;

-- =====================================================
-- SEED DEFAULT EXPENSE CATEGORIES
-- =====================================================
INSERT INTO expense_categories (id, name, description, gst_applicable)
SELECT gen_random_uuid(), name, description, gst_applicable
FROM (VALUES
    ('Fuel', 'Diesel, Petrol, and other fuels', 1),
    ('Transport', 'Transportation and logistics expenses', 1),
    ('Maintenance', 'Equipment and facility maintenance', 1),
    ('Office Supplies', 'Stationery, consumables', 1),
    ('Utilities', 'Electricity, water, internet bills', 1),
    ('Salaries', 'Wages and salary payments', 0),
    ('Food & Beverages', 'Tea, snacks, meals', 0),
    ('Miscellaneous', 'Other miscellaneous expenses', 0)
) AS v(name, description, gst_applicable)
WHERE NOT EXISTS (SELECT 1 FROM expense_categories WHERE name = v.name);

SELECT 'Expense tracking tables created successfully' as status;
