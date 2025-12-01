-- Migration: Add signature columns to invoices table
-- Date: 2025-12-01
-- Description: Add includeSignature toggle and authorizedSignatoryName to invoices table

-- Add includeSignature column to invoices table (1 = include signature, 0 = no signature)
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS include_signature INTEGER NOT NULL DEFAULT 1;

-- Add authorizedSignatoryName column to invoices table
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS authorized_signatory_name VARCHAR(255);

-- Add comment for documentation
COMMENT ON COLUMN invoices.include_signature IS 'Controls whether digital signature appears on printed invoice. 1 = include, 0 = exclude';
COMMENT ON COLUMN invoices.authorized_signatory_name IS 'Name of authorized signatory copied from template at invoice creation time';
