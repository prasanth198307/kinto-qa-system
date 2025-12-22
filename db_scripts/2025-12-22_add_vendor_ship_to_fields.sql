-- Add ship-to address fields to vendors table for HPCL migration
-- Run this on production database before deploying HPCL migration feature
-- Date: 2025-12-22

ALTER TABLE vendors 
ADD COLUMN IF NOT EXISTS ship_to_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS ship_to_address TEXT,
ADD COLUMN IF NOT EXISTS ship_to_city VARCHAR(100),
ADD COLUMN IF NOT EXISTS ship_to_state VARCHAR(100),
ADD COLUMN IF NOT EXISTS ship_to_pincode VARCHAR(20),
ADD COLUMN IF NOT EXISTS ship_to_gstin VARCHAR(20);

-- Verify columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'vendors' 
AND column_name LIKE 'ship_to%'
ORDER BY column_name;
