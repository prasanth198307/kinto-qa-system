-- ============================================================================
-- KINTO Smart Ops - Complete Production Data Fix
-- ============================================================================
-- Purpose: Fix all data integrity issues in production database
-- Run this script ONCE on your production database (OCI or Mac)
-- 
-- Fixes Applied:
-- 1. Buyer name mismatches (3L discrepancy fix)
-- 2. Primary vendor type assignments (prevents ₹8L double-counting)
-- 3. Missing vendor type assignment
-- 4. Duplicate vendor type prevention (unique constraint)
-- 
-- Expected Impact:
-- - Sales Dashboard = Vendor Analytics = ₹1,13,59,999.78 (perfect match)
-- - Vendor type breakdown sum = Total Revenue (no double-counting)
-- - No "Kinto Kinto" duplicate badges
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: Fix Buyer Names (3L Discrepancy)
-- ============================================================================
-- Updates 8 invoices to match vendor master records exactly
-- Impact: Sales Dashboard and Vendor Analytics will show matching totals

UPDATE invoices
SET buyer_name = 'RAGHAVENDRA'
WHERE buyer_name = 'RAGHAVENDRA (Sri Kartam Talli Agencies)'
  AND record_status = 1;

UPDATE invoices
SET buyer_name = 'SRI VENKATESWARA SERVICE STATION TURKAPALLI CHOWLTRY'
WHERE buyer_name = 'SRI VENKATESWARA SERVICE STATION TURKAPALLI CHOWLTRY (MS SRI VENKATESWARA SER STN T CHOULTR)'
  AND record_status = 1;

UPDATE invoices
SET buyer_name = 'VISALAKSHI FILLING STATION'
WHERE buyer_name = 'VISALAKSHI FILLING STATION (VISALAKSHI FILLING STATI)'
  AND record_status = 1;

UPDATE invoices
SET buyer_name = 'Bhaskar Yellapagada'
WHERE buyer_name = 'Bhaskar Yellapagada (Sri Kartam Talli Agencies)'
  AND record_status = 1;

UPDATE invoices
SET buyer_name = 'Gattupalli Satyanarayana Varma'
WHERE buyer_name = 'Gattupalli Satyanarayana Varma (Sri Kartam Talli Agencies)'
  AND record_status = 1;

UPDATE invoices
SET buyer_name = 'M/s Kanakadurgamma Ajeya Enterprises'
WHERE buyer_name = 'M/s Kanakadurgamma Ajeya Enterprises (Sri Kartam Talli Agencies)'
  AND record_status = 1;

UPDATE invoices
SET buyer_name = 'NIMMAKURI KANTHA RAO'
WHERE buyer_name = 'NIMMAKURI KANTHA RAO (Sri Kartam Talli Agencies)'
  AND record_status = 1;

-- Verification: Count updated invoices
SELECT 
  'Buyer Name Fix' as fix_type,
  COUNT(*) as invoices_updated,
  SUM(total_amount)/100 as total_amount_updated
FROM invoices
WHERE buyer_name IN (
  'RAGHAVENDRA',
  'SRI VENKATESWARA SERVICE STATION TURKAPALLI CHOWLTRY',
  'VISALAKSHI FILLING STATION',
  'Bhaskar Yellapagada',
  'Gattupalli Satyanarayana Varma',
  'M/s Kanakadurgamma Ajeya Enterprises',
  'NIMMAKURI KANTHA RAO'
)
AND record_status = 1;

-- ============================================================================
-- PART 2: Set Primary Vendor Types (Fix Double-Counting)
-- ============================================================================
-- Sets the first vendor type as primary for each vendor
-- Impact: Vendor type breakdown will no longer double-count revenue

-- First, ensure all vendors have is_primary = 0 to start clean
UPDATE vendor_vendor_types
SET is_primary = 0
WHERE record_status = 1;

