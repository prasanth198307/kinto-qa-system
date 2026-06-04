-- Phase 2: barcode, weight-based, HSN on products
ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sold_by text DEFAULT 'unit';
ALTER TABLE products ADD COLUMN IF NOT EXISTS unit_label text DEFAULT 'pcs';
ALTER TABLE products ADD COLUMN IF NOT EXISTS hsn_code text;

-- Phase 4: loyalty tracking on transactions
ALTER TABLE pos_transactions ADD COLUMN IF NOT EXISTS loyalty_points_redeemed integer DEFAULT 0;
ALTER TABLE pos_transactions ADD COLUMN IF NOT EXISTS loyalty_discount numeric(10,2) DEFAULT 0;

-- Index for barcode lookups
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode) WHERE barcode IS NOT NULL;
