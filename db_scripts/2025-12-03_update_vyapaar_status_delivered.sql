-- Update Vyapaar Imported Invoices to 'delivered' status
-- Run this on PRODUCTION database
-- Created: 2025-12-03

-- OPTION 1: Update invoices that don't have a templateId (Vyapaar imports)
-- This is the safest method as Vyapaar imports won't have template references
UPDATE invoices 
SET status = 'delivered' 
WHERE template_id IS NULL 
  AND status != 'delivered';

-- Check how many were updated
-- SELECT COUNT(*) as updated_count FROM invoices WHERE template_id IS NULL AND status = 'delivered';

-- OPTION 2: If you know the cutoff date when you started using the system
-- Uncomment and set the date when you started creating invoices from the system
-- UPDATE invoices 
-- SET status = 'delivered' 
-- WHERE invoice_date < '2025-12-01'  -- Change this to your system start date
--   AND status != 'delivered';

-- OPTION 3: Update by invoice number pattern (if Vyapaar uses numeric only)
-- Vyapaar invoices are typically just numbers (1, 2, 3...)
-- System invoices might have prefixes like INV-001
-- UPDATE invoices 
-- SET status = 'delivered' 
-- WHERE invoice_number ~ '^[0-9]+$'  -- Only numeric invoice numbers
--   AND status != 'delivered';

-- Verify the update
SELECT status, COUNT(*) as count 
FROM invoices 
GROUP BY status 
ORDER BY count DESC;
