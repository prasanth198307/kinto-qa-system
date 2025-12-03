-- Update Vyapaar Imported Invoices to 'delivered' status
-- Run this on PRODUCTION database
-- Created: 2025-12-03

-- FIRST: Check your invoice number patterns
-- Run this to see what invoice numbers look like
SELECT invoice_number, invoice_date, status, created_at
FROM invoices 
ORDER BY created_at DESC 
LIMIT 30;

-- OPTION 1: Update by invoice number pattern
-- Vyapaar invoices are typically just numbers (1, 2, 3, 100, 200...)
-- or numbers with -DUP suffix (1-DUP, 100-DUP)
UPDATE invoices 
SET status = 'delivered' 
WHERE invoice_number ~ '^[0-9]+(-DUP)?$'
  AND status != 'delivered';

-- OPTION 2: Update ALL invoices EXCEPT specific recent ones
-- Replace 'YOUR-NEW-INVOICE-1', 'YOUR-NEW-INVOICE-2' with your system invoice numbers
-- UPDATE invoices 
-- SET status = 'delivered' 
-- WHERE invoice_number NOT IN ('YOUR-NEW-INVOICE-1', 'YOUR-NEW-INVOICE-2')
--   AND status != 'delivered';

-- OPTION 3: Update by created_at date
-- Vyapaar imports were created on a specific date during import
-- UPDATE invoices 
-- SET status = 'delivered' 
-- WHERE created_at < '2025-12-01'  -- Change to date you started using system
--   AND status != 'delivered';

-- OPTION 4: Update ALL invoices except those created after a specific date
-- UPDATE invoices 
-- SET status = 'delivered' 
-- WHERE DATE(created_at) < '2025-12-03'  -- Your system start date
--   AND status != 'delivered';

-- Verify the update
SELECT status, COUNT(*) as count 
FROM invoices 
GROUP BY status 
ORDER BY count DESC;
