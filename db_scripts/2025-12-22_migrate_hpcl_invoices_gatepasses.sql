-- HPCL Invoice and Gatepass Migration Script
-- Date: 2025-12-22
-- Purpose: Update December 2024 invoices and gatepasses for migrated HPCL vendors
--          Move current buyer details to ship-to, set HPCL corporate as buyer
-- 
-- IMPORTANT: Run this AFTER the vendor migration is complete
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

-- Preview invoices to be migrated
SELECT 
    i.invoice_number,
    i.invoice_date,
    i.buyer_name AS current_buyer,
    i.buyer_gstin AS current_gst,
    i.grand_total,
    v.vendor_code,
    v.ship_to_name AS vendor_ship_to
FROM invoices i
JOIN vendors v ON i.vendor_id = v.id
JOIN vendor_vendor_types vvt ON v.id = vvt.vendor_id
JOIN vendor_types vt ON vvt.vendor_type_id = vt.id
WHERE vt.code = 'HPPANI'
  AND vvt.is_primary = 1
  AND v.ship_to_name IS NOT NULL
  AND i.invoice_date >= '2024-12-01'
  AND i.record_status = 1
  AND i.buyer_name != 'VISAKH RETAIL RO Petronilayam, HPCL'
ORDER BY i.invoice_date;

-- Count invoices to migrate
SELECT COUNT(*) AS invoices_to_migrate
FROM invoices i
JOIN vendors v ON i.vendor_id = v.id
JOIN vendor_vendor_types vvt ON v.id = vvt.vendor_id
JOIN vendor_types vt ON vvt.vendor_type_id = vt.id
WHERE vt.code = 'HPPANI'
  AND vvt.is_primary = 1
  AND v.ship_to_name IS NOT NULL
  AND i.invoice_date >= '2024-12-01'
  AND i.record_status = 1
  AND i.buyer_name != 'VISAKH RETAIL RO Petronilayam, HPCL';

-- Preview gatepasses to be migrated
SELECT 
    g.gatepass_number,
    g.gatepass_date,
    g.buyer_name AS current_buyer,
    g.buyer_gstin AS current_gst,
    i.invoice_number
FROM gatepasses g
JOIN invoices i ON g.invoice_id = i.id
JOIN vendors v ON i.vendor_id = v.id
JOIN vendor_vendor_types vvt ON v.id = vvt.vendor_id
JOIN vendor_types vt ON vvt.vendor_type_id = vt.id
WHERE vt.code = 'HPPANI'
  AND vvt.is_primary = 1
  AND v.ship_to_name IS NOT NULL
  AND g.gatepass_date >= '2024-12-01'
  AND g.record_status = 1
  AND g.buyer_name != 'VISAKH RETAIL RO Petronilayam, HPCL'
ORDER BY g.gatepass_date;

-- Count gatepasses to migrate
SELECT COUNT(*) AS gatepasses_to_migrate
FROM gatepasses g
JOIN invoices i ON g.invoice_id = i.id
JOIN vendors v ON i.vendor_id = v.id
JOIN vendor_vendor_types vvt ON v.id = vvt.vendor_id
JOIN vendor_types vt ON vvt.vendor_type_id = vt.id
WHERE vt.code = 'HPPANI'
  AND vvt.is_primary = 1
  AND v.ship_to_name IS NOT NULL
  AND g.gatepass_date >= '2024-12-01'
  AND g.record_status = 1
  AND g.buyer_name != 'VISAKH RETAIL RO Petronilayam, HPCL';

-- ============================================
-- STEP 2: EXECUTE - Run the migration
-- ============================================

BEGIN;

-- Update Invoices: Move buyer to ship-to, set HPCL corporate as buyer

UPDATE invoices i
SET 
    ship_to_name = i.buyer_name,
    ship_to_address = i.buyer_address,
    ship_to_state = i.buyer_state,
    buyer_name = 'VISAKH RETAIL RO Petronilayam, HPCL',
    buyer_address = 'Opp AU IN Gate, China Waltair, Visakhapatnam-530003',
    buyer_state = 'Andhra Pradesh',
    buyer_gstin = '37AAACH1118B1ZB'
FROM vendors v
JOIN vendor_vendor_types vvt ON v.id = vvt.vendor_id
JOIN vendor_types vt ON vvt.vendor_type_id = vt.id
WHERE i.buyer_name = v.ship_to_name
  AND vt.code = 'HPPANI'
  AND vvt.is_primary = 1
  AND v.ship_to_name IS NOT NULL
  AND i.invoice_date >= '2025-12-01'
  AND i.record_status = 1
  AND i.buyer_name != 'VISAKH RETAIL RO Petronilayam, HPCL';


-- Update Gatepasses: Move buyer to ship-to, set HPCL corporate as buyer
UPDATE gatepasses g
SET 
    ship_to_name = g.buyer_name,
    ship_to_address = g.buyer_address,
    ship_to_city = g.buyer_city,
    ship_to_state = g.buyer_state,
    ship_to_pincode = g.buyer_pincode,
    ship_to_gstin = g.buyer_gstin,
    buyer_name = 'VISAKH RETAIL RO Petronilayam, HPCL',
    buyer_address = 'Opp AU IN Gate, China Waltair, Visakhapatnam',
    buyer_city = 'Visakhapatnam',
    buyer_state = 'Andhra Pradesh',
    buyer_pincode = '530003',
    buyer_gstin = '37AAACH1118B1ZB'
FROM invoices i
JOIN vendors v ON i.vendor_id = v.id
JOIN vendor_vendor_types vvt ON v.id = vvt.vendor_id
JOIN vendor_types vt ON vvt.vendor_type_id = vt.id
WHERE g.invoice_id = i.id
  AND vt.code = 'HPPANI'
  AND vvt.is_primary = 1
  AND v.ship_to_name IS NOT NULL
  AND g.gatepass_date >= '2024-12-01'
  AND g.record_status = 1
  AND g.buyer_name != 'VISAKH RETAIL RO Petronilayam, HPCL';

-- Verify the updates
SELECT 'Invoices updated:' AS status, COUNT(*) AS count
FROM invoices i
JOIN vendors v ON i.vendor_id = v.id
JOIN vendor_vendor_types vvt ON v.id = vvt.vendor_id
JOIN vendor_types vt ON vvt.vendor_type_id = vt.id
WHERE vt.code = 'HPPANI'
  AND vvt.is_primary = 1
  AND i.invoice_date >= '2024-12-01'
  AND i.record_status = 1
  AND i.buyer_name = 'VISAKH RETAIL RO Petronilayam, HPCL'
  AND i.ship_to_name IS NOT NULL;

SELECT 'Gatepasses updated:' AS status, COUNT(*) AS count
FROM gatepasses g
JOIN invoices i ON g.invoice_id = i.id
JOIN vendors v ON i.vendor_id = v.id
JOIN vendor_vendor_types vvt ON v.id = vvt.vendor_id
JOIN vendor_types vt ON vvt.vendor_type_id = vt.id
WHERE vt.code = 'HPPANI'
  AND vvt.is_primary = 1
  AND g.gatepass_date >= '2024-12-01'
  AND g.record_status = 1
  AND g.buyer_name = 'VISAKH RETAIL RO Petronilayam, HPCL'
  AND g.ship_to_name IS NOT NULL;

-- If everything looks good, commit. Otherwise rollback.
COMMIT;
-- ROLLBACK;  -- Uncomment this and comment COMMIT if you need to undo
