-- Schema drift fix: add missing vendor detail columns to purchase_orders
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS vendor_address text;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS vendor_gst varchar(50);
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS vendor_phone varchar(20);
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS vendor_email text;
