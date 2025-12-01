-- Migration: Add signature columns to invoice_templates table
-- Date: 2025-12-01
-- Description: Add defaultSignatureImage and authorizedSignatoryName to invoice_templates table

-- Add defaultSignatureImage column to invoice_templates table (stores base64 encoded signature image)
ALTER TABLE invoice_templates 
ADD COLUMN IF NOT EXISTS default_signature_image TEXT;

-- Add authorizedSignatoryName column to invoice_templates table
ALTER TABLE invoice_templates 
ADD COLUMN IF NOT EXISTS authorized_signatory_name VARCHAR(255);

-- Add comments for documentation
COMMENT ON COLUMN invoice_templates.default_signature_image IS 'Base64 encoded signature image with transparent background for invoices';
COMMENT ON COLUMN invoice_templates.authorized_signatory_name IS 'Name of authorized signatory to display below signature on invoices';
