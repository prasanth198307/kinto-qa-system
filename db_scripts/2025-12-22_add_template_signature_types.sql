-- Add HPCL and Alternate signature fields to invoice_templates table
-- Date: 2025-12-22
-- Purpose: Support multiple signature types (default, HPCL, alternate) per template

-- Add HPCL signature fields
ALTER TABLE invoice_templates 
ADD COLUMN IF NOT EXISTS hpcl_signature_image TEXT;

ALTER TABLE invoice_templates 
ADD COLUMN IF NOT EXISTS hpcl_signatory_name VARCHAR(255);

-- Add Alternate signature fields
ALTER TABLE invoice_templates 
ADD COLUMN IF NOT EXISTS alternate_signature_image TEXT;

ALTER TABLE invoice_templates 
ADD COLUMN IF NOT EXISTS alternate_signatory_name VARCHAR(255);

-- Verify the columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'invoice_templates' 
  AND column_name IN ('hpcl_signature_image', 'hpcl_signatory_name', 'alternate_signature_image', 'alternate_signatory_name');
