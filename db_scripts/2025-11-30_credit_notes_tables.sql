-- Migration: Create Credit Notes tables
-- Date: 2025-11-30
-- Description: Adds credit_notes and credit_note_items tables for GST-compliant invoice adjustments
--              when reducing amounts (returns, pricing corrections, damages on previous month invoices)
-- NOTE: Run this script only on fresh databases. Tables may already exist in production.

-- =====================================================
-- CREDIT NOTES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS credit_notes (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    note_number VARCHAR(100) UNIQUE NOT NULL,
    
    invoice_id VARCHAR REFERENCES invoices(id) NOT NULL,
    sales_return_id VARCHAR REFERENCES sales_returns(id),
    
    credit_date DATE NOT NULL,
    reason VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'draft' NOT NULL,
    
    subtotal INTEGER NOT NULL,
    cgst_amount INTEGER DEFAULT 0 NOT NULL,
    sgst_amount INTEGER DEFAULT 0 NOT NULL,
    igst_amount INTEGER DEFAULT 0 NOT NULL,
    grand_total INTEGER NOT NULL,
    
    issued_by VARCHAR REFERENCES users(id),
    approved_by VARCHAR REFERENCES users(id),
    notes TEXT,
    
    record_status INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- CREDIT NOTE ITEMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS credit_note_items (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    credit_note_id VARCHAR REFERENCES credit_notes(id) NOT NULL,
    
    invoice_item_id VARCHAR REFERENCES invoice_items(id),
    product_id VARCHAR REFERENCES products(id) NOT NULL,
    description TEXT NOT NULL,
    
    quantity INTEGER NOT NULL,
    unit_price INTEGER NOT NULL,
    discount_amount INTEGER DEFAULT 0 NOT NULL,
    taxable_value INTEGER NOT NULL,
    
    cgst_rate INTEGER DEFAULT 0 NOT NULL,
    cgst_amount INTEGER DEFAULT 0 NOT NULL,
    sgst_rate INTEGER DEFAULT 0 NOT NULL,
    sgst_amount INTEGER DEFAULT 0 NOT NULL,
    igst_rate INTEGER DEFAULT 0 NOT NULL,
    igst_amount INTEGER DEFAULT 0 NOT NULL,
    
    total_amount INTEGER NOT NULL,
    
    record_status INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- INDEXES (safe creation with IF NOT EXISTS check)
-- =====================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_credit_notes_invoice_id') THEN
        CREATE INDEX idx_credit_notes_invoice_id ON credit_notes(invoice_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_credit_notes_sales_return_id') THEN
        CREATE INDEX idx_credit_notes_sales_return_id ON credit_notes(sales_return_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_credit_notes_status') THEN
        CREATE INDEX idx_credit_notes_status ON credit_notes(status);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_credit_notes_credit_date') THEN
        CREATE INDEX idx_credit_notes_credit_date ON credit_notes(credit_date);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_credit_note_items_credit_note_id') THEN
        CREATE INDEX idx_credit_note_items_credit_note_id ON credit_note_items(credit_note_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_credit_note_items_product_id') THEN
        CREATE INDEX idx_credit_note_items_product_id ON credit_note_items(product_id);
    END IF;
END $$;

-- =====================================================
-- COMMENTS
-- =====================================================
DO $$
BEGIN
    COMMENT ON TABLE credit_notes IS 'Credit notes for GST-compliant invoice adjustments when reducing amounts';
    COMMENT ON TABLE credit_note_items IS 'Line items for credit notes with quantities and pricing';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
