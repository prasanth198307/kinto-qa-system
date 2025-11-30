-- Add ALL missing columns to production tables
-- Run this on your local Mac database to sync with Replit schema
-- Date: 2025-11-30

-- =====================================================
-- PRODUCTION RECONCILIATIONS TABLE
-- =====================================================

-- Add remarks column (for admin notes)
ALTER TABLE production_reconciliations ADD COLUMN IF NOT EXISTS remarks TEXT;

-- Add rejected_cases column
ALTER TABLE production_reconciliations ADD COLUMN IF NOT EXISTS rejected_cases INTEGER DEFAULT 0 NOT NULL;

-- Add empty bottle tracking columns
ALTER TABLE production_reconciliations ADD COLUMN IF NOT EXISTS empty_bottles INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE production_reconciliations ADD COLUMN IF NOT EXISTS empty_bottles_produced INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE production_reconciliations ADD COLUMN IF NOT EXISTS empty_bottles_used INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE production_reconciliations ADD COLUMN IF NOT EXISTS empty_bottles_pending INTEGER DEFAULT 0 NOT NULL;

-- Add edit tracking columns
ALTER TABLE production_reconciliations ADD COLUMN IF NOT EXISTS edit_count INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE production_reconciliations ADD COLUMN IF NOT EXISTS last_edited_by VARCHAR REFERENCES users(id);
ALTER TABLE production_reconciliations ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMP;

-- =====================================================
-- PRODUCTION ENTRIES TABLE
-- =====================================================

-- Add empty bottles produced column
ALTER TABLE production_entries ADD COLUMN IF NOT EXISTS empty_bottles_produced INTEGER DEFAULT 0 NOT NULL;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify production_reconciliations columns
SELECT 'production_reconciliations columns:' as info;
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'production_reconciliations' 
ORDER BY ordinal_position;

-- Verify production_entries columns
SELECT 'production_entries columns:' as info;
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'production_entries' 
ORDER BY ordinal_position;
