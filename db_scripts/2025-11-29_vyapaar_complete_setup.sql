-- ============================================================================
-- VYAPAAR IMPORT SYSTEM - COMPLETE DATABASE SETUP
-- Date: 2025-11-29
-- Purpose: All tables and columns needed for Vyapaar data migration
-- Run Order: After base tables (invoices, invoice_payments, vendors) exist
-- ============================================================================

-- ============================================================================
-- STEP 1: Ensure invoice_payments has all required columns
-- ============================================================================

-- Add cancellation columns to invoice_payments if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'invoice_payments' AND column_name = 'cancelled_at') THEN
        ALTER TABLE invoice_payments ADD COLUMN cancelled_at TIMESTAMP;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'invoice_payments' AND column_name = 'cancellation_remarks') THEN
        ALTER TABLE invoice_payments ADD COLUMN cancellation_remarks TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'invoice_payments' AND column_name = 'cancelled_by') THEN
        ALTER TABLE invoice_payments ADD COLUMN cancelled_by VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'invoice_payments' AND column_name = 'bank_name') THEN
        ALTER TABLE invoice_payments ADD COLUMN bank_name VARCHAR(255);
    END IF;
END $$;

-- ============================================================================
-- STEP 2: Create payment_evidence table for Payments.xlsx import
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_evidence (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
    parent_payment_id VARCHAR(255) REFERENCES invoice_payments(id),
    invoice_id VARCHAR(255) REFERENCES invoices(id),
    vendor_id VARCHAR(255) REFERENCES vendors(id),
    
    -- Original data from Payments.xlsx
    amount INTEGER NOT NULL, -- In paise (stores full amount from file, not truncated)
    received_on TIMESTAMP,
    reference_number VARCHAR(100),
    payment_mode VARCHAR(50), -- Cash, NEFT, Cheque, UPI, Bank Transfer
    bank_name VARCHAR(255),
    
    -- Matching metadata
    match_confidence INTEGER DEFAULT 100, -- 0-100%
    match_status VARCHAR(20) DEFAULT 'matched', -- 'matched', 'partial', 'orphan'
    source_row TEXT, -- Original Excel row as JSON for audit trail
    
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
CREATE INDEX IF NOT EXISTS idx_payment_evidence_received 
    ON payment_evidence(received_on);

-- ============================================================================
-- STEP 3: Vendor classification columns for product-based classification
-- ============================================================================

DO $$ 
BEGIN
    -- Add vendor_type for Kinto/HPPani/Purejal/Mixed classification
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'vendors' AND column_name = 'vendor_type') THEN
        ALTER TABLE vendors ADD COLUMN vendor_type VARCHAR(50) DEFAULT 'Kinto';
    END IF;
END $$;

-- ============================================================================
-- STEP 4: Raw material loss_percent decimal support
-- ============================================================================

-- Change loss_percent from integer to real for decimal percentages (e.g., 12.1%)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'raw_material_types' 
               AND column_name = 'loss_percent'
               AND data_type = 'integer') THEN
        ALTER TABLE raw_material_types 
        ALTER COLUMN loss_percent TYPE real USING loss_percent::real;
    END IF;
END $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

SELECT 'Setup complete! Verification:' AS status;

-- Check payment_evidence table
SELECT 'payment_evidence records: ' || COUNT(*)::text AS info FROM payment_evidence;

-- Check invoice_payments cancellation columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'invoice_payments' 
AND column_name IN ('cancelled_at', 'cancellation_remarks', 'cancelled_by', 'bank_name');

-- Check vendor_type column
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'vendors' AND column_name = 'vendor_type';

-- Check loss_percent type
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'raw_material_types' AND column_name = 'loss_percent';
