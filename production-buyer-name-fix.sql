-- KINTO Smart Ops - Production Buyer Name Fix
-- Run this on your Mac production database to fix the 3L discrepancy
-- This matches buyer names to vendor master records for accurate vendor analytics

-- Summary: Fixes 8 invoices with buyer names that don't exactly match vendor records
-- Total amount affected: ₹3,10,000

BEGIN;

-- Fix 1: Sri Kanthamma Talli Agencies (6 invoices, ₹3,03,334)
-- Remove parenthetical alternate name
UPDATE invoices
SET buyer_name = 'Sri Kanthamma Talli Agencies'
WHERE buyer_name = 'Sri Kanthamma Talli Agencies (Sri Kartam Talli Agencies)'
  AND record_status = 1;

-- Fix 2: SRI VENKATESWARA SERVICE STATION (1 invoice, ₹4,945)
-- Remove parenthetical alternate name
UPDATE invoices
SET buyer_name = 'SRI VENKATESWARA SERVICE STATION'
WHERE buyer_name = 'SRI VENKATESWARA SERVICE STATION (MS SRI VENKATESWARA SER STN T CHOULTR)'
  AND record_status = 1;

-- Fix 3: MSHSD VISALAKSHI FILLING STATION RAMPURM (1 invoice, ₹1,720)
-- Remove truncated parenthetical name
UPDATE invoices
SET buyer_name = 'MSHSD VISALAKSHI FILLING STATION RAMPURM'
WHERE buyer_name = 'MSHSD VISALAKSHI FILLING STATION RAMPURM (VISALAKSHI FILLING STATI)'
  AND record_status = 1;

-- Verification query - should show 0 unmatched invoices
SELECT 
  'Unmatched Invoices After Fix' as status,
  COUNT(*) as invoice_count,
  COALESCE(SUM(total_amount)/100, 0) as total_sales_rupees
FROM invoices i
LEFT JOIN vendors v ON i.buyer_name = v.vendor_name AND v.record_status = 1
WHERE i.record_status = 1 AND v.id IS NULL;

-- Verification query - should show all 339 invoices matched
SELECT 
  'Matched Invoices After Fix' as status,
  COUNT(*) as invoice_count,
  SUM(total_amount)/100 as total_sales_rupees
FROM invoices i
INNER JOIN vendors v ON i.buyer_name = v.vendor_name AND v.record_status = 1
WHERE i.record_status = 1;

COMMIT;

-- Expected results after running this script:
-- - Unmatched: 0 invoices, ₹0
-- - Matched: 339 invoices, ₹1,13,59,999
-- - Sales Dashboard and Vendor Analytics will show identical totals
