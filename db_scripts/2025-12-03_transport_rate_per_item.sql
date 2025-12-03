-- Transport Rate Per Line Item
-- Date: 2025-12-03
-- Description: Adds transport rate and charges columns to invoice_items and invoices tables
-- Business Logic: Each line item can have a different transport rate per case
-- Transport is calculated as (rate × quantity) per item, summed for invoice total
-- Transport is added AFTER GST calculation (not subject to tax)

-- =====================================================
-- INVOICE_ITEMS TABLE - Per line item transport
-- =====================================================
-- Add transport rate per case column (rate entered by user)
ALTER TABLE invoice_items 
ADD COLUMN IF NOT EXISTS transport_rate_per_case INTEGER DEFAULT 0 NOT NULL;

-- Add calculated transport charges column (rate × quantity)
ALTER TABLE invoice_items 
ADD COLUMN IF NOT EXISTS transport_charges INTEGER DEFAULT 0 NOT NULL;

-- =====================================================
-- INVOICES TABLE - Aggregated transport totals
-- =====================================================
-- transportRatePerCase on invoices table is legacy/unused (kept for schema compatibility)
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS transport_rate_per_case INTEGER DEFAULT 0 NOT NULL;

-- Total transport charges (sum of all line items)
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS transport_charges INTEGER DEFAULT 0 NOT NULL;
