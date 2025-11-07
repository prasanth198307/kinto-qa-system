-- KINTO QA Management System - Invoicing and Payment Tracking
-- PostgreSQL 13+
-- Date: 2025-11-07
-- Description: Adds GST-compliant invoicing, payment tracking with FIFO allocation, and bank management

-- ===========================================
-- INVOICES TABLE (GST-Compliant)
-- ===========================================

CREATE TABLE IF NOT EXISTS invoices (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(100) NOT NULL UNIQUE,
    invoice_date TIMESTAMP NOT NULL,
    gatepass_id VARCHAR REFERENCES gatepasses(id),
    
    -- Seller Details
    seller_gstin VARCHAR(15),
    seller_name VARCHAR(255),
    seller_address TEXT,
    seller_state VARCHAR(100),
    seller_state_code VARCHAR(2),
    
    -- Buyer Details
    buyer_gstin VARCHAR(15),
    buyer_name VARCHAR(255) NOT NULL,
    buyer_address TEXT,
    buyer_state VARCHAR(100),
    buyer_state_code VARCHAR(2),
    buyer_contact VARCHAR(50),
    
    -- Amounts (stored in paise for precision)
    subtotal INTEGER NOT NULL,
    cgst_amount INTEGER DEFAULT 0 NOT NULL,
    sgst_amount INTEGER DEFAULT 0 NOT NULL,
    igst_amount INTEGER DEFAULT 0 NOT NULL,
    cess_amount INTEGER DEFAULT 0 NOT NULL,
    round_off INTEGER DEFAULT 0 NOT NULL,
    total_amount INTEGER NOT NULL,
    
    -- Payment Details
    payment_terms VARCHAR(255),
    bank_name VARCHAR(255),
    bank_account_number VARCHAR(50),
    bank_ifsc_code VARCHAR(11),
    upi_id VARCHAR(100),
    
    -- Other Details
    place_of_supply VARCHAR(100),
    reverse_charge INTEGER DEFAULT 0 NOT NULL,
    transport_mode VARCHAR(50),
    vehicle_number VARCHAR(50),
    date_of_supply TIMESTAMP,
    
    remarks TEXT,
    record_status INTEGER DEFAULT 1 NOT NULL,
    generated_by VARCHAR REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE invoices IS 'GST-compliant sales invoices with comprehensive tax details';
COMMENT ON COLUMN invoices.subtotal IS 'Subtotal before taxes (in paise)';
COMMENT ON COLUMN invoices.total_amount IS 'Final invoice amount including taxes (in paise)';
COMMENT ON COLUMN invoices.reverse_charge IS '1 if reverse charge applicable, 0 otherwise';

-- ===========================================
-- INVOICE ITEMS TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS invoice_items (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id VARCHAR NOT NULL REFERENCES invoices(id),
    product_id VARCHAR NOT NULL REFERENCES products(id),
    hsn_code VARCHAR(8),
    sac_code VARCHAR(6),
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    uom_id VARCHAR REFERENCES uom(id),
    unit_price INTEGER NOT NULL,
    discount INTEGER DEFAULT 0 NOT NULL,
    taxable_amount INTEGER NOT NULL,
    
    -- Tax Breakup (rates in basis points, amounts in paise)
    cgst_rate INTEGER DEFAULT 0 NOT NULL,
    cgst_amount INTEGER DEFAULT 0 NOT NULL,
    sgst_rate INTEGER DEFAULT 0 NOT NULL,
    sgst_amount INTEGER DEFAULT 0 NOT NULL,
    igst_rate INTEGER DEFAULT 0 NOT NULL,
    igst_amount INTEGER DEFAULT 0 NOT NULL,
    cess_rate INTEGER DEFAULT 0 NOT NULL,
    cess_amount INTEGER DEFAULT 0 NOT NULL,
    
    total_amount INTEGER NOT NULL,
    remarks TEXT,
    record_status INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE invoice_items IS 'Line items for invoices with detailed GST breakup';
COMMENT ON COLUMN invoice_items.cgst_rate IS 'CGST rate in basis points (e.g., 900 = 9%)';
COMMENT ON COLUMN invoice_items.unit_price IS 'Price per unit (in paise)';
COMMENT ON COLUMN invoice_items.taxable_amount IS 'Amount after discount, before tax (in paise)';

-- ===========================================
-- INVOICE PAYMENTS TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS invoice_payments (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id VARCHAR NOT NULL REFERENCES invoices(id),
    payment_date TIMESTAMP NOT NULL,
    amount INTEGER NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    reference_number VARCHAR(100),
    payment_type VARCHAR(50) NOT NULL,
    bank_name VARCHAR(255),
    remarks TEXT,
    recorded_by VARCHAR REFERENCES users(id),
    record_status INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE invoice_payments IS 'Payment records with FIFO allocation support for partial payments';
COMMENT ON COLUMN invoice_payments.amount IS 'Payment amount (in paise)';
COMMENT ON COLUMN invoice_payments.payment_type IS 'Advance, Partial, or Full payment';
COMMENT ON COLUMN invoice_payments.payment_method IS 'Cash, Cheque, NEFT, RTGS, UPI, etc.';

-- ===========================================
-- BANKS TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS banks (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_name VARCHAR(255) NOT NULL,
    account_holder_name VARCHAR(255) NOT NULL,
    account_number VARCHAR(50) NOT NULL UNIQUE,
    ifsc_code VARCHAR(11) NOT NULL,
    branch_name VARCHAR(255),
    account_type VARCHAR(50),
    upi_id VARCHAR(100),
    is_default INTEGER DEFAULT 0 NOT NULL,
    record_status INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE banks IS 'Bank account master for managing multiple company bank accounts';
COMMENT ON COLUMN banks.is_default IS '1 if default bank account, 0 otherwise';
COMMENT ON COLUMN banks.account_type IS 'Savings, Current, Cash Credit, etc.';

-- ===========================================
-- CHECKLIST ASSIGNMENTS TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS checklist_assignments (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id VARCHAR NOT NULL REFERENCES checklist_templates(id),
    machine_id VARCHAR NOT NULL REFERENCES machines(id),
    operator_id VARCHAR NOT NULL REFERENCES users(id),
    reviewer_id VARCHAR REFERENCES users(id),
    assigned_date DATE NOT NULL,
    shift VARCHAR(50),
    status VARCHAR(50) DEFAULT 'pending',
    submission_id VARCHAR REFERENCES checklist_submissions(id),
    assigned_by VARCHAR NOT NULL REFERENCES users(id),
    notes TEXT,
    record_status INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE checklist_assignments IS 'Manager assigns checklists to operators for specific machines and shifts';
COMMENT ON COLUMN checklist_assignments.status IS 'pending, in_progress, completed, rejected';
COMMENT ON COLUMN checklist_assignments.submission_id IS 'Links to checklist submission once completed';

-- ===========================================
-- INDEXES FOR PERFORMANCE
-- ===========================================

-- Invoice indexes
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_date ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_gatepass_id ON invoices(gatepass_id);
CREATE INDEX IF NOT EXISTS idx_invoices_buyer_name ON invoices(buyer_name);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(record_status);

-- Invoice items indexes
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_product_id ON invoice_items(product_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_status ON invoice_items(record_status);

-- Invoice payments indexes
CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice_id ON invoice_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_payment_date ON invoice_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_status ON invoice_payments(record_status);

-- Bank indexes
CREATE INDEX IF NOT EXISTS idx_banks_account_number ON banks(account_number);
CREATE INDEX IF NOT EXISTS idx_banks_is_default ON banks(is_default);
CREATE INDEX IF NOT EXISTS idx_banks_status ON banks(record_status);

-- Checklist assignment indexes
CREATE INDEX IF NOT EXISTS idx_checklist_assignments_operator ON checklist_assignments(operator_id);
CREATE INDEX IF NOT EXISTS idx_checklist_assignments_date ON checklist_assignments(assigned_date);
CREATE INDEX IF NOT EXISTS idx_checklist_assignments_machine ON checklist_assignments(machine_id);
CREATE INDEX IF NOT EXISTS idx_checklist_assignments_status ON checklist_assignments(status);
CREATE INDEX IF NOT EXISTS idx_checklist_assignments_record_status ON checklist_assignments(record_status);

-- ===========================================
-- FEATURES ENABLED BY THIS MIGRATION
-- ===========================================

-- 1. GST-Compliant Invoicing
--    - Full tax breakup (CGST, SGST, IGST, Cess)
--    - Buyer and seller details with GSTIN
--    - HSN/SAC code support
--    - Printable invoice format

-- 2. Payment Tracking
--    - Multiple payment methods (Cash, Cheque, NEFT, UPI)
--    - Partial payment support
--    - Advance payment tracking
--    - FIFO allocation across invoices
--    - Pending payments dashboard

-- 3. Bank Management
--    - Multiple bank account support
--    - Default account selection
--    - UPI ID integration
--    - Account details for invoice printing

-- 4. Checklist Workflow
--    - Manager assigns checklists to operators
--    - Machine and shift-specific assignments
--    - Reviewer assignment
--    - Status tracking (pending, completed, rejected)

-- ===========================================
-- VERIFICATION QUERIES
-- ===========================================

-- Check if all tables were created
-- SELECT table_name 
-- FROM information_schema.tables 
-- WHERE table_schema = 'public' 
--   AND table_name IN ('invoices', 'invoice_items', 'invoice_payments', 'banks', 'checklist_assignments')
-- ORDER BY table_name;

-- Should return 5 rows

-- ===========================================
-- ROLLBACK (⚠️ WARNING: DELETES DATA)
-- ===========================================

-- To rollback this migration:
-- DROP TABLE IF EXISTS invoice_payments CASCADE;
-- DROP TABLE IF EXISTS invoice_items CASCADE;
-- DROP TABLE IF EXISTS invoices CASCADE;
-- DROP TABLE IF EXISTS banks CASCADE;
-- DROP TABLE IF EXISTS checklist_assignments CASCADE;
