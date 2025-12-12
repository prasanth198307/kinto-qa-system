-- Vendor Debit Note Adjustments Table
-- Created: 2025-12-12
-- Purpose: Track adjustments/offsets of vendor debit notes against sales invoices or purchase orders

CREATE TABLE IF NOT EXISTS vendor_debit_note_adjustments (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
    vendor_debit_note_id VARCHAR NOT NULL REFERENCES vendor_debit_notes(id),
    
    -- Reference type and ID (invoice or purchase_order)
    reference_type VARCHAR(20) NOT NULL, -- 'invoice' or 'purchase_order'
    invoice_id VARCHAR REFERENCES invoices(id), -- For sales invoice adjustments
    purchase_order_id VARCHAR REFERENCES purchase_orders(id), -- For PO adjustments
    
    -- Adjustment amount (in paise)
    adjustment_amount INTEGER NOT NULL,
    adjustment_date DATE NOT NULL,
    
    -- Metadata
    remarks TEXT,
    adjusted_by VARCHAR REFERENCES users(id),
    
    record_status INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_vdn_adjustments_debit_note ON vendor_debit_note_adjustments(vendor_debit_note_id);
CREATE INDEX IF NOT EXISTS idx_vdn_adjustments_invoice ON vendor_debit_note_adjustments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_vdn_adjustments_po ON vendor_debit_note_adjustments(purchase_order_id);

-- Add constraint to ensure at least one reference is provided
ALTER TABLE vendor_debit_note_adjustments 
ADD CONSTRAINT chk_adjustment_reference 
CHECK (
    (reference_type = 'invoice' AND invoice_id IS NOT NULL) OR 
    (reference_type = 'purchase_order' AND purchase_order_id IS NOT NULL)
);
