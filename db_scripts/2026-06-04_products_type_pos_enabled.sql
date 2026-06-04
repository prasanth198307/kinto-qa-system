-- Add pos_enabled flag to products table
-- product_type already existed; pos_enabled is new
ALTER TABLE products ADD COLUMN IF NOT EXISTS pos_enabled BOOLEAN DEFAULT true;

-- Backfill: existing products are retail by default
UPDATE products SET product_type = 'retail' WHERE product_type IS NULL;
