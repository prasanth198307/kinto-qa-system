-- Credit Notes Schema Update - December 2, 2025
-- Makes invoice_id nullable and adds vendor_id column for imported credit notes

-- Make invoice_id nullable (for legacy imports without invoice reference)
ALTER TABLE credit_notes ALTER COLUMN invoice_id DROP NOT NULL;

-- Add vendor_id column for imported credit notes (required when invoice_id is null)
ALTER TABLE credit_notes ADD COLUMN IF NOT EXISTS vendor_id VARCHAR REFERENCES vendors(id);

-- Create index for vendor_id for better query performance
CREATE INDEX IF NOT EXISTS idx_credit_notes_vendor_id ON credit_notes(vendor_id);

-- Verify the changes
SELECT column_name, is_nullable, data_type 
FROM information_schema.columns 
WHERE table_name = 'credit_notes' 
AND column_name IN ('invoice_id', 'vendor_id')
ORDER BY ordinal_position;
