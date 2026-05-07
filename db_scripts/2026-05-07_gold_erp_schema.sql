-- Gold / Jewellery ERP Schema
-- All tables prefixed jw_

-- Metal Rates
CREATE TABLE IF NOT EXISTS jw_metal_rates (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  metal VARCHAR(20) NOT NULL DEFAULT 'gold',
  purity_name VARCHAR(30) NOT NULL,
  purity_percent NUMERIC(5,2) NOT NULL,
  rate_per_gram NUMERIC(12,2) NOT NULL,
  source VARCHAR(50) DEFAULT 'manual',
  rate_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_jw_metal_rates_tenant ON jw_metal_rates(tenant_id, rate_date DESC);

-- Karigar Master
CREATE TABLE IF NOT EXISTS jw_karigars (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  karigar_code VARCHAR(30),
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  address TEXT,
  aadhar_no VARCHAR(20),
  specialization VARCHAR(100),
  metal_type VARCHAR(20) DEFAULT 'gold',
  balance_grams NUMERIC(10,3) DEFAULT 0,
  advance_balance NUMERIC(12,2) DEFAULT 0,
  wage_per_gram NUMERIC(10,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active',
  record_status INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_jw_karigars_tenant ON jw_karigars(tenant_id);

-- Jewellery Item Master
CREATE TABLE IF NOT EXISTS jw_items (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  item_code VARCHAR(40),
  barcode VARCHAR(60),
  rfid_tag VARCHAR(60),
  name VARCHAR(150) NOT NULL,
  category VARCHAR(60),
  metal_type VARCHAR(20) DEFAULT 'gold',
  purity_name VARCHAR(30),
  purity_percent NUMERIC(5,2),
  gross_weight_gm NUMERIC(10,3) DEFAULT 0,
  stone_weight_gm NUMERIC(10,3) DEFAULT 0,
  net_weight_gm NUMERIC(10,3) DEFAULT 0,
  making_charge_type VARCHAR(20) DEFAULT 'percent',
  making_charge_value NUMERIC(10,2) DEFAULT 0,
  wastage_pct NUMERIC(5,2) DEFAULT 0,
  stone_value NUMERIC(12,2) DEFAULT 0,
  is_hallmarked INTEGER DEFAULT 0,
  huid VARCHAR(20),
  selling_price NUMERIC(12,2),
  stock_qty INTEGER DEFAULT 1,
  image_url TEXT,
  status VARCHAR(20) DEFAULT 'active',
  record_status INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_jw_items_tenant ON jw_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_jw_items_barcode ON jw_items(barcode);

-- Estimates / Quotations
CREATE TABLE IF NOT EXISTS jw_estimates (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  estimate_no VARCHAR(40),
  customer_name VARCHAR(100),
  customer_phone VARCHAR(20),
  metal_type VARCHAR(20) DEFAULT 'gold',
  purity_name VARCHAR(30),
  rate_per_gram NUMERIC(12,2) DEFAULT 0,
  total_metal_value NUMERIC(12,2) DEFAULT 0,
  making_charges NUMERIC(12,2) DEFAULT 0,
  stone_value NUMERIC(12,2) DEFAULT 0,
  wastage_amount NUMERIC(12,2) DEFAULT 0,
  gst_pct NUMERIC(5,2) DEFAULT 3,
  gst_amount NUMERIC(12,2) DEFAULT 0,
  total_amount NUMERIC(12,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'draft',
  valid_until DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS jw_estimate_items (
  id SERIAL PRIMARY KEY,
  estimate_id INTEGER REFERENCES jw_estimates(id) ON DELETE CASCADE,
  item_name VARCHAR(150),
  metal_type VARCHAR(20),
  purity_name VARCHAR(30),
  weight_gm NUMERIC(10,3) DEFAULT 0,
  making_charge_type VARCHAR(20) DEFAULT 'percent',
  making_charge_value NUMERIC(10,2) DEFAULT 0,
  stone_value NUMERIC(12,2) DEFAULT 0,
  sub_total NUMERIC(12,2) DEFAULT 0
);

-- Design Library
CREATE TABLE IF NOT EXISTS jw_design_library (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  design_code VARCHAR(40),
  name VARCHAR(150) NOT NULL,
  category VARCHAR(60),
  metal_type VARCHAR(20) DEFAULT 'gold',
  purity_name VARCHAR(30),
  estimated_weight_gm NUMERIC(10,3),
  cad_file_url TEXT,
  sketch_url TEXT,
  image_url TEXT,
  notes TEXT,
  status VARCHAR(20) DEFAULT 'active',
  record_status INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_jw_design_tenant ON jw_design_library(tenant_id);

-- Production Orders
CREATE TABLE IF NOT EXISTS jw_production_orders (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  order_no VARCHAR(40),
  design_id INTEGER REFERENCES jw_design_library(id),
  karigar_id INTEGER REFERENCES jw_karigars(id),
  qty INTEGER DEFAULT 1,
  metal_type VARCHAR(20) DEFAULT 'gold',
  purity_name VARCHAR(30),
  issued_weight_gm NUMERIC(10,3) DEFAULT 0,
  received_weight_gm NUMERIC(10,3) DEFAULT 0,
  wastage_gm NUMERIC(10,3) DEFAULT 0,
  current_stage VARCHAR(60) DEFAULT 'planning',
  status VARCHAR(20) DEFAULT 'pending',
  target_date DATE,
  notes TEXT,
  record_status INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_jw_prod_orders_tenant ON jw_production_orders(tenant_id);

-- Production Stages
CREATE TABLE IF NOT EXISTS jw_production_stages (
  id SERIAL PRIMARY KEY,
  production_order_id INTEGER REFERENCES jw_production_orders(id) ON DELETE CASCADE,
  stage_name VARCHAR(60) NOT NULL,
  stage_order INTEGER NOT NULL,
  weight_in_gm NUMERIC(10,3),
  weight_out_gm NUMERIC(10,3),
  wastage_gm NUMERIC(10,3) GENERATED ALWAYS AS (COALESCE(weight_in_gm,0) - COALESCE(weight_out_gm,0)) STORED,
  assigned_to VARCHAR(100),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'pending',
  notes TEXT,
  cad_file_url TEXT
);

-- Jobwork Orders
CREATE TABLE IF NOT EXISTS jw_jobwork_orders (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  jobwork_no VARCHAR(40),
  karigar_id INTEGER REFERENCES jw_karigars(id),
  order_date DATE DEFAULT CURRENT_DATE,
  metal_type VARCHAR(20) DEFAULT 'gold',
  purity_name VARCHAR(30),
  description TEXT,
  issued_weight_gm NUMERIC(10,3) DEFAULT 0,
  received_weight_gm NUMERIC(10,3) DEFAULT 0,
  wastage_gm NUMERIC(10,3) DEFAULT 0,
  wage_per_gram NUMERIC(10,2) DEFAULT 0,
  total_wage NUMERIC(12,2) DEFAULT 0,
  advance_paid NUMERIC(12,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending',
  expected_date DATE,
  completed_date DATE,
  notes TEXT,
  record_status INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_jw_jobwork_tenant ON jw_jobwork_orders(tenant_id);

-- Bullion Stock
CREATE TABLE IF NOT EXISTS jw_bullion_stock (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  metal_type VARCHAR(20) NOT NULL,
  purity_name VARCHAR(30) NOT NULL,
  stock_grams NUMERIC(12,3) DEFAULT 0,
  avg_rate NUMERIC(12,2) DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, metal_type, purity_name)
);

-- Bullion Transactions
CREATE TABLE IF NOT EXISTS jw_bullion_transactions (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  txn_no VARCHAR(40),
  txn_type VARCHAR(30) NOT NULL,
  metal_type VARCHAR(20) DEFAULT 'gold',
  purity_name VARCHAR(30),
  weight_gm NUMERIC(12,3) DEFAULT 0,
  rate_per_gram NUMERIC(12,2) DEFAULT 0,
  amount NUMERIC(14,2) DEFAULT 0,
  vendor_id INTEGER,
  party_name VARCHAR(100),
  txn_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  record_status INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_jw_bullion_txn_tenant ON jw_bullion_transactions(tenant_id);

-- Repairs
CREATE TABLE IF NOT EXISTS jw_repairs (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  repair_no VARCHAR(40),
  customer_name VARCHAR(100),
  customer_phone VARCHAR(20),
  item_description TEXT,
  karigar_id INTEGER REFERENCES jw_karigars(id),
  issue_date DATE DEFAULT CURRENT_DATE,
  expected_delivery DATE,
  delivered_date DATE,
  repair_type VARCHAR(60),
  metal_type VARCHAR(20) DEFAULT 'gold',
  metal_weight_gm NUMERIC(10,3) DEFAULT 0,
  old_gold_weight_gm NUMERIC(10,3) DEFAULT 0,
  repair_charges NUMERIC(12,2) DEFAULT 0,
  advance_amount NUMERIC(12,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'received',
  before_image_url TEXT,
  after_image_url TEXT,
  notes TEXT,
  record_status INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_jw_repairs_tenant ON jw_repairs(tenant_id);

-- Hallmarking
CREATE TABLE IF NOT EXISTS jw_hallmarking (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  huid VARCHAR(20) UNIQUE,
  item_id INTEGER REFERENCES jw_items(id),
  item_description VARCHAR(150),
  metal_type VARCHAR(20) DEFAULT 'gold',
  purity_name VARCHAR(30),
  gross_weight_gm NUMERIC(10,3),
  net_weight_gm NUMERIC(10,3),
  assay_centre VARCHAR(100),
  lot_no VARCHAR(40),
  hallmark_date DATE DEFAULT CURRENT_DATE,
  certificate_url TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  record_status INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_jw_hallmarking_tenant ON jw_hallmarking(tenant_id);

-- Chit Schemes
CREATE TABLE IF NOT EXISTS jw_chit_schemes (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  scheme_code VARCHAR(30),
  name VARCHAR(100) NOT NULL,
  duration_months INTEGER DEFAULT 11,
  monthly_amount NUMERIC(12,2) NOT NULL,
  metal_type VARCHAR(20) DEFAULT 'gold',
  bonus_month_free INTEGER DEFAULT 1,
  start_date DATE,
  end_date DATE,
  max_members INTEGER DEFAULT 20,
  status VARCHAR(20) DEFAULT 'active',
  notes TEXT,
  record_status INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_jw_chit_schemes_tenant ON jw_chit_schemes(tenant_id);

CREATE TABLE IF NOT EXISTS jw_chit_members (
  id SERIAL PRIMARY KEY,
  scheme_id INTEGER REFERENCES jw_chit_schemes(id) ON DELETE CASCADE,
  tenant_id INTEGER NOT NULL,
  member_code VARCHAR(30),
  member_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  address TEXT,
  enrollment_date DATE DEFAULT CURRENT_DATE,
  total_paid NUMERIC(12,2) DEFAULT 0,
  installments_paid INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active'
);
CREATE INDEX IF NOT EXISTS idx_jw_chit_members_scheme ON jw_chit_members(scheme_id);

CREATE TABLE IF NOT EXISTS jw_chit_installments (
  id SERIAL PRIMARY KEY,
  member_id INTEGER REFERENCES jw_chit_members(id) ON DELETE CASCADE,
  scheme_id INTEGER,
  tenant_id INTEGER NOT NULL,
  installment_no INTEGER NOT NULL,
  due_date DATE,
  paid_date DATE,
  amount NUMERIC(12,2) NOT NULL,
  payment_mode VARCHAR(30) DEFAULT 'cash',
  receipt_no VARCHAR(40),
  status VARCHAR(20) DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS jw_chit_redemptions (
  id SERIAL PRIMARY KEY,
  member_id INTEGER REFERENCES jw_chit_members(id),
  scheme_id INTEGER,
  tenant_id INTEGER NOT NULL,
  redemption_type VARCHAR(20) DEFAULT 'jewellery',
  jewellery_value NUMERIC(12,2) DEFAULT 0,
  cash_value NUMERIC(12,2) DEFAULT 0,
  redemption_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
