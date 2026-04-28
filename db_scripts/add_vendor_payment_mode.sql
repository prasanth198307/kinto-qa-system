-- Add payment_mode column to vendors table
-- Values: 'bill_to_bill' (default) or 'cod'
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS payment_mode varchar(20) DEFAULT 'bill_to_bill';
