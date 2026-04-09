-- ============================================================
-- PREREQUISITE SCRIPT: Run BEFORE saas-phase3-tenant-isolation
-- Creates tables that were added via db:push and have no script
-- All statements use IF NOT EXISTS — safe to re-run
-- ============================================================

-- 1. whatsapp_conversation_sessions
CREATE TABLE IF NOT EXISTS whatsapp_conversation_sessions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  phone_number VARCHAR(20) NOT NULL,
  assignment_id VARCHAR REFERENCES checklist_assignments(id),
  submission_id VARCHAR REFERENCES checklist_submissions(id),
  template_id VARCHAR REFERENCES checklist_templates(id),
  machine_id VARCHAR REFERENCES machines(id),
  operator_id VARCHAR REFERENCES users(id),
  status VARCHAR(50) DEFAULT 'active',
  current_task_index INTEGER DEFAULT 0,
  total_tasks INTEGER NOT NULL,
  answers JSONB DEFAULT '[]',
  pending_photo_url TEXT,
  ai_session_id VARCHAR(255),
  last_message_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  tenant_id INTEGER DEFAULT 1
);

-- 2. spare_parts_catalog
CREATE TABLE IF NOT EXISTS spare_parts_catalog (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  part_name VARCHAR(255) NOT NULL,
  part_number VARCHAR(100),
  category VARCHAR(100),
  machine_id VARCHAR REFERENCES machines(id),
  unit_price INTEGER,
  reorder_threshold INTEGER,
  current_stock INTEGER DEFAULT 0,
  opening_stock_date TIMESTAMP,
  record_status INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  tenant_id INTEGER DEFAULT 1
);

-- 3. spare_part_entries (depends on spare_parts_catalog)
CREATE TABLE IF NOT EXISTS spare_part_entries (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  spare_part_id VARCHAR NOT NULL REFERENCES spare_parts_catalog(id),
  purchase_date TIMESTAMP NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price INTEGER NOT NULL,
  gst_percent INTEGER DEFAULT 0,
  gst_amount INTEGER DEFAULT 0,
  total_amount INTEGER,
  vendor_id VARCHAR REFERENCES vendors(id),
  remarks TEXT,
  record_status INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  tenant_id INTEGER DEFAULT 1
);

-- 4. spare_part_issuances (depends on spare_parts_catalog)
CREATE TABLE IF NOT EXISTS spare_part_issuances (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  spare_part_id VARCHAR NOT NULL REFERENCES spare_parts_catalog(id),
  machine_id VARCHAR REFERENCES machines(id),
  issued_to VARCHAR REFERENCES users(id),
  issued_by VARCHAR REFERENCES users(id),
  issue_date TIMESTAMP NOT NULL,
  quantity INTEGER NOT NULL,
  purpose TEXT,
  work_order_number VARCHAR(100),
  status VARCHAR(50) DEFAULT 'issued',
  returned_quantity INTEGER DEFAULT 0,
  return_date TIMESTAMP,
  remarks TEXT,
  record_status INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  tenant_id INTEGER DEFAULT 1
);

-- 5. salesperson_mappings
CREATE TABLE IF NOT EXISTS salesperson_mappings (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  excel_name VARCHAR(100) NOT NULL UNIQUE,
  user_id VARCHAR REFERENCES users(id),
  display_name VARCHAR(100),
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  tenant_id INTEGER DEFAULT 1
);

-- 6. bank_statement_imports (depends on chart_of_accounts)
CREATE TABLE IF NOT EXISTS bank_statement_imports (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  file_name VARCHAR(255) NOT NULL,
  bank_account_id VARCHAR REFERENCES chart_of_accounts(id),
  bank_name VARCHAR(100),
  account_number VARCHAR(50),
  start_date VARCHAR(50),
  end_date VARCHAR(50),
  total_rows INTEGER DEFAULT 0,
  duplicate_count INTEGER DEFAULT 0,
  created_by VARCHAR,
  record_status INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  tenant_id INTEGER DEFAULT 1
);

-- 7. budgets
CREATE TABLE IF NOT EXISTS budgets (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  name VARCHAR(255) NOT NULL,
  financial_year VARCHAR(10) NOT NULL,
  period_type VARCHAR(20) NOT NULL DEFAULT 'monthly',
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  notes TEXT,
  created_by VARCHAR REFERENCES users(id),
  record_status INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  tenant_id INTEGER DEFAULT 1
);

