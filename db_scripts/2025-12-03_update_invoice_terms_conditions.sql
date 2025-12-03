-- Migration Script: Update existing invoices with default Terms & Conditions
-- Date: 2025-12-03
-- Purpose: Set the default terms_conditions_id for all invoices that don't have one
-- Run this on your production database to ensure all invoices show Terms & Conditions when printed

-- Step 1: Find and display the default Terms & Conditions (for verification)
SELECT id, tc_name, is_default 
FROM terms_conditions 
WHERE is_default = 1;

-- Step 2: Update all invoices that don't have terms_conditions_id set
-- Using the default T&C ID from your system
UPDATE invoices 
SET terms_conditions_id = (
    SELECT id FROM terms_conditions WHERE is_default = 1 LIMIT 1
)
WHERE terms_conditions_id IS NULL OR terms_conditions_id = '';

-- Step 3: Verify the update - show count of invoices with T&C now set
SELECT 
    COUNT(*) FILTER (WHERE terms_conditions_id IS NOT NULL) as with_terms,
    COUNT(*) FILTER (WHERE terms_conditions_id IS NULL) as without_terms,
    COUNT(*) as total_invoices
FROM invoices;

-- Alternative: If you know your default T&C ID, you can run this directly:
-- UPDATE invoices 
-- SET terms_conditions_id = 'YOUR_DEFAULT_TC_ID_HERE'
-- WHERE terms_conditions_id IS NULL OR terms_conditions_id = '';
