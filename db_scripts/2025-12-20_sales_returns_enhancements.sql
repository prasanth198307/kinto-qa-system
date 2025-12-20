-- Sales Returns Enhancements: Scrap Inventory, Transport Costs, Damage Evidence, Approval Workflow
-- Run this on your production database

-- 1. Add new columns to sales_returns header
ALTER TABLE sales_returns ADD COLUMN IF NOT EXISTS total_return_transport_cost INTEGER DEFAULT 0;
ALTER TABLE sales_returns ADD COLUMN IF NOT EXISTS transporter_name VARCHAR(255);
ALTER TABLE sales_returns ADD COLUMN IF NOT EXISTS scrap_approval_status VARCHAR(30) DEFAULT 'not_applicable';
ALTER TABLE sales_returns ADD COLUMN IF NOT EXISTS scrap_approved_by VARCHAR REFERENCES users(id);
ALTER TABLE sales_returns ADD COLUMN IF NOT EXISTS scrap_approval_date TIMESTAMP;

-- 2. Add new columns to sales_return_items
ALTER TABLE sales_return_items ADD COLUMN IF NOT EXISTS invoice_item_id VARCHAR REFERENCES invoice_items(id);
ALTER TABLE sales_return_items ADD COLUMN IF NOT EXISTS original_quantity_invoiced INTEGER;
ALTER TABLE sales_return_items ADD COLUMN IF NOT EXISTS unit_cost INTEGER;
ALTER TABLE sales_return_items ADD COLUMN IF NOT EXISTS damage_reason VARCHAR(50);
ALTER TABLE sales_return_items ADD COLUMN IF NOT EXISTS damage_evidence_url VARCHAR(500);
ALTER TABLE sales_return_items ADD COLUMN IF NOT EXISTS return_transport_cost INTEGER DEFAULT 0;
ALTER TABLE sales_return_items ADD COLUMN IF NOT EXISTS expiry_date TIMESTAMP;
ALTER TABLE sales_return_items ADD COLUMN IF NOT EXISTS is_near_expiry INTEGER DEFAULT 0;

-- 3. Create scrap_inventory table for loss tracking
CREATE TABLE IF NOT EXISTS scrap_inventory (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  scrap_number VARCHAR(100) NOT NULL UNIQUE,
  scrap_date TIMESTAMP NOT NULL,
  
  -- Source reference
  sales_return_id VARCHAR REFERENCES sales_returns(id),
  sales_return_item_id VARCHAR REFERENCES sales_return_items(id),
  invoice_id VARCHAR REFERENCES invoices(id),
  
  -- Product details
  product_id VARCHAR REFERENCES products(id) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  batch_number VARCHAR(100),
  quantity INTEGER NOT NULL,
  
  -- Cost tracking (all amounts in paise)
  unit_cost INTEGER NOT NULL,
  selling_price INTEGER NOT NULL,
  total_cost_value INTEGER NOT NULL,
  total_selling_value INTEGER NOT NULL,
  loss_amount INTEGER NOT NULL,
  
  -- Damage details
  damage_reason VARCHAR(50) NOT NULL,
  condition_description TEXT,
  damage_evidence_url VARCHAR(500),
  
  -- Approval workflow
  approval_status VARCHAR(30) DEFAULT 'pending' NOT NULL,
  approved_by VARCHAR REFERENCES users(id),
  approval_date TIMESTAMP,
  approval_remarks TEXT,
  
  -- Processing
  processed_status VARCHAR(30) DEFAULT 'pending' NOT NULL,
  processed_date TIMESTAMP,
  disposal_method VARCHAR(50),
  disposal_value INTEGER DEFAULT 0,
  
  -- GST implications
  gst_reversal INTEGER DEFAULT 0,
  gst_reversal_status VARCHAR(30) DEFAULT 'pending',
  
  remarks TEXT,
  record_status INTEGER DEFAULT 1 NOT NULL,
  created_by VARCHAR REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. Create index for efficient scrap reporting
CREATE INDEX IF NOT EXISTS idx_scrap_inventory_date ON scrap_inventory(scrap_date);
CREATE INDEX IF NOT EXISTS idx_scrap_inventory_product ON scrap_inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_scrap_inventory_approval ON scrap_inventory(approval_status);
CREATE INDEX IF NOT EXISTS idx_scrap_inventory_sales_return ON scrap_inventory(sales_return_id);

-- Verify columns were added
SELECT 'sales_returns columns' as table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'sales_returns' 
AND column_name IN ('total_return_transport_cost', 'transporter_name', 'scrap_approval_status', 'scrap_approved_by', 'scrap_approval_date');

SELECT 'sales_return_items columns' as table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'sales_return_items' 
AND column_name IN ('invoice_item_id', 'original_quantity_invoiced', 'unit_cost', 'damage_reason', 'damage_evidence_url', 'return_transport_cost', 'expiry_date', 'is_near_expiry');

SELECT 'scrap_inventory exists' as status, COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name = 'scrap_inventory';
