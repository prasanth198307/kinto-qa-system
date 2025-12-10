-- Fix incorrect GST number in production database
-- Date: 2025-12-10
-- Issue: GST was incorrectly saved as 37AAHCI4057B1ZR instead of 37AAHCI5047B1ZR
-- The digit '4' was wrong, should be '5' (4057 → 5047)

-- Step 1: Fix GST in all existing invoices
UPDATE invoices 
SET seller_gstin = '37AAHCI5047B1ZR',
    updated_at = NOW()
WHERE seller_gstin = '37AAHCI4057B1ZR';

-- Step 2: Fix GST in invoice templates
UPDATE invoice_templates 
SET default_seller_gstin = '37AAHCI5047B1ZR',
    updated_at = NOW()
WHERE default_seller_gstin = '37AAHCI4057B1ZR';

-- Step 3: Verify the fix
SELECT 'Invoices with correct GST:' as check_type, COUNT(*) as count 
FROM invoices WHERE seller_gstin = '37AAHCI5047B1ZR'
UNION ALL
SELECT 'Invoices with wrong GST:', COUNT(*) 
FROM invoices WHERE seller_gstin = '37AAHCI4057B1ZR';

-- Step 4: Show updated templates
SELECT id, template_name, default_seller_gstin 
FROM invoice_templates 
WHERE record_status = 1;