-- 8. budget_items (depends on budgets, chart_of_accounts)
CREATE TABLE IF NOT EXISTS budget_items (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  budget_id VARCHAR NOT NULL REFERENCES budgets(id),
  account_id VARCHAR NOT NULL REFERENCES chart_of_accounts(id),
  apr INTEGER NOT NULL DEFAULT 0,
  may INTEGER NOT NULL DEFAULT 0,
  jun INTEGER NOT NULL DEFAULT 0,
  jul INTEGER NOT NULL DEFAULT 0,
  aug INTEGER NOT NULL DEFAULT 0,
  sep INTEGER NOT NULL DEFAULT 0,
  oct INTEGER NOT NULL DEFAULT 0,
  nov INTEGER NOT NULL DEFAULT 0,
  dec INTEGER NOT NULL DEFAULT 0,
  jan INTEGER NOT NULL DEFAULT 0,
  feb INTEGER NOT NULL DEFAULT 0,
  mar INTEGER NOT NULL DEFAULT 0,
  record_status INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  tenant_id INTEGER DEFAULT 1
);

-- 9. sales_returns (depends on invoices, gatepasses)
CREATE TABLE IF NOT EXISTS sales_returns (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  return_number VARCHAR(100) NOT NULL UNIQUE,
  return_date TIMESTAMP NOT NULL,
  invoice_id VARCHAR NOT NULL REFERENCES invoices(id),
  gatepass_id VARCHAR REFERENCES gatepasses(id),
  return_reason VARCHAR(50) NOT NULL,
  return_type VARCHAR(20) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending_receipt',
  received_date TIMESTAMP,
  inspection_date TIMESTAMP,
  inspected_by VARCHAR REFERENCES users(id),
  credit_note_number VARCHAR(100),
  credit_note_date TIMESTAMP,
  total_credit_amount INTEGER NOT NULL DEFAULT 0,
  credit_note_status VARCHAR(30) NOT NULL DEFAULT 'pending_auto',
  total_return_transport_cost INTEGER DEFAULT 0,
  transporter_name VARCHAR(255),
  scrap_approval_status VARCHAR(30) DEFAULT 'not_applicable',
  scrap_approved_by VARCHAR REFERENCES users(id),
  scrap_approval_date TIMESTAMP,
  remarks TEXT,
  record_status INTEGER NOT NULL DEFAULT 1,
  created_by VARCHAR REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  tenant_id INTEGER DEFAULT 1
);

-- 10. sales_return_items (depends on sales_returns, products, invoice_items)
CREATE TABLE IF NOT EXISTS sales_return_items (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  return_id VARCHAR NOT NULL REFERENCES sales_returns(id),
  product_id VARCHAR NOT NULL REFERENCES products(id),
  batch_number VARCHAR(255),
  quantity_returned INTEGER NOT NULL,
  cases_returned INTEGER,
  loose_bottles_returned INTEGER DEFAULT 0,
  bottles_per_case INTEGER,
  verified_quantity INTEGER,
  variance_reason VARCHAR(255),
  invoice_item_id VARCHAR REFERENCES invoice_items(id),
  original_quantity_invoiced INTEGER,
  condition_on_receipt VARCHAR(50),
  disposition VARCHAR(50),
  unit_price INTEGER NOT NULL,
  credit_amount INTEGER NOT NULL,
  unit_cost INTEGER,
  damage_reason VARCHAR(50),
  damage_evidence_url VARCHAR(500),
  return_transport_cost INTEGER DEFAULT 0,
  expiry_date TIMESTAMP,
  is_near_expiry INTEGER DEFAULT 0,
  repack_status VARCHAR(20),
  repack_bottles INTEGER,
  repack_completed_at TIMESTAMP,
  remarks TEXT,
  record_status INTEGER NOT NULL DEFAULT 1,
  tenant_id INTEGER DEFAULT 1
);

-- 11. purchase_returns (depends on purchase_orders, vendors)
CREATE TABLE IF NOT EXISTS purchase_returns (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  return_number VARCHAR(100) NOT NULL UNIQUE,
  return_date TIMESTAMP NOT NULL,
  purchase_order_id VARCHAR REFERENCES purchase_orders(id),
  vendor_id VARCHAR REFERENCES vendors(id),
  vendor_name VARCHAR(255) NOT NULL,
  return_reason VARCHAR(50) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  total_amount INTEGER DEFAULT 0,
  debit_note_id VARCHAR,
  remarks TEXT,
  approved_by VARCHAR REFERENCES users(id),
  approval_date TIMESTAMP,
  record_status INTEGER NOT NULL DEFAULT 1,
  created_by VARCHAR REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  tenant_id INTEGER DEFAULT 1
);

-- 12. purchase_return_items (depends on purchase_returns, raw_materials)
CREATE TABLE IF NOT EXISTS purchase_return_items (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  purchase_return_id VARCHAR NOT NULL REFERENCES purchase_returns(id),
  raw_material_id VARCHAR REFERENCES raw_materials(id),
  item_name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price INTEGER NOT NULL,
  total_amount INTEGER NOT NULL,
  remarks TEXT,
  record_status INTEGER NOT NULL DEFAULT 1,
  tenant_id INTEGER DEFAULT 1
);

-- ============================================================
-- END OF PREREQUISITE SCRIPT
-- After running this, run: 2026-04-08_saas-phase3-tenant-isolation.sql
-- ============================================================
