-- Migration: Create Debit Notes tables
-- Date: 2025-11-30
-- Description: Adds debit_notes and debit_note_items tables for GST-compliant invoice adjustments
--              when charging MORE (quantity increases, price increases on old invoices)

-- =====================================================
-- DEBIT NOTES TABLE
-- =====================================================
-- Debit notes are used for previous month invoices when you need to charge MORE
-- (e.g., quantity increase discovered after GST filing, price correction upward)

CREATE TABLE IF NOT EXISTS debit_notes (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    note_number VARCHAR(100) UNIQUE NOT NULL,  -- DN-{invoiceNumber}-{seq}
    
    -- References
    invoice_id VARCHAR REFERENCES invoices(id) NOT NULL,
    
    -- Debit details
    debit_date DATE NOT NULL,
    reason VARCHAR(255) NOT NULL,  -- quantity_increase, price_increase, additional_charges, other
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
-- DEBIT NOTE ITEMS TABLE
-- =====================================================
-- Line items for each debit note, tracking the additional amounts charged

CREATE TABLE IF NOT EXISTS debit_note_items (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    debit_note_id VARCHAR REFERENCES debit_notes(id) NOT NULL,
    
    -- Product reference
    invoice_item_id VARCHAR REFERENCES invoice_items(id),
    product_id VARCHAR REFERENCES products(id) NOT NULL,
    description TEXT NOT NULL,
    
    -- Original values from invoice (for reference)
    original_quantity INTEGER NOT NULL,
    original_unit_price INTEGER NOT NULL,
    
    -- Additional/difference values (in paise)
    additional_quantity INTEGER DEFAULT 0 NOT NULL,  -- Extra quantity being charged
    new_unit_price INTEGER NOT NULL,  -- New price (if price increase)
    price_difference_per_unit INTEGER DEFAULT 0 NOT NULL,  -- Price increase per unit
    
    -- Calculated totals
    taxable_value INTEGER NOT NULL,  -- (additionalQty * newPrice) + (origQty * priceDiff)
    
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
CREATE INDEX IF NOT EXISTS idx_debit_notes_invoice_id ON debit_notes(invoice_id);
CREATE INDEX IF NOT EXISTS idx_debit_notes_status ON debit_notes(status);
CREATE INDEX IF NOT EXISTS idx_debit_notes_debit_date ON debit_notes(debit_date);
CREATE INDEX IF NOT EXISTS idx_debit_note_items_debit_note_id ON debit_note_items(debit_note_id);
CREATE INDEX IF NOT EXISTS idx_debit_note_items_product_id ON debit_note_items(product_id);

-- =====================================================
-- COMMENTS for documentation
-- =====================================================
COMMENT ON TABLE debit_notes IS 'Debit notes for GST-compliant invoice adjustments when charging MORE (previous month invoices)';
COMMENT ON COLUMN debit_notes.note_number IS 'Unique debit note number in format DN-{invoiceNumber}-{sequence}';
COMMENT ON COLUMN debit_notes.reason IS 'Reason for debit: quantity_increase, price_increase, additional_charges, other';
COMMENT ON COLUMN debit_notes.status IS 'Workflow status: draft, issued, cancelled';
COMMENT ON COLUMN debit_notes.subtotal IS 'Taxable value in paise (before GST)';
COMMENT ON COLUMN debit_notes.grand_total IS 'Total amount including GST in paise';

COMMENT ON TABLE debit_note_items IS 'Line items for debit notes with original vs new values';
COMMENT ON COLUMN debit_note_items.original_quantity IS 'Original quantity from invoice';
COMMENT ON COLUMN debit_note_items.original_unit_price IS 'Original price from invoice in paise';
COMMENT ON COLUMN debit_note_items.additional_quantity IS 'Extra quantity being charged';
COMMENT ON COLUMN debit_note_items.price_difference_per_unit IS 'Price increase per unit in paise';