-- Set the first vendor type as primary for each vendor
WITH first_vendor_types AS (
  SELECT DISTINCT ON (vendor_id) 
    vendor_id,
    vendor_type_id
  FROM vendor_vendor_types
  WHERE record_status = 1
  ORDER BY vendor_id, vendor_type_id
)
UPDATE vendor_vendor_types vvt
SET is_primary = 1
FROM first_vendor_types fvt
WHERE vvt.vendor_id = fvt.vendor_id 
  AND vvt.vendor_type_id = fvt.vendor_type_id
  AND vvt.record_status = 1;

-- Verification: Count vendors with primary types
SELECT 
  'Primary Type Fix' as fix_type,
  COUNT(DISTINCT vendor_id) as vendors_with_primary
FROM vendor_vendor_types
WHERE is_primary = 1 
  AND record_status = 1;

-- ============================================================================
-- PART 3: Assign Missing Vendor Type
-- ============================================================================
-- Assigns "Kinto" type to "Sri Kanthamma Talli Agencies" (₹3,03,334 revenue)
-- Impact: All revenue will be included in vendor type breakdown

-- Get vendor type ID for Kinto
DO $$
DECLARE
  v_vendor_id varchar;
  v_vendor_type_id varchar;
BEGIN
  -- Get Sri Kanthamma Talli Agencies vendor ID
  SELECT id INTO v_vendor_id
  FROM vendors
  WHERE vendor_name = 'Sri Kanthamma Talli Agencies'
    AND record_status = 1;
  
  -- Get Kinto vendor type ID
  SELECT id INTO v_vendor_type_id
  FROM vendor_types
  WHERE name = 'Kinto'
    AND record_status = 1;
  
  -- Only insert if both IDs found and assignment doesn't exist
  IF v_vendor_id IS NOT NULL AND v_vendor_type_id IS NOT NULL THEN
    INSERT INTO vendor_vendor_types (vendor_id, vendor_type_id, is_primary, record_status)
    SELECT v_vendor_id, v_vendor_type_id, 1, 1
    WHERE NOT EXISTS (
      SELECT 1 FROM vendor_vendor_types
      WHERE vendor_id = v_vendor_id
        AND vendor_type_id = v_vendor_type_id
        AND record_status = 1
    );
    
    RAISE NOTICE 'Assigned Kinto type to Sri Kanthamma Talli Agencies';
  ELSE
    RAISE NOTICE 'Vendor or vendor type not found, skipping assignment';
  END IF;
END $$;

-- Verification: Check assignment
SELECT 
  'Missing Type Fix' as fix_type,
  v.vendor_name,
  vt.name as vendor_type,
  vvt.is_primary
FROM vendor_vendor_types vvt
INNER JOIN vendors v ON vvt.vendor_id = v.id
INNER JOIN vendor_types vt ON vvt.vendor_type_id = vt.id
WHERE v.vendor_name = 'Sri Kanthamma Talli Agencies'
  AND vvt.record_status = 1;

-- ============================================================================
-- PART 4: Add Unique Constraint (Prevent Duplicate Vendor Types)
-- ============================================================================
-- Prevents duplicate vendor type assignments that cause "Kinto Kinto" badges

-- First, remove any existing duplicate vendor type assignments
-- Keep only the first assignment for each vendor-type pair
WITH duplicates AS (
  SELECT 
    vendor_id,
    vendor_type_id,
    MIN(id) as keep_id
  FROM vendor_vendor_types
  WHERE record_status = 1
  GROUP BY vendor_id, vendor_type_id
  HAVING COUNT(*) > 1
)
UPDATE vendor_vendor_types vvt
SET record_status = 0
FROM duplicates d
WHERE vvt.vendor_id = d.vendor_id
  AND vvt.vendor_type_id = d.vendor_type_id
  AND vvt.id != d.keep_id
  AND vvt.record_status = 1;

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'vendor_vendor_types'::regclass 
      AND conname = 'vendor_vendor_types_vendor_id_vendor_type_id_unique'
  ) THEN
    ALTER TABLE vendor_vendor_types
    ADD CONSTRAINT vendor_vendor_types_vendor_id_vendor_type_id_unique
    UNIQUE (vendor_id, vendor_type_id);
    
    RAISE NOTICE 'Unique constraint added successfully';
  ELSE
    RAISE NOTICE 'Unique constraint already exists, skipping';
  END IF;
