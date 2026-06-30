-- Creates pharmacy_purchases, pharmacy_purchase_items, pharmacy_sale_items
-- These were missing from the initial schema; required by server/pharmacy-routes.ts

CREATE TABLE IF NOT EXISTS pharmacy_purchases (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id INTEGER NOT NULL,
  bill_number VARCHAR(50) NOT NULL,
  supplier_name VARCHAR(255),
  supplier_gstin VARCHAR(15),
  purchase_date DATE DEFAULT CURRENT_DATE,
  invoice_number VARCHAR(100),
  invoice_date DATE,
  subtotal NUMERIC(12,2) DEFAULT 0,
  gst_amount NUMERIC(12,2) DEFAULT 0,
  discount NUMERIC(12,2) DEFAULT 0,
  total_amount NUMERIC(12,2) DEFAULT 0,
  payment_mode VARCHAR(50) DEFAULT 'credit',
  payment_status VARCHAR(20) DEFAULT 'pending',
  notes TEXT,
  record_status INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pharmacy_purchase_items (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id INTEGER NOT NULL,
  purchase_id VARCHAR REFERENCES pharmacy_purchases(id),
  drug_id VARCHAR,
  drug_name VARCHAR(255) NOT NULL,
  batch_number VARCHAR(100),
  expiry_date DATE,
  quantity INTEGER DEFAULT 0,
  purchase_price NUMERIC(10,2) DEFAULT 0,
  mrp NUMERIC(10,2) DEFAULT 0,
  gst_pct NUMERIC(5,2) DEFAULT 12,
  gst_amount NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(12,2) DEFAULT 0,
  record_status INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pharmacy_sale_items (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id INTEGER NOT NULL,
  sale_id VARCHAR REFERENCES pharmacy_sales(id),
  drug_id VARCHAR,
  drug_name VARCHAR(255) NOT NULL,
  batch_number VARCHAR(100),
  expiry_date DATE,
  quantity INTEGER DEFAULT 1,
  unit_price NUMERIC(10,2) DEFAULT 0,
  mrp NUMERIC(10,2) DEFAULT 0,
  discount NUMERIC(10,2) DEFAULT 0,
  gst_pct NUMERIC(5,2) DEFAULT 12,
  gst_amount NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(12,2) DEFAULT 0,
  is_schedule_h INTEGER DEFAULT 0,
  record_status INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW()
);
