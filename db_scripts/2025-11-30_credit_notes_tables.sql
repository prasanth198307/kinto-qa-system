-- Migration: Create Credit Notes tables
-- Date: 2025-11-30
-- Description: Adds credit_notes and credit_note_items tables for GST-compliant invoice adjustments
--              when reducing amounts (returns, pricing corrections, damages on previous month invoices)

-- =====================================================
-- CREDIT NOTES TABLE
-- =====================================================
-- Credit notes are used for previous month invoices when you need to reduce amounts
-- (e.g., goods returned after GST filing, pricing correction downward)

CREATE TABLE IF NOT EXISTS credit_notes (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    note_number VARCHAR(100) UNIQUE NOT NULL,  -- CN-{invoiceNumber}-{seq}
    
    -- References
    invoice_id VARCHAR REFERENCES invoices(id) NOT NULL,
    sales_return_id VARCHAR REFERENCES sales_returns(id),
    
    -- Credit details
    credit_date DATE NOT NULL,
    reason VARCHAR(255) NOT NULL,  -- sales_return, pricing_error, damage, discount, other
    status VARCHAR(50) DEFAULT 'draft' NOT NULL,  -- draft, issued, cancelled
    
    -- Financial totals (in paise)
    subtotal INTEGER NOT NULL,
    cgst_amount INTEGER DEFAULT 0 NOT NULL,
    sgst_amount INTEGER DEFAULT 0 NOT NULL,
    igst_amount INTEGER DEFAULT 0 NOT NULL,
    grand_total INTEGER NOT NULL,
    
    -- Metadata
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
-- Line items for each credit note, tracking quantities and credits given

CREATE TABLE IF NOT EXISTS credit_note_items (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    credit_note_id VARCHAR REFERENCES credit_notes(id) NOT NULL,
    
    -- Product reference
    invoice_item_id VARCHAR REFERENCES invoice_items(id),
    product_id VARCHAR REFERENCES products(id) NOT NULL,
    description TEXT NOT NULL,
    
    -- Quantities and pricing (in paise)
    quantity INTEGER NOT NULL,
    unit_price INTEGER NOT NULL,
    discount_amount INTEGER DEFAULT 0 NOT NULL,
    taxable_value INTEGER NOT NULL,
    
    -- GST breakdown
    cgst_rate INTEGER DEFAULT 0 NOT NULL,  -- Percentage (e.g., 900 = 9%)
    cgst_amount INTEGER DEFAULT 0 NOT NULL,
    sgst_rate INTEGER DEFAULT 0 NOT NULL,
    sgst_amount INTEGER DEFAULT 0 NOT NULL,
    igst_rate INTEGER DEFAULT 0 NOT NULL,
    igst_amount INTEGER DEFAULT 0 NOT NULL,
    
    total_amount INTEGER NOT NULL,  -- taxable_value + GST amounts
    
    record_status INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- INDEXES for performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_credit_notes_invoice_id ON credit_notes(invoice_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_sales_return_id ON credit_notes(sales_return_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_status ON credit_notes(status);
CREATE INDEX IF NOT EXISTS idx_credit_notes_credit_date ON credit_notes(credit_date);
CREATE INDEX IF NOT EXISTS idx_credit_note_items_credit_note_id ON credit_note_items(credit_note_id);
CREATE INDEX IF NOT EXISTS idx_credit_note_items_product_id ON credit_note_items(product_id);

-- =====================================================
-- COMMENTS for documentation
-- =====================================================
COMMENT ON TABLE credit_notes IS 'Credit notes for GST-compliant invoice adjustments when reducing amounts (previous month invoices)';
COMMENT ON COLUMN credit_notes.note_number IS 'Unique credit note number in format CN-{invoiceNumber}-{sequence}';
COMMENT ON COLUMN credit_notes.reason IS 'Reason for credit: sales_return, pricing_error, damage, discount, other';
COMMENT ON COLUMN credit_notes.status IS 'Workflow status: draft, issued, cancelled';
COMMENT ON COLUMN credit_notes.subtotal IS 'Taxable value in paise (before GST)';
COMMENT ON COLUMN credit_notes.grand_total IS 'Total credit amount including GST in paise';

COMMENT ON TABLE credit_note_items IS 'Line items for credit notes with quantities and pricing';
COMMENT ON COLUMN credit_note_items.quantity IS 'Quantity being credited';
COMMENT ON COLUMN credit_note_items.unit_price IS 'Price per unit in paise';
COMMENT ON COLUMN credit_note_items.taxable_value IS 'Taxable value for this line item in paise';
