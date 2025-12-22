-- Add signature_type column to invoices table
-- Date: 2025-12-22
-- Purpose: Allow selection of different signature types for invoices (default, hpcl, alternate)

ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS signature_type VARCHAR(50) DEFAULT 'default';

-- Verify the column was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'invoices' 
  AND column_name = 'signature_type';
