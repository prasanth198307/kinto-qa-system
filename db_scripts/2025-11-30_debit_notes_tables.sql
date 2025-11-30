-- Migration: Create Debit Notes tables
-- Date: 2025-11-30
-- Description: Adds debit_notes and debit_note_items tables for GST-compliant invoice adjustments
--              when charging MORE (quantity increases, price increases on old invoices)
-- NOTE: Run this script only on fresh databases. Tables may already exist in production.

-- =====================================================
-- DEBIT NOTES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS debit_notes (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    note_number VARCHAR(100) UNIQUE NOT NULL,
    
    invoice_id VARCHAR REFERENCES invoices(id) NOT NULL,
    
    debit_date DATE NOT NULL,
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
-- DEBIT NOTE ITEMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS debit_note_items (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    debit_note_id VARCHAR REFERENCES debit_notes(id) NOT NULL,
    
    invoice_item_id VARCHAR REFERENCES invoice_items(id),
    product_id VARCHAR REFERENCES products(id) NOT NULL,
    description TEXT NOT NULL,
    
    original_quantity INTEGER NOT NULL,
    original_unit_price INTEGER NOT NULL,
    
    additional_quantity INTEGER DEFAULT 0 NOT NULL,
    new_unit_price INTEGER NOT NULL,
    price_difference_per_unit INTEGER DEFAULT 0 NOT NULL,
    
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
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_debit_notes_invoice_id') THEN
        CREATE INDEX idx_debit_notes_invoice_id ON debit_notes(invoice_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_debit_notes_status') THEN
        CREATE INDEX idx_debit_notes_status ON debit_notes(status);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_debit_notes_debit_date') THEN
        CREATE INDEX idx_debit_notes_debit_date ON debit_notes(debit_date);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_debit_note_items_debit_note_id') THEN
        CREATE INDEX idx_debit_note_items_debit_note_id ON debit_note_items(debit_note_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_debit_note_items_product_id') THEN
        CREATE INDEX idx_debit_note_items_product_id ON debit_note_items(product_id);
    END IF;
END $$;

-- =====================================================
-- COMMENTS
-- =====================================================
DO $$
BEGIN
    COMMENT ON TABLE debit_notes IS 'Debit notes for GST-compliant invoice adjustments when charging MORE';
    COMMENT ON TABLE debit_note_items IS 'Line items for debit notes with original vs new values';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
