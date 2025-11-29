-- Migration: Payment Evidence Table for Vyapaar Import System
-- Date: 2025-11-29
-- Purpose: Store Payments.xlsx records as evidence/audit trail linked to VY- payments
-- Note: Run this AFTER invoice_payments table exists

-- Create payment_evidence table if not exists
CREATE TABLE IF NOT EXISTS payment_evidence (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
    parent_payment_id VARCHAR(255) REFERENCES invoice_payments(id),
    invoice_id VARCHAR(255) REFERENCES invoices(id),
    vendor_id VARCHAR(255) REFERENCES vendors(id),
    
    -- Original data from Payments.xlsx
    amount INTEGER NOT NULL, -- In paise
    received_on TIMESTAMP,
    reference_number VARCHAR(100),
    payment_mode VARCHAR(50), -- Cash, NEFT, Cheque, UPI, Bank Transfer
    bank_name VARCHAR(255),
    
    -- Matching metadata
    match_confidence INTEGER DEFAULT 100, -- 0-100%
    match_status VARCHAR(20) DEFAULT 'matched', -- 'matched', 'partial', 'orphan'
    source_row TEXT, -- Original Excel row as JSON for audit
    
    -- Import tracking
    import_batch_id VARCHAR(100),
    source_file VARCHAR(255),
    
    record_status INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_payment_evidence_parent_payment 
    ON payment_evidence(parent_payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_evidence_invoice 
    ON payment_evidence(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_evidence_vendor 
    ON payment_evidence(vendor_id);
CREATE INDEX IF NOT EXISTS idx_payment_evidence_batch 
    ON payment_evidence(import_batch_id);
CREATE INDEX IF NOT EXISTS idx_payment_evidence_status 
    ON payment_evidence(match_status);

-- Verify table creation
SELECT 'payment_evidence table created successfully' AS status;
SELECT COUNT(*) AS existing_records FROM payment_evidence;
