-- Add Cancel & Reissue tracking columns to invoices table
-- Run this on your local Mac database

-- Add original_invoice_id column (for reissued invoice: points to the cancelled invoice it replaced)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS original_invoice_id VARCHAR;

-- Add replaced_by_invoice_id column (for cancelled invoice: points to the new replacement invoice)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS replaced_by_invoice_id VARCHAR;

-- Add cancelled_at column (when the invoice was cancelled)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP;

-- Add cancelled_by column (who cancelled the invoice)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS cancelled_by VARCHAR REFERENCES users(id);

-- Verify columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'invoices' 
AND column_name IN ('original_invoice_id', 'replaced_by_invoice_id', 'cancelled_at', 'cancelled_by');
