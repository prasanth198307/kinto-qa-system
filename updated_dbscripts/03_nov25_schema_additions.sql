-- ============================================================
-- SCHEMA ADDITIONS SINCE NOV 24, 2025
-- Run this on OCI production to sync with development
-- Created: November 25, 2025
-- ============================================================

-- ==================== DOCUMENT MANAGEMENT ====================

-- Document Categories
CREATE TABLE IF NOT EXISTS document_categories (
    id VARCHAR DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    record_status INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Documents
CREATE TABLE IF NOT EXISTS documents (
    id VARCHAR DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category_id VARCHAR REFERENCES document_categories(id),
    
    -- File information
    file_name VARCHAR(500) NOT NULL,
    file_type VARCHAR(100),
    file_size INTEGER,
    file_path TEXT NOT NULL,
    
    -- Related entity linking
    related_entity_type VARCHAR(50),
    related_entity_id VARCHAR,
    
    -- Document validity tracking
    document_date DATE,
    expiry_date DATE,
    
    -- Expiry alert tracking
    expiry_alert_sent INTEGER DEFAULT 0,
    expiry_alert_sent_at TIMESTAMP,
    
    -- Version control
    version_number INTEGER DEFAULT 1 NOT NULL,
    parent_document_id VARCHAR,
    
    tags TEXT[],
    remarks TEXT,
    
    uploaded_by VARCHAR REFERENCES users(id),
    record_status INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS documents_category_idx ON documents(category_id);
CREATE INDEX IF NOT EXISTS documents_related_entity_idx ON documents(related_entity_type, related_entity_id);
CREATE INDEX IF NOT EXISTS documents_expiry_idx ON documents(expiry_date);

-- ==================== EXPENSE TRACKING & VOUCHERS ====================

-- Expense Categories
CREATE TABLE IF NOT EXISTS expense_categories (
    id VARCHAR DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    parent_id VARCHAR,
    is_active INTEGER DEFAULT 1 NOT NULL,
    display_order INTEGER DEFAULT 0,
    record_status INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS expense_categories_parent_idx ON expense_categories(parent_id);

-- Expense Vouchers
CREATE TABLE IF NOT EXISTS expense_vouchers (
    id VARCHAR DEFAULT gen_random_uuid() PRIMARY KEY,
    voucher_number VARCHAR(50) NOT NULL UNIQUE,
    voucher_date DATE NOT NULL,
    
    -- Payee information
    payee_type VARCHAR(20) DEFAULT 'other' NOT NULL,
    payee_id VARCHAR,
    payee_name VARCHAR(200),
    
    -- Amounts
    subtotal INTEGER DEFAULT 0 NOT NULL,
    tax_amount INTEGER DEFAULT 0 NOT NULL,
    total_amount INTEGER DEFAULT 0 NOT NULL,
    
    -- Payment information
    payment_mode VARCHAR(30) DEFAULT 'cash' NOT NULL,
    payment_reference VARCHAR(100),
    bank_account VARCHAR(100),
    cheque_number VARCHAR(50),
    cheque_date DATE,
    
    -- GST Details
    has_gst INTEGER DEFAULT 0 NOT NULL,
    gst_number VARCHAR(20),
    cgst_amount INTEGER DEFAULT 0,
    sgst_amount INTEGER DEFAULT 0,
    igst_amount INTEGER DEFAULT 0,
    
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
    
    remarks TEXT,
    attachments JSONB,
    
    created_by VARCHAR REFERENCES users(id),
    record_status INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS expense_vouchers_date_idx ON expense_vouchers(voucher_date);
CREATE INDEX IF NOT EXISTS expense_vouchers_status_idx ON expense_vouchers(status);
CREATE INDEX IF NOT EXISTS expense_vouchers_payee_idx ON expense_vouchers(payee_type, payee_id);

-- Expense Voucher Items
CREATE TABLE IF NOT EXISTS expense_voucher_items (
    id VARCHAR DEFAULT gen_random_uuid() PRIMARY KEY,
    voucher_id VARCHAR REFERENCES expense_vouchers(id) ON DELETE CASCADE NOT NULL,
    
    category_id VARCHAR REFERENCES expense_categories(id),
    description TEXT NOT NULL,
    
    -- Amounts
    quantity NUMERIC(10,2) DEFAULT 1,
    unit_price INTEGER DEFAULT 0 NOT NULL,
    amount INTEGER DEFAULT 0 NOT NULL,
    
    -- GST on line item
    tax_rate NUMERIC(5,2) DEFAULT 0,
    tax_amount INTEGER DEFAULT 0,
    
    remarks TEXT,
    
    record_status INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS expense_voucher_items_voucher_idx ON expense_voucher_items(voucher_id);
CREATE INDEX IF NOT EXISTS expense_voucher_items_category_idx ON expense_voucher_items(category_id);

-- ==================== DAILY CASH REGISTER ====================

-- Cash Register Days
CREATE TABLE IF NOT EXISTS cash_register_days (
    id VARCHAR DEFAULT gen_random_uuid() PRIMARY KEY,
    register_date DATE NOT NULL,
    
    -- Salesperson/Staff
    salesperson_id VARCHAR REFERENCES users(id),
    salesperson_name VARCHAR(100) NOT NULL,
    
    -- Balances (in paise)
    opening_balance INTEGER DEFAULT 0 NOT NULL,
    closing_balance INTEGER DEFAULT 0 NOT NULL,
    
    -- Aggregated totals (in paise)
    total_deposits INTEGER DEFAULT 0 NOT NULL,
    total_cash_received INTEGER DEFAULT 0 NOT NULL,
    total_expenses INTEGER DEFAULT 0 NOT NULL,
    total_transfers INTEGER DEFAULT 0 NOT NULL,
    
    -- Reconciliation
    status VARCHAR(20) DEFAULT 'open' NOT NULL,
    reconciled_by VARCHAR REFERENCES users(id),
    reconciled_at TIMESTAMP,
    variance_amount INTEGER DEFAULT 0,
    
    notes TEXT,
    
    -- Discrepancy tracking
    has_discrepancy INTEGER DEFAULT 0 NOT NULL,
    discrepancy_details JSONB,
    
    -- Import tracking
    imported_from_file VARCHAR(500),
    imported_at TIMESTAMP,
    
    created_by VARCHAR REFERENCES users(id),
    record_status INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS cash_register_days_date_idx ON cash_register_days(register_date);
CREATE INDEX IF NOT EXISTS cash_register_days_salesperson_idx ON cash_register_days(salesperson_id);
CREATE INDEX IF NOT EXISTS cash_register_days_status_idx ON cash_register_days(status);

-- Cash Register Transactions
CREATE TABLE IF NOT EXISTS cash_register_transactions (
    id VARCHAR DEFAULT gen_random_uuid() PRIMARY KEY,
    day_id VARCHAR REFERENCES cash_register_days(id) ON DELETE CASCADE NOT NULL,
    
    transaction_type VARCHAR(30) NOT NULL,
    amount INTEGER DEFAULT 0 NOT NULL,
    
    reference VARCHAR(255),
    description TEXT,
    
    transfer_to VARCHAR(100),
    
    converted_to_voucher_id VARCHAR REFERENCES expense_vouchers(id),
    converted_at TIMESTAMP,
    
    record_status INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS cash_register_transactions_day_idx ON cash_register_transactions(day_id);

-- Cash Register Expense Items
CREATE TABLE IF NOT EXISTS cash_register_expense_items (
    id VARCHAR DEFAULT gen_random_uuid() PRIMARY KEY,
    transaction_id VARCHAR REFERENCES cash_register_transactions(id) ON DELETE CASCADE NOT NULL,
    
    item_label VARCHAR(255) NOT NULL,
    amount INTEGER DEFAULT 0 NOT NULL,
    
    expense_category_id VARCHAR REFERENCES expense_categories(id),
    raw_text VARCHAR(500),
    
    record_status INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS cash_register_expense_items_transaction_idx ON cash_register_expense_items(transaction_id);

-- Salesperson Mappings
CREATE TABLE IF NOT EXISTS salesperson_mappings (
    id VARCHAR DEFAULT gen_random_uuid() PRIMARY KEY,
    excel_name VARCHAR(100) NOT NULL UNIQUE,
    user_id VARCHAR REFERENCES users(id),
    display_name VARCHAR(100),
    is_active INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ==================== SEED DATA ====================

-- Default Document Categories
INSERT INTO document_categories (name, description) VALUES
    ('Contracts', 'Legal contracts and agreements'),
    ('Invoices', 'Invoice copies and receipts'),
    ('Certificates', 'Compliance and quality certificates'),
    ('Insurance', 'Insurance policies and claims'),
    ('Licenses', 'Business and operational licenses'),
    ('Reports', 'Business and audit reports'),
    ('Other', 'Miscellaneous documents')
ON CONFLICT (name) DO NOTHING;

-- Default Expense Categories
INSERT INTO expense_categories (name, description, display_order) VALUES
    ('Fuel & Transport', 'Diesel, petrol, vehicle expenses', 1),
    ('Utilities', 'Electricity, water, internet', 2),
    ('Office Supplies', 'Stationery, printing, office items', 3),
    ('Maintenance', 'Repairs and maintenance', 4),
    ('Raw Materials', 'Production materials and consumables', 5),
    ('Salaries & Wages', 'Employee payments', 6),
    ('Travel & Conveyance', 'Travel and local conveyance', 7),
    ('Communication', 'Phone, courier, postage', 8),
    ('Professional Fees', 'Legal, accounting, consulting', 9),
    ('Miscellaneous', 'Other expenses', 10)
ON CONFLICT DO NOTHING;

-- ==================== NEW ROLE PERMISSIONS ====================
-- Add permissions for Admin role for new screens (Nov 24-25 features)
-- Run this after the tables are created

DO $$
DECLARE
    admin_role_id VARCHAR;
BEGIN
    -- Get Admin role ID
    SELECT id INTO admin_role_id FROM roles WHERE LOWER(name) = 'admin' LIMIT 1;
    
    IF admin_role_id IS NOT NULL THEN
        -- Insert new screen permissions for Admin role
        -- Analytics & Reports
        INSERT INTO role_permissions (role_id, screen_key, can_view, can_create, can_edit, can_delete)
        VALUES 
            (admin_role_id, 'vendor_analytics', 1, 0, 0, 0),
            (admin_role_id, 'pending_payments', 1, 0, 0, 0),
            (admin_role_id, 'cancelled_invoices_report', 1, 0, 0, 0),
            -- Master Data
            (admin_role_id, 'product_categories', 1, 1, 1, 1),
            (admin_role_id, 'product_types', 1, 1, 1, 1),
            -- Operations
            (admin_role_id, 'credit_notes', 1, 1, 1, 1),
            -- Document & Expense Management
            (admin_role_id, 'documents', 1, 1, 1, 1),
            (admin_role_id, 'document_categories', 1, 1, 1, 1),
            (admin_role_id, 'expenses', 1, 1, 1, 1),
            (admin_role_id, 'expense_categories', 1, 1, 1, 1),
            (admin_role_id, 'cash_register', 1, 1, 1, 1),
            -- Admin Functions
            (admin_role_id, 'vyapaar_import', 1, 1, 0, 0),
            (admin_role_id, 'payment_writeoff', 1, 1, 0, 0)
        ON CONFLICT DO NOTHING;
        
        RAISE NOTICE 'Admin role permissions updated successfully';
    ELSE
        RAISE NOTICE 'Admin role not found - skipping permissions';
    END IF;
END $$;

-- ============================================================
-- END OF SCRIPT
-- ============================================================
