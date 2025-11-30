-- Migration: Create/Update Manual Credit Note Requests table
-- Date: 2025-11-30
-- Description: Tracks requests for manual GST processing of returns >1 month old
-- This script is idempotent - safe to run multiple times

-- =====================================================
-- MANUAL CREDIT NOTE REQUESTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS manual_credit_note_requests (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    sales_return_id VARCHAR NOT NULL,
    reason_code VARCHAR(50) NOT NULL,
    requested_by VARCHAR NOT NULL,
    requested_at TIMESTAMP DEFAULT NOW() NOT NULL,
    status VARCHAR(30) DEFAULT 'pending' NOT NULL,
    assigned_to VARCHAR,
    priority VARCHAR(20) DEFAULT 'normal' NOT NULL,
    completed_at TIMESTAMP,
    completed_by VARCHAR,
    external_credit_note_number VARCHAR(100),
    external_credit_note_date TIMESTAMP,
    notes TEXT,
    processing_notes TEXT,
    record_status INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- ADD MISSING COLUMNS (if table exists but is older version)
-- =====================================================
DO $$
BEGIN
    -- Add reason_code if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'manual_credit_note_requests' AND column_name = 'reason_code') THEN
        ALTER TABLE manual_credit_note_requests ADD COLUMN reason_code VARCHAR(50) NOT NULL DEFAULT 'old_return';
    END IF;
    
    -- Add assigned_to if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'manual_credit_note_requests' AND column_name = 'assigned_to') THEN
        ALTER TABLE manual_credit_note_requests ADD COLUMN assigned_to VARCHAR;
    END IF;
    
    -- Add priority if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'manual_credit_note_requests' AND column_name = 'priority') THEN
        ALTER TABLE manual_credit_note_requests ADD COLUMN priority VARCHAR(20) DEFAULT 'normal' NOT NULL;
    END IF;
    
    -- Add external_credit_note_number if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'manual_credit_note_requests' AND column_name = 'external_credit_note_number') THEN
        ALTER TABLE manual_credit_note_requests ADD COLUMN external_credit_note_number VARCHAR(100);
    END IF;
    
    -- Add external_credit_note_date if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'manual_credit_note_requests' AND column_name = 'external_credit_note_date') THEN
        ALTER TABLE manual_credit_note_requests ADD COLUMN external_credit_note_date TIMESTAMP;
    END IF;
    
    -- Add processing_notes if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'manual_credit_note_requests' AND column_name = 'processing_notes') THEN
        ALTER TABLE manual_credit_note_requests ADD COLUMN processing_notes TEXT;
    END IF;
    
    -- Add completed_at if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'manual_credit_note_requests' AND column_name = 'completed_at') THEN
        ALTER TABLE manual_credit_note_requests ADD COLUMN completed_at TIMESTAMP;
    END IF;
    
    -- Add completed_by if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'manual_credit_note_requests' AND column_name = 'completed_by') THEN
        ALTER TABLE manual_credit_note_requests ADD COLUMN completed_by VARCHAR;
    END IF;
END $$;

-- =====================================================
-- INDEXES (only create if column exists and index doesn't)
-- =====================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_manual_credit_note_requests_sales_return') THEN
        CREATE INDEX idx_manual_credit_note_requests_sales_return ON manual_credit_note_requests(sales_return_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_manual_credit_note_requests_status') THEN
        CREATE INDEX idx_manual_credit_note_requests_status ON manual_credit_note_requests(status);
    END IF;
    
    -- Only create assigned_to index if column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'manual_credit_note_requests' AND column_name = 'assigned_to') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_manual_credit_note_requests_assigned_to') THEN
            CREATE INDEX idx_manual_credit_note_requests_assigned_to ON manual_credit_note_requests(assigned_to);
        END IF;
    END IF;
    
    -- Only create priority index if column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'manual_credit_note_requests' AND column_name = 'priority') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_manual_credit_note_requests_priority') THEN
            CREATE INDEX idx_manual_credit_note_requests_priority ON manual_credit_note_requests(priority);
        END IF;
    END IF;
END $$;

-- Success message
DO $$ BEGIN RAISE NOTICE 'manual_credit_note_requests migration completed successfully'; END $$;
