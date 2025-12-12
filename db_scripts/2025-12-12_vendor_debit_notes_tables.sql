-- Migration: Create Vendor Debit Notes tables
-- Date: 2025-12-12
-- Description: Creates vendor_debit_notes, vendor_debit_note_items, and vendor_debit_note_adjustments tables
--              for manual debit notes against vendors (defective goods, short receipts, quality rejections, price disputes)
-- IMPORTANT: Run this script BEFORE 2025-12-12_vendor_debit_note_adjustments.sql

-- =====================================================
-- VENDOR DEBIT NOTES TABLE (Header)
-- =====================================================
CREATE TABLE IF NOT EXISTS vendor_debit_notes (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    note_number VARCHAR(100) UNIQUE NOT NULL,
    
    -- Vendor reference
    vendor_id VARCHAR REFERENCES vendors(id) NOT NULL,
    purchase_order_id VARCHAR REFERENCES purchase_orders(id),
    
    -- Debit details
    debit_date DATE NOT NULL,
    reason VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'draft' NOT NULL,
    
    -- Financial totals (in paise)
    subtotal INTEGER NOT NULL,
    cgst_amount INTEGER DEFAULT 0 NOT NULL,
    sgst_amount INTEGER DEFAULT 0 NOT NULL,
    igst_amount INTEGER DEFAULT 0 NOT NULL,
    grand_total INTEGER NOT NULL,
    
    -- Settlement tracking
    settled_amount INTEGER DEFAULT 0 NOT NULL,
    settlement_date DATE,
    settlement_reference VARCHAR(255),
    
    -- Metadata
    issued_by VARCHAR REFERENCES users(id),
    approved_by VARCHAR REFERENCES users(id),
    notes TEXT,
    
    record_status INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- VENDOR DEBIT NOTE ITEMS TABLE (Line Items)
-- =====================================================
CREATE TABLE IF NOT EXISTS vendor_debit_note_items (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_debit_note_id VARCHAR REFERENCES vendor_debit_notes(id) NOT NULL,
    
    -- Material reference (optional)
    raw_material_id VARCHAR REFERENCES raw_materials(id),
    description TEXT NOT NULL,
    hsn_code VARCHAR(20),
    
    -- Quantities and pricing (in paise)
    quantity INTEGER NOT NULL,
    unit VARCHAR(20) DEFAULT 'units' NOT NULL,
    unit_price INTEGER NOT NULL,
    taxable_value INTEGER NOT NULL,
    
    -- GST breakdown
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
-- VENDOR DEBIT NOTE ADJUSTMENTS TABLE (Settlement Tracking)
-- =====================================================
CREATE TABLE IF NOT EXISTS vendor_debit_note_adjustments (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_debit_note_id VARCHAR REFERENCES vendor_debit_notes(id) NOT NULL,
    
    -- Reference type and ID
    reference_type VARCHAR(20) NOT NULL,
    invoice_id VARCHAR REFERENCES invoices(id),
    purchase_order_id VARCHAR REFERENCES purchase_orders(id),
    
    -- Adjustment details
    adjustment_amount INTEGER NOT NULL,
    adjustment_date DATE NOT NULL,
    
    -- Metadata
    remarks TEXT,
    adjusted_by VARCHAR REFERENCES users(id),
    
    record_status INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_vendor_debit_notes_vendor_id') THEN
        CREATE INDEX idx_vendor_debit_notes_vendor_id ON vendor_debit_notes(vendor_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_vendor_debit_notes_status') THEN
        CREATE INDEX idx_vendor_debit_notes_status ON vendor_debit_notes(status);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_vendor_debit_notes_debit_date') THEN
        CREATE INDEX idx_vendor_debit_notes_debit_date ON vendor_debit_notes(debit_date);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_vendor_debit_note_items_note_id') THEN
        CREATE INDEX idx_vendor_debit_note_items_note_id ON vendor_debit_note_items(vendor_debit_note_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_vendor_debit_note_adjustments_note_id') THEN
        CREATE INDEX idx_vendor_debit_note_adjustments_note_id ON vendor_debit_note_adjustments(vendor_debit_note_id);
    END IF;
END $$;

-- =====================================================
-- COMMENTS
-- =====================================================
DO $$
BEGIN
    COMMENT ON TABLE vendor_debit_notes IS 'Debit notes issued against vendors for claims (defective goods, short receipts, quality rejections, price disputes)';
    COMMENT ON TABLE vendor_debit_note_items IS 'Line items for vendor debit notes with material and GST details';
    COMMENT ON TABLE vendor_debit_note_adjustments IS 'Settlement/adjustment tracking linking debit notes to invoices or POs';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Vendor Debit Notes tables created successfully';
END $$;
