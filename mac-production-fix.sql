-- KINTO Smart Ops - Mac Production Database Fix
-- Run this on your Mac production database to add missing unique constraint

-- This prevents duplicate vendor type assignments (e.g., "Kinto Kinto" badges)
-- Safe to run - will fail gracefully if constraint already exists

BEGIN;

-- Remove any duplicate vendor type assignments first
DELETE FROM vendor_vendor_types a USING vendor_vendor_types b
WHERE a.id > b.id 
  AND a.vendor_id = b.vendor_id 
  AND a.vendor_type_id = b.vendor_type_id;

-- Add unique constraint to prevent future duplicates
ALTER TABLE vendor_vendor_types 
ADD CONSTRAINT vendor_vendor_types_vendor_id_vendor_type_id_unique 
UNIQUE (vendor_id, vendor_type_id);

COMMIT;

-- Verify the constraint was added
SELECT conname, contype 
FROM pg_constraint 
WHERE conrelid = 'vendor_vendor_types'::regclass 
  AND conname = 'vendor_vendor_types_vendor_id_vendor_type_id_unique';
