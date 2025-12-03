-- Update Vyapaar Imported Invoices to 'delivered' status
-- Run this on PRODUCTION database
-- Created: 2025-12-03

-- OPTION 1: Update invoices that have Vyapaar-imported payments
-- Vyapaar imports have payment remarks containing 'Vyapaar'
UPDATE invoices 
SET status = 'delivered' 
WHERE id IN (
    SELECT DISTINCT invoice_id 
    FROM invoice_payments 
    WHERE remarks LIKE '%Vyapaar%'
)
AND status != 'delivered';

-- OPTION 2: Update by invoice number pattern
-- Vyapaar invoices are typically just numbers (1, 2, 3, 100, 200...)
-- System invoices might have different patterns
-- Uncomment if you want to use this approach instead
-- UPDATE invoices 
-- SET status = 'delivered' 
-- WHERE invoice_number ~ '^[0-9]+(-DUP)?$'  -- Numeric with optional -DUP suffix
--   AND status != 'delivered';

-- OPTION 3: Update by date range (if you know when system invoices started)
-- Change the date to when you started creating new invoices
-- UPDATE invoices 
-- SET status = 'delivered' 
-- WHERE invoice_date < '2025-12-01'
--   AND status != 'delivered';

-- Verify the update
SELECT status, COUNT(*) as count 
FROM invoices 
GROUP BY status 
ORDER BY count DESC;

-- Optional: Check which invoices were updated
-- SELECT invoice_number, status, invoice_date 
-- FROM invoices 
-- WHERE status = 'delivered'
-- ORDER BY invoice_date DESC
-- LIMIT 20;