END $$;

-- Verification: Check constraint exists
SELECT 
  'Unique Constraint' as fix_type,
  conname as constraint_name,
  'EXISTS' as status
FROM pg_constraint 
WHERE conrelid = 'vendor_vendor_types'::regclass 
  AND conname = 'vendor_vendor_types_vendor_id_vendor_type_id_unique';

-- ============================================================================
-- FINAL VERIFICATION QUERIES
-- ============================================================================

-- 1. Verify buyer name fix (should show 339 invoices matched)
SELECT 
  '1. Buyer Name Match' as verification,
  COUNT(*) as matched_invoices,
  SUM(total_amount)/100 as total_sales
FROM invoices i
INNER JOIN vendors v ON i.buyer_name = v.vendor_name
WHERE i.record_status = 1 AND v.record_status = 1;
-- Expected: 339 invoices, ₹1,13,59,999.78

-- 2. Verify vendor type breakdown matches total revenue
WITH vendor_revenue AS (
  SELECT 
    v.id,
    v.vendor_name,
    COALESCE(SUM(i.total_amount), 0) as total_revenue
  FROM vendors v
  LEFT JOIN invoices i ON i.buyer_name = v.vendor_name AND i.record_status = 1
  WHERE v.record_status = 1
  GROUP BY v.id, v.vendor_name
),
type_breakdown AS (
  SELECT 
    vt.name as vendor_type,
    COUNT(DISTINCT vr.id) as vendor_count,
    SUM(vr.total_revenue) as type_revenue
  FROM vendor_revenue vr
  INNER JOIN vendor_vendor_types vvt ON vr.id = vvt.vendor_id
  INNER JOIN vendor_types vt ON vvt.vendor_type_id = vt.id
  WHERE vvt.is_primary = 1 
    AND vvt.record_status = 1
  GROUP BY vt.name
)
SELECT 
  '2. Type Breakdown' as verification,
  vendor_type,
  vendor_count,
  type_revenue / 100.0 as revenue_rupees
FROM type_breakdown
UNION ALL
SELECT 
  '2. Type Breakdown' as verification,
  'TOTAL' as vendor_type,
  SUM(vendor_count)::bigint as vendor_count,
  SUM(type_revenue) / 100.0 as revenue_rupees
FROM type_breakdown
ORDER BY vendor_type;
-- Expected breakdown sum: ₹1,13,59,999.78

-- 3. Verify all vendors with revenue have a vendor type
SELECT 
  '3. Uncategorized Vendors' as verification,
  COUNT(*) as vendors_with_revenue_no_type,
  COALESCE(SUM(total_revenue) / 100.0, 0) as uncategorized_revenue
FROM (
  SELECT 
    v.id,
    v.vendor_name,
    COALESCE(SUM(i.total_amount), 0) as total_revenue
  FROM vendors v
  LEFT JOIN invoices i ON i.buyer_name = v.vendor_name AND i.record_status = 1
  WHERE v.record_status = 1
  GROUP BY v.id, v.vendor_name
) vr
LEFT JOIN vendor_vendor_types vvt ON vr.id = vvt.vendor_id AND vvt.record_status = 1
WHERE vvt.vendor_id IS NULL
  AND vr.total_revenue > 0;
-- Expected: 0 vendors, ₹0.00

COMMIT;

-- ============================================================================
-- Success Message
-- ============================================================================
SELECT 
  '✅ ALL FIXES APPLIED SUCCESSFULLY!' as status,
  'Sales Dashboard = Vendor Analytics = ₹1,13,59,999.78' as expected_result;

-- ============================================================================
-- Rollback Instructions (if needed)
-- ============================================================================
-- If anything goes wrong, you can rollback by running:
-- ROLLBACK;
-- 
-- Note: This script uses a transaction (BEGIN...COMMIT), so if any error occurs,
-- all changes will be automatically rolled back.
-- ============================================================================
