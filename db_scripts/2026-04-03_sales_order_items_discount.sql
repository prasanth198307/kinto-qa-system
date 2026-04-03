ALTER TABLE sales_order_items
ADD COLUMN IF NOT EXISTS discount integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_mode varchar(5) NOT NULL DEFAULT '%';
