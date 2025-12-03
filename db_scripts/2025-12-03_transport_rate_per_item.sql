-- Transport Rate Per Line Item
-- Date: 2025-12-03
-- Description: Adds transport rate and charges columns to invoice_items table
-- Business Logic: Each line item can have a different transport rate per case
-- Transport is calculated as (rate × quantity) per item, summed for invoice total
-- Transport is added AFTER GST calculation (not subject to tax)

-- Add transport rate per case column (rate entered by user)
ALTER TABLE invoice_items 
ADD COLUMN IF NOT EXISTS transport_rate_per_case NUMERIC(10, 2) DEFAULT 0;

-- Add calculated transport charges column (rate × quantity)
ALTER TABLE invoice_items 
ADD COLUMN IF NOT EXISTS transport_charges NUMERIC(10, 2) DEFAULT 0;

-- Update existing records to have 0 transport if null
UPDATE invoice_items 
SET transport_rate_per_case = 0 
WHERE transport_rate_per_case IS NULL;

UPDATE invoice_items 
SET transport_charges = 0 
WHERE transport_charges IS NULL;
