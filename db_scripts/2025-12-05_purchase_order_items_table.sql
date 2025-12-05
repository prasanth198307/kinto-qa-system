-- Purchase Order Items Table for Multi-Line PO Support
-- Created: 2025-12-05
-- Purpose: Stores individual line items for purchase orders with raw material references,
--          quantities, pricing, and GST calculations

-- Create table if not exists
CREATE TABLE IF NOT EXISTS purchase_order_items (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    purchase_order_id VARCHAR(255) NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    serial_no INTEGER NOT NULL DEFAULT 1,
    raw_material_id VARCHAR(255) REFERENCES raw_materials(id),
    item_name VARCHAR(255) NOT NULL,
    description TEXT,
    hsn_code VARCHAR(20),
    quantity NUMERIC(10,3) NOT NULL DEFAULT 0,
    uom_id VARCHAR(255) REFERENCES uom(id),
    unit_name VARCHAR(50),
    unit_price INTEGER NOT NULL DEFAULT 0,
    gst_rate INTEGER NOT NULL DEFAULT 18,
    amount INTEGER NOT NULL DEFAULT 0,
    cgst_amount INTEGER DEFAULT 0,
    sgst_amount INTEGER DEFAULT 0,
    igst_amount INTEGER DEFAULT 0,
    total_amount INTEGER NOT NULL DEFAULT 0,
    remarks TEXT,
    record_status INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_po_items_purchase_order_id ON purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_po_items_raw_material_id ON purchase_order_items(raw_material_id);

-- Add comments for documentation
COMMENT ON TABLE purchase_order_items IS 'Line items for purchase orders - supports multi-line POs with individual pricing and GST';
COMMENT ON COLUMN purchase_order_items.unit_price IS 'Unit price stored in paise (divide by 100 for rupees)';
COMMENT ON COLUMN purchase_order_items.amount IS 'Base amount before GST in paise';
COMMENT ON COLUMN purchase_order_items.total_amount IS 'Total amount including GST in paise';
COMMENT ON COLUMN purchase_order_items.gst_rate IS 'GST percentage as integer (e.g., 18 for 18%)';
