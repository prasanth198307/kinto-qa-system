-- Migration: Create Manual Credit Note Requests table
-- Date: 2025-11-30
-- Description: Tracks requests for manual GST processing of returns >1 month old
-- NOTE: Run this script only on fresh databases. Table already exists in production.

-- =====================================================
-- MANUAL CREDIT NOTE REQUESTS TABLE
-- =====================================================
-- For sales returns older than 1 month, automatic credit notes cannot be issued
-- due to GST compliance. These require manual processing through the GST portal.
-- This table tracks such requests through their workflow.

CREATE TABLE IF NOT EXISTS manual_credit_note_requests (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    sales_return_id VARCHAR REFERENCES sales_returns(id) NOT NULL,
    
    -- Request details
    reason_code VARCHAR(50) NOT NULL,  -- old_return, gst_compliance, etc
    requested_by VARCHAR REFERENCES users(id) NOT NULL,
    requested_at TIMESTAMP DEFAULT NOW() NOT NULL,
    
    -- Processing workflow
    status VARCHAR(30) DEFAULT 'pending' NOT NULL,  -- pending, in_progress, completed, rejected
    assigned_to VARCHAR REFERENCES users(id),
    priority VARCHAR(20) DEFAULT 'normal' NOT NULL,  -- low, normal, high, urgent
    
    -- Completion tracking
    completed_at TIMESTAMP,
    completed_by VARCHAR REFERENCES users(id),
    external_credit_note_number VARCHAR(100),  -- Manually created credit note reference
    external_credit_note_date TIMESTAMP,
    
    -- Notes and documentation
    notes TEXT,
    processing_notes TEXT,  -- Internal notes during processing
    
    record_status INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- INDEXES for performance (only create if not exists)
-- =====================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_manual_credit_note_requests_sales_return') THEN
        CREATE INDEX idx_manual_credit_note_requests_sales_return ON manual_credit_note_requests(sales_return_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_manual_credit_note_requests_status') THEN
        CREATE INDEX idx_manual_credit_note_requests_status ON manual_credit_note_requests(status);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_manual_credit_note_requests_assigned_to') THEN
        CREATE INDEX idx_manual_credit_note_requests_assigned_to ON manual_credit_note_requests(assigned_to);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_manual_credit_note_requests_priority') THEN
        CREATE INDEX idx_manual_credit_note_requests_priority ON manual_credit_note_requests(priority);
    END IF;
END $$;

-- =====================================================
-- COMMENTS for documentation (wrapped in DO block to handle errors)
-- =====================================================
DO $$
BEGIN
    COMMENT ON TABLE manual_credit_note_requests IS 'Tracks requests for manual GST credit note processing (returns >1 month old)';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
