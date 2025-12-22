-- HPCL Vendor Master Migration Script
-- Date: 2025-12-22
-- Purpose: Update HPPani vendors to use ship-to pattern
--          Move current vendor details to ship-to fields, set HPCL corporate as main vendor
-- 
-- Run this FIRST, then run the invoice/gatepass migration script
-- Test on staging first, then run on production with backup

-- HPCL Corporate Details
-- Vendor Name: VISAKH RETAIL RO Petronilayam, HPCL
-- Address: Opp AU IN Gate, China Waltair, Visakhapatnam
-- City: Visakhapatnam
-- State: Andhra Pradesh
-- Pincode: 530003
-- GSTIN: 37AAACH1118B1ZB

-- ============================================
-- STEP 1: PREVIEW - Check what will be updated
-- ============================================

-- Check if ship_to columns exist (run this first)
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'vendors' 
  AND column_name LIKE 'ship_to%';

-- List all HPPani vendors that need migration (don't have ship_to_name set yet)
SELECT 
    v.vendor_code,
    v.vendor_name,
    v.address,
    v.city,
    v.state,
    v.pincode,
    v.gst_number,
    v.ship_to_name AS current_ship_to
FROM vendors v
JOIN vendor_vendor_types vvt ON v.id = vvt.vendor_id
JOIN vendor_types vt ON vvt.vendor_type_id = vt.id
WHERE vt.code = 'HPPANI'
  AND vvt.is_primary = 1
  AND v.record_status = 1
  AND vvt.record_status = 1
  AND v.ship_to_name IS NULL
ORDER BY v.vendor_name;

-- Count vendors to migrate
SELECT COUNT(*) AS vendors_to_migrate
FROM vendors v
JOIN vendor_vendor_types vvt ON v.id = vvt.vendor_id
JOIN vendor_types vt ON vvt.vendor_type_id = vt.id
WHERE vt.code = 'HPPANI'
  AND vvt.is_primary = 1
  AND v.record_status = 1
  AND vvt.record_status = 1
  AND v.ship_to_name IS NULL;

-- Count already migrated vendors
SELECT COUNT(*) AS already_migrated
FROM vendors v
JOIN vendor_vendor_types vvt ON v.id = vvt.vendor_id
JOIN vendor_types vt ON vvt.vendor_type_id = vt.id
WHERE vt.code = 'HPPANI'
  AND vvt.is_primary = 1
  AND v.record_status = 1
  AND vvt.record_status = 1
  AND v.ship_to_name IS NOT NULL;

-- ============================================
-- STEP 2: ADD COLUMNS (if not already present)
-- ============================================

-- Add ship_to columns if they don't exist
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS ship_to_name VARCHAR(255);
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS ship_to_address TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS ship_to_city VARCHAR(100);
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS ship_to_state VARCHAR(100);
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS ship_to_pincode VARCHAR(20);
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS ship_to_gstin VARCHAR(20);

-- ============================================
-- STEP 3: EXECUTE - Run the vendor migration
-- ============================================

BEGIN;

-- Update HPPani vendors: Move current details to ship-to, set HPCL corporate as main
UPDATE vendors v
SET 
    ship_to_name = v.vendor_name,
    ship_to_address = v.address,
    ship_to_city = v.city,
    ship_to_state = v.state,
    ship_to_pincode = v.pincode,
    ship_to_gstin = v.gst_number,
    vendor_name = 'VISAKH RETAIL RO Petronilayam, HPCL',
    address = 'Opp AU IN Gate, China Waltair, Visakhapatnam',
    city = 'Visakhapatnam',
    state = 'Andhra Pradesh',
    pincode = '530003',
    gst_number = '37AAACH1118B1ZB'
FROM vendor_vendor_types vvt
JOIN vendor_types vt ON vvt.vendor_type_id = vt.id
WHERE v.id = vvt.vendor_id
  AND vt.code = 'HPPANI'
  AND vvt.is_primary = 1
  AND v.record_status = 1
  AND vvt.record_status = 1
  AND v.ship_to_name IS NULL;

-- Verify the updates
SELECT 'Vendors updated:' AS status, COUNT(*) AS count
FROM vendors v
JOIN vendor_vendor_types vvt ON v.id = vvt.vendor_id
JOIN vendor_types vt ON vvt.vendor_type_id = vt.id
WHERE vt.code = 'HPPANI'
  AND vvt.is_primary = 1
  AND v.record_status = 1
  AND vvt.record_status = 1
  AND v.ship_to_name IS NOT NULL;

-- Show migrated vendors
SELECT 
    v.vendor_code,
    v.vendor_name AS new_vendor_name,
    v.gst_number AS new_gst,
    v.ship_to_name,
    v.ship_to_gstin
FROM vendors v
JOIN vendor_vendor_types vvt ON v.id = vvt.vendor_id
JOIN vendor_types vt ON vvt.vendor_type_id = vt.id
WHERE vt.code = 'HPPANI'
  AND vvt.is_primary = 1
  AND v.record_status = 1
  AND vvt.record_status = 1
  AND v.ship_to_name IS NOT NULL
ORDER BY v.vendor_code;

-- If everything looks good, commit. Otherwise rollback.
COMMIT;
-- ROLLBACK;  -- Uncomment this and comment COMMIT if you need to undo
