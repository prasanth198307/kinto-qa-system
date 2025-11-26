-- Migration: Add GST Verification columns to vendors table
-- Date: 2025-11-26
-- Description: Adds columns for storing GST verification status and details
-- Run this on production database before deploying the GST verification feature

-- Add GST verification columns to vendors table (if they don't exist)
DO $$ 
BEGIN
    -- Add gst_status column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vendors' AND column_name = 'gst_status'
    ) THEN
        ALTER TABLE vendors ADD COLUMN gst_status VARCHAR(50);
        RAISE NOTICE 'Added gst_status column';
    ELSE
        RAISE NOTICE 'gst_status column already exists';
    END IF;

    -- Add gst_legal_name column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vendors' AND column_name = 'gst_legal_name'
    ) THEN
        ALTER TABLE vendors ADD COLUMN gst_legal_name VARCHAR(255);
        RAISE NOTICE 'Added gst_legal_name column';
    ELSE
        RAISE NOTICE 'gst_legal_name column already exists';
    END IF;

    -- Add gst_trade_name column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vendors' AND column_name = 'gst_trade_name'
    ) THEN
        ALTER TABLE vendors ADD COLUMN gst_trade_name VARCHAR(255);
        RAISE NOTICE 'Added gst_trade_name column';
    ELSE
        RAISE NOTICE 'gst_trade_name column already exists';
    END IF;

    -- Add gst_verified_at column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vendors' AND column_name = 'gst_verified_at'
    ) THEN
        ALTER TABLE vendors ADD COLUMN gst_verified_at TIMESTAMP;
        RAISE NOTICE 'Added gst_verified_at column';
    ELSE
        RAISE NOTICE 'gst_verified_at column already exists';
    END IF;
END $$;

-- Optional: Set default status for existing vendors with GST numbers
-- Uncomment the following if you want to mark existing vendors as pending verification
-- UPDATE vendors 
-- SET gst_status = 'Pending Verification' 
-- WHERE gst_number IS NOT NULL 
--   AND gst_number != '' 
--   AND (gst_status IS NULL OR gst_status = '');

-- Verify the columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'vendors' 
AND column_name LIKE 'gst%'
ORDER BY ordinal_position;
