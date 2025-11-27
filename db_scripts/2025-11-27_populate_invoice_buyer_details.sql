-- Migration: Populate Invoice Buyer Details from Vendors Table
-- Date: 2025-11-27
-- Description: Updates invoices with buyer address, contact, GSTIN from matching vendors
-- Run this on production database after Vyapaar import

-- Step 1: Update invoices with matching vendor details
UPDATE invoices i
SET 
    buyer_address = v.address,
    buyer_contact = v.mobile_number,
    buyer_gstin = v.gst_number,
    buyer_state = v.state,
    buyer_state_code = CASE 
        WHEN v.gst_number IS NOT NULL AND LENGTH(v.gst_number) >= 2 
        THEN LEFT(v.gst_number, 2)
        ELSE NULL
    END
FROM vendors v
WHERE UPPER(TRIM(i.buyer_name)) = UPPER(TRIM(v.vendor_name))
  AND (i.buyer_address IS NULL OR i.buyer_address = '');

-- Step 2: Check results
SELECT 
    COUNT(*) as total_invoices,
    COUNT(buyer_address) as with_address,
    COUNT(*) - COUNT(buyer_address) as still_without_address
FROM invoices;

-- Step 3: Show sample of updated invoices
SELECT 
    invoice_number,
    buyer_name,
    LEFT(buyer_address, 50) as buyer_address_preview,
    buyer_contact,
    buyer_gstin
FROM invoices
WHERE buyer_address IS NOT NULL
ORDER BY invoice_number::int DESC
LIMIT 10;

-- Step 4: Show invoices that still don't have matching vendors
SELECT 
    invoice_number,
    buyer_name
FROM invoices
WHERE buyer_address IS NULL
ORDER BY invoice_number::int DESC
LIMIT 20;
