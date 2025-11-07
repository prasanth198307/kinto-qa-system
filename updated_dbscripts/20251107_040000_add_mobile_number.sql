-- Add Mobile Number to Users Table
-- Created: November 07, 2025 04:00:00
-- Description: Add mandatory mobile number field to users table

-- =====================================================
-- ALTER TABLE: users
-- Add mobile_number column (required)
-- =====================================================

-- Add the column as nullable first
ALTER TABLE users ADD COLUMN IF NOT EXISTS mobile_number VARCHAR(15);

-- Update existing users with a default mobile number (you should update these manually later)
-- Using pattern: 9999999XXX where XXX is based on user ID
UPDATE users 
SET mobile_number = CONCAT('9999999', LPAD(SUBSTRING(id, 1, 3), 3, '0'))
WHERE mobile_number IS NULL;

-- Now make it NOT NULL
ALTER TABLE users ALTER COLUMN mobile_number SET NOT NULL;

COMMENT ON COLUMN users.mobile_number IS 'User mobile number (10 digits, required for notifications)';

-- =====================================================
-- NOTES
-- =====================================================
-- 1. Existing users will have placeholder mobile numbers (9999999XXX)
-- 2. Admin should update all user mobile numbers to real values
-- 3. New users must provide valid 10-digit mobile numbers
-- 4. Format: Indian mobile numbers (10 digits)
-- 5. Used for WhatsApp notifications and SMS alerts

-- =====================================================
-- TO APPLY THIS MIGRATION
-- =====================================================
-- Option 1 (Recommended): Use Drizzle Push
--   npm run db:push
--   (or npm run db:push --force if needed)
--
-- Option 2: Manual SQL execution (if needed)
--   Run this script directly in your PostgreSQL database
