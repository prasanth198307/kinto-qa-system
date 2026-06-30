-- Phase 3.1: AP Module
CREATE TABLE IF NOT EXISTS vendor_bills (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  bill_number VARCHAR(50) NOT NULL,
  vendor_id INTEGER,
  vendor_name VARCHAR(200) NOT NULL,
  bill_date DATE NOT NULL,
  due_date DATE NOT NULL,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  notes TEXT,
  purchase_order_id INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vendor_bill_items (
  id SERIAL PRIMARY KEY,
  bill_id INTEGER NOT NULL REFERENCES vendor_bills(id) ON DELETE CASCADE,
  tenant_id INTEGER NOT NULL,
  description TEXT NOT NULL,
  quantity NUMERIC(10,3) DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(5,2) DEFAULT 0,
  tax_amount NUMERIC(12,2) DEFAULT 0,
  line_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  account_code VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS vendor_payment_runs (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  run_number VARCHAR(50) NOT NULL,
  run_date DATE NOT NULL,
  payment_mode VARCHAR(30) DEFAULT 'bank_transfer',
  bank_account VARCHAR(100),
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) DEFAULT 'draft',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vendor_payment_run_items (
  id SERIAL PRIMARY KEY,
  run_id INTEGER NOT NULL REFERENCES vendor_payment_runs(id) ON DELETE CASCADE,
  tenant_id INTEGER NOT NULL,
  bill_id INTEGER NOT NULL REFERENCES vendor_bills(id),
  vendor_name VARCHAR(200),
  bill_amount NUMERIC(12,2),
  paying_amount NUMERIC(12,2) NOT NULL
);

-- Phase 3.3: Period Close
CREATE TABLE IF NOT EXISTS accounting_periods (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  period_name VARCHAR(50) NOT NULL,
  period_type VARCHAR(20) DEFAULT 'monthly',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'open',
  closed_at TIMESTAMP,
  closed_by VARCHAR(100),
  locked_at TIMESTAMP,
  locked_by VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
