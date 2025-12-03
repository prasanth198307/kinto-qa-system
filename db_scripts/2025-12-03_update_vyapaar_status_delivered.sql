-- Update specific Vyapaar Invoice to 'delivered' status
-- Run this on PRODUCTION database
-- Created: 2025-12-03

-- Update invoice 468 to delivered
UPDATE invoices 
SET status = 'delivered' 
WHERE invoice_number = '468';

-- Verify
SELECT invoice_number, status, invoice_date 
FROM invoices 
WHERE invoice_number = '468';
