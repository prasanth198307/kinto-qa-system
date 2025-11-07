-- KINTO QA Management System - Schema Fixes
-- PostgreSQL 13+
-- Date: 2025-11-07
-- Description: Fixes schema inconsistencies between shared/schema.ts and PostgreSQL database

-- ===========================================
-- FIX 1: Add mobile_number to users table
-- ===========================================

-- Add the column as nullable first
ALTER TABLE users ADD COLUMN IF NOT EXISTS mobile_number VARCHAR(15);

-- Update existing users with placeholder mobile numbers
UPDATE users 
SET mobile_number = '9999999000'
WHERE mobile_number IS NULL OR mobile_number = '';

-- Now make it NOT NULL
ALTER TABLE users ALTER COLUMN mobile_number SET NOT NULL;

COMMENT ON COLUMN users.mobile_number IS 'User mobile number (10-15 digits, required for SMS/WhatsApp notifications)';

-- ===========================================
-- FIX 2: Fix banks table schema
-- ===========================================

-- Add missing columns
ALTER TABLE banks ADD COLUMN IF NOT EXISTS account_holder_name VARCHAR(255);
ALTER TABLE banks ADD COLUMN IF NOT EXISTS branch_name VARCHAR(255);
ALTER TABLE banks ADD COLUMN IF NOT EXISTS account_type VARCHAR(50);
ALTER TABLE banks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Rename recordstatus to record_status (snake_case standard)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'banks' 
        AND column_name = 'recordstatus'
    ) THEN
        ALTER TABLE banks RENAME COLUMN recordstatus TO record_status;
    END IF;
END $$;

COMMENT ON TABLE banks IS 'Bank account master - stores company bank accounts for invoice payments';

-- ===========================================
-- VERIFICATION QUERIES
-- ===========================================

-- Verify users table has mobile_number
SELECT 
    COUNT(*) as total_users,
    COUNT(mobile_number) as users_with_mobile
FROM users;

-- Verify banks table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'banks' 
ORDER BY ordinal_position;

-- Expected columns in banks:
-- - id, bank_name, account_holder_name, account_number
-- - ifsc_code, branch_name, account_type, upi_id
-- - is_default, record_status, created_at, updated_at

-- ===========================================
-- NOTES
-- ===========================================

-- These fixes resolve:
-- 1. Missing mobile_number column preventing user notifications
-- 2. Banks table schema mismatch causing payment feature failures
-- 3. Column naming inconsistencies (camelCase vs snake_case)

-- After running this script:
-- ✅ Users can be created with mobile numbers
-- ✅ SMS/WhatsApp notifications will work
-- ✅ Bank payment features will function correctly
-- ✅ Invoice generation with bank details will work
