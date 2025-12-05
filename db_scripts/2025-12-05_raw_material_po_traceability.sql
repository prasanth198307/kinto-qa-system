-- Add PO traceability columns to raw_materials table
-- This links received raw materials to their source Purchase Order line items

-- Add purchase_order_id column (references purchase_orders.id)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'raw_materials' AND column_name = 'purchase_order_id'
    ) THEN
        ALTER TABLE raw_materials ADD COLUMN purchase_order_id VARCHAR;
    END IF;
END $$;

-- Add purchase_order_item_id column (references purchase_order_items.id)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'raw_materials' AND column_name = 'purchase_order_item_id'
    ) THEN
        ALTER TABLE raw_materials ADD COLUMN purchase_order_item_id VARCHAR;
    END IF;
END $$;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_raw_materials_po_id ON raw_materials(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_raw_materials_po_item_id ON raw_materials(purchase_order_item_id);

-- Verification
SELECT 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_name = 'raw_materials' 
AND column_name IN ('purchase_order_id', 'purchase_order_item_id');
