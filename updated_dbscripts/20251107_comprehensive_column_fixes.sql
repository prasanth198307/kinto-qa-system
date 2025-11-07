-- Comprehensive Database Column Fixes for KINTO QA Management System
-- Date: November 7, 2025
-- Purpose: Add all missing columns identified during Mac deployment testing

-- Fix: invoices table missing columns
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS buyer_contact varchar(50);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_terms varchar(255);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS place_of_supply varchar(100);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS reverse_charge integer DEFAULT 0 NOT NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS transport_mode varchar(50);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS vehicle_number varchar(50);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS date_of_supply timestamp;

-- Fix: spare_parts_catalog table missing columns
ALTER TABLE spare_parts_catalog ADD COLUMN IF NOT EXISTS machine_id varchar REFERENCES machines(id);

-- Fix: raw_material_issuance table missing columns
ALTER TABLE raw_material_issuance ADD COLUMN IF NOT EXISTS product_id varchar REFERENCES products(id);

-- Note: All tables use recordstatus (no underscore) consistently

-- Additional Fix: invoices.generated_by column
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS generated_by varchar REFERENCES users(id);

-- Fix: invoices column naming (recordstatus -> record_status)
ALTER TABLE invoices RENAME COLUMN IF EXISTS recordstatus TO record_status;
