-- Migration: Change Gatepass-Invoice Relationship
-- Description: Change from invoice.gatepassId to gatepass.invoiceId
-- This enforces the business rule: Invoice must be created first, then selected in gatepass (one-time use)

-- Step 1: Drop the old gatepassId column from invoices table
ALTER TABLE invoices DROP COLUMN IF EXISTS gatepass_id;

-- Step 2: Drop the old invoiceNumber text field from gatepasses table
ALTER TABLE gatepasses DROP COLUMN IF EXISTS invoice_number;

-- Step 3: Add the new invoiceId foreign key column to gatepasses table
ALTER TABLE gatepasses ADD COLUMN IF NOT EXISTS invoice_id VARCHAR REFERENCES invoices(id) UNIQUE;

-- Add comment to explain business rule
COMMENT ON COLUMN gatepasses.invoice_id IS 'Foreign key to invoices table. One-to-one relationship: each invoice can only be linked to one gatepass';
