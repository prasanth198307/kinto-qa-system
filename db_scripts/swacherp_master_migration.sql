-- ============================================================
--  SwachERP — MASTER MIGRATION SCRIPT
--  Run this on your Oracle Cloud PostgreSQL instance.
--  ALL statements use IF NOT EXISTS — 100% safe to re-run.
--  Connect with: psql "postgresql://USER:PASS@HOST:PORT/DBNAME"
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- GROUP 1: Apr 3-7 — Feature additions
-- ─────────────────────────────────────────────────────────────

ALTER TABLE customer_advances ADD COLUMN IF NOT EXISTS advance_type varchar(50) NOT NULL DEFAULT 'security_deposit';

ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS discount_mode VARCHAR(5) DEFAULT '%' NOT NULL;
UPDATE invoice_items SET discount_mode = '%' WHERE discount_mode IS NULL;
CREATE INDEX IF NOT EXISTS idx_invoice_items_discount_mode ON invoice_items(discount_mode);

ALTER TABLE sales_order_items
  ADD COLUMN IF NOT EXISTS discount integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_mode varchar(5) NOT NULL DEFAULT '%';

CREATE TABLE IF NOT EXISTS sales_officers (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL UNIQUE,
  mobile_number VARCHAR(15),
  email VARCHAR(255),
  territory VARCHAR(255),
  is_active INTEGER NOT NULL DEFAULT 1,
  record_status INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales_orders' AND column_name='sales_officer_id') THEN
    ALTER TABLE sales_orders ADD COLUMN sales_officer_id VARCHAR REFERENCES sales_officers(id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS monthly_expenses (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(255) NOT NULL,
  category varchar(100),
  amount integer NOT NULL DEFAULT 0,
  expense_month varchar(7) NOT NULL,
  due_date varchar(10),
  status varchar(20) NOT NULL DEFAULT 'pending',
  payment_date varchar(10),
  payment_mode varchar(50),
  reference_number varchar(100),
  carry_to_next_month integer NOT NULL DEFAULT 0,
  notes varchar(500),
  record_status integer NOT NULL DEFAULT 1,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS me_month_idx ON monthly_expenses(expense_month);
CREATE INDEX IF NOT EXISTS me_status_idx ON monthly_expenses(status);
ALTER TABLE monthly_expenses ADD COLUMN IF NOT EXISTS paid_amount integer NOT NULL DEFAULT 0;
ALTER TABLE monthly_expenses ADD COLUMN IF NOT EXISTS expense_type VARCHAR(20) NOT NULL DEFAULT 'fixed';
ALTER TABLE monthly_expenses ADD COLUMN IF NOT EXISTS base_amount INTEGER;

CREATE TABLE IF NOT EXISTS monthly_expense_payments (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id varchar NOT NULL REFERENCES monthly_expenses(id),
  amount integer NOT NULL DEFAULT 0,
  payment_date varchar(10) NOT NULL,
  payment_mode varchar(50),
  paid_by varchar(150),
  payment_source varchar(30) NOT NULL DEFAULT 'company',
  reference_number varchar(100),
  notes varchar(500),
  record_status integer NOT NULL DEFAULT 1,
  created_at timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mep_expense_idx ON monthly_expense_payments(expense_id);

CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255),
  action VARCHAR(50) NOT NULL,
  table_name VARCHAR(100) NOT NULL,
  record_id VARCHAR(255),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

INSERT INTO role_permissions (role_id, screen_key, can_view, can_create, can_edit, can_delete, record_status)
SELECT rp.role_id, 'monthly_expenses', rp.can_view, rp.can_create, rp.can_edit, rp.can_delete, 1
FROM role_permissions rp
WHERE rp.screen_key = 'expenses' AND rp.record_status = 1
  AND NOT EXISTS (SELECT 1 FROM role_permissions r2 WHERE r2.role_id=rp.role_id AND r2.screen_key='monthly_expenses' AND r2.record_status=1);

-- ─────────────────────────────────────────────────────────────
-- GROUP 2: Apr 9 — CRM + ESS permissions
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS crm_leads (
  id               SERIAL PRIMARY KEY,
  tenant_id        INTEGER NOT NULL,
  lead_no          VARCHAR(30),
  name             VARCHAR(150) NOT NULL,
  company          VARCHAR(150),
  phone            VARCHAR(20),
  email            VARCHAR(150),
  source           VARCHAR(50),
  product_interest TEXT,
  assigned_to      VARCHAR(36),
  status           VARCHAR(30) DEFAULT 'new',
  notes            TEXT,
  next_follow_up   DATE,
  record_status    INTEGER DEFAULT 1,
  created_at       TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at       TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='crm_leads' AND column_name='assigned_to' AND data_type='integer') THEN
    ALTER TABLE crm_leads ALTER COLUMN assigned_to TYPE VARCHAR(36) USING assigned_to::TEXT;
  END IF;
END $$;

UPDATE subscription_plans SET modules = modules || '["crm"]'::jsonb
WHERE name IN ('Professional','Enterprise') AND NOT (modules @> '["crm"]'::jsonb);

-- ─────────────────────────────────────────────────────────────
-- GROUP 3: Apr 16-17 — HR / ESS enhancements
-- ─────────────────────────────────────────────────────────────

ALTER TABLE hr_employees ADD COLUMN IF NOT EXISTS ess_username VARCHAR(100);
ALTER TABLE hr_employees ADD COLUMN IF NOT EXISTS ess_password_hash TEXT;
ALTER TABLE hr_employees ADD COLUMN IF NOT EXISTS ess_enabled INTEGER DEFAULT 0;
ALTER TABLE hr_employees ADD COLUMN IF NOT EXISTS ta_amount numeric(10,2) DEFAULT 0;
ALTER TABLE hr_employees ADD COLUMN IF NOT EXISTS da_amount numeric(10,2) DEFAULT 0;
ALTER TABLE hr_employees ADD COLUMN IF NOT EXISTS pf_enabled boolean NOT NULL DEFAULT true;
ALTER TABLE hr_employees ADD COLUMN IF NOT EXISTS esi_enabled boolean NOT NULL DEFAULT true;

ALTER TABLE hr_payslip_settings
  ADD COLUMN IF NOT EXISTS company_name VARCHAR(200),
  ADD COLUMN IF NOT EXISTS company_address TEXT,
  ADD COLUMN IF NOT EXISTS company_city VARCHAR(100),
  ADD COLUMN IF NOT EXISTS company_state VARCHAR(100),
  ADD COLUMN IF NOT EXISTS company_pin VARCHAR(10),
  ADD COLUMN IF NOT EXISTS company_phone VARCHAR(20),
  ADD COLUMN IF NOT EXISTS company_email VARCHAR(100),
  ADD COLUMN IF NOT EXISTS company_gstin VARCHAR(20),
  ADD COLUMN IF NOT EXISTS company_cin VARCHAR(30),
  ADD COLUMN IF NOT EXISTS logo_path TEXT,
  ADD COLUMN IF NOT EXISTS template_style VARCHAR(20) DEFAULT 'classic';

-- ─────────────────────────────────────────────────────────────
-- GROUP 4: Apr 28-29 — Vendor + External API + API Hub
-- ─────────────────────────────────────────────────────────────

ALTER TABLE vendors ADD COLUMN IF NOT EXISTS payment_mode varchar(20) DEFAULT 'bill_to_bill';
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS payment_terms_days integer DEFAULT 30;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS credit_limit numeric(15,2) DEFAULT 0;

CREATE TABLE IF NOT EXISTS external_api_keys (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id integer NOT NULL,
  name varchar(100) NOT NULL,
  key_hash varchar(64) NOT NULL,
  is_active integer DEFAULT 1 NOT NULL,
  created_by varchar,
  created_at timestamp DEFAULT now(),
  last_used_at timestamp,
  scopes text DEFAULT NULL,
  description text DEFAULT NULL
);
CREATE INDEX IF NOT EXISTS ext_api_keys_tenant_idx ON external_api_keys(tenant_id);
CREATE INDEX IF NOT EXISTS ext_api_keys_hash_idx ON external_api_keys(key_hash);

CREATE TABLE IF NOT EXISTS api_call_logs (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  key_id VARCHAR(64),
  api_id VARCHAR(64) NOT NULL,
  method VARCHAR(10) NOT NULL,
  status_code INTEGER NOT NULL,
  duration_ms INTEGER,
  is_try_it INTEGER DEFAULT 0,
  called_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_api_call_logs_tenant ON api_call_logs(tenant_id, called_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_call_logs_key ON api_call_logs(key_id, called_at DESC);

CREATE TABLE IF NOT EXISTS external_api_definitions (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  api_id VARCHAR(80) NOT NULL,
  method VARCHAR(10) NOT NULL DEFAULT 'GET',
  path VARCHAR(255) NOT NULL,
  label VARCHAR(120) NOT NULL,
  description TEXT,
  category VARCHAR(80) DEFAULT 'Custom',
  params JSONB DEFAULT '[]',
  is_active INTEGER DEFAULT 1,
  created_by VARCHAR(64),
  created_at TIMESTAMP DEFAULT NOW(),
  module VARCHAR(80) DEFAULT NULL,
  UNIQUE(tenant_id, api_id)
);
ALTER TABLE external_api_definitions ADD COLUMN IF NOT EXISTS module VARCHAR(80) DEFAULT NULL;

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS cors_origins text[] DEFAULT '{}';

UPDATE subscription_plans SET modules = modules || '["api_hub"]'::jsonb
WHERE name IN ('Professional','Enterprise') AND NOT (modules @> '["api_hub"]'::jsonb);

-- ─────────────────────────────────────────────────────────────
-- GROUP 5: May 1 Phase 1 — Module Labels + Custom Fields
-- ─────────────────────────────────────────────────────────────

CREATE SEQUENCE IF NOT EXISTS public.tenant_module_labels_id_seq AS integer START WITH 1 INCREMENT BY 1;
CREATE TABLE IF NOT EXISTS public.tenant_module_labels (
    id integer NOT NULL DEFAULT nextval('tenant_module_labels_id_seq'),
    tenant_id integer NOT NULL, module_key text NOT NULL, custom_label text NOT NULL,
    PRIMARY KEY (id)
);
CREATE UNIQUE INDEX IF NOT EXISTS tenant_module_labels_tenant_module_uidx ON public.tenant_module_labels (tenant_id, module_key);

CREATE SEQUENCE IF NOT EXISTS public.custom_field_definitions_id_seq AS integer START WITH 1 INCREMENT BY 1;
CREATE TABLE IF NOT EXISTS public.custom_field_definitions (
    id integer NOT NULL DEFAULT nextval('custom_field_definitions_id_seq'),
    tenant_id integer NOT NULL, entity_type text NOT NULL, field_name text NOT NULL,
    field_label text NOT NULL, field_type text DEFAULT 'text', options jsonb,
    is_required boolean DEFAULT false, sort_order integer DEFAULT 0, record_status integer DEFAULT 1,
    PRIMARY KEY (id)
);

CREATE SEQUENCE IF NOT EXISTS public.custom_field_values_id_seq AS integer START WITH 1 INCREMENT BY 1;
CREATE TABLE IF NOT EXISTS public.custom_field_values (
    id integer NOT NULL DEFAULT nextval('custom_field_values_id_seq'),
    tenant_id integer NOT NULL, field_def_id integer NOT NULL, entity_type text NOT NULL,
    entity_id integer NOT NULL, field_value text, created_at timestamptz DEFAULT now(),
    PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS custom_field_values_entity_idx ON public.custom_field_values (tenant_id, entity_type, entity_id);

-- ─────────────────────────────────────────────────────────────
-- GROUP 6: May 1 Phase 2 — Expense Claims + Recurring Invoices
-- ─────────────────────────────────────────────────────────────

CREATE SEQUENCE IF NOT EXISTS public.hr_expense_claims_id_seq AS integer START WITH 1 INCREMENT BY 1;
CREATE TABLE IF NOT EXISTS public.hr_expense_claims (
    id integer NOT NULL DEFAULT nextval('hr_expense_claims_id_seq'),
    tenant_id integer NOT NULL, employee_id integer NOT NULL, title text NOT NULL,
    claim_date date NOT NULL, total_amount numeric(12,2) DEFAULT 0, status text DEFAULT 'pending',
    approved_by integer, approved_at timestamptz, paid_at timestamptz, notes text,
    rejection_reason text, cost_centre_id integer, record_status integer DEFAULT 1,
    created_at timestamptz DEFAULT now(), PRIMARY KEY (id)
);

CREATE SEQUENCE IF NOT EXISTS public.hr_expense_claim_items_id_seq AS integer START WITH 1 INCREMENT BY 1;
CREATE TABLE IF NOT EXISTS public.hr_expense_claim_items (
    id integer NOT NULL DEFAULT nextval('hr_expense_claim_items_id_seq'),
    tenant_id integer NOT NULL, claim_id integer NOT NULL, category text NOT NULL,
    description text, amount numeric(12,2) NOT NULL, expense_date date NOT NULL,
    receipt_path text, record_status integer DEFAULT 1, PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS hr_expense_claim_items_claim_idx ON public.hr_expense_claim_items (claim_id);

CREATE SEQUENCE IF NOT EXISTS public.recurring_invoice_schedules_id_seq AS integer START WITH 1 INCREMENT BY 1;
CREATE TABLE IF NOT EXISTS public.recurring_invoice_schedules (
    id integer NOT NULL DEFAULT nextval('recurring_invoice_schedules_id_seq'),
    tenant_id integer NOT NULL, customer_id varchar, customer_name text,
    frequency text NOT NULL DEFAULT 'monthly', next_due_date date NOT NULL,
    end_date date, template_invoice_id varchar, total_amount numeric(12,2) DEFAULT 0,
    status text DEFAULT 'active', last_generated_at timestamptz,
    description text, record_status integer DEFAULT 1, created_at timestamptz DEFAULT now(),
    PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS recurring_inv_tenant_idx ON public.recurring_invoice_schedules (tenant_id, next_due_date);

-- ─────────────────────────────────────────────────────────────
-- GROUP 7: May 1 Phase 3 — Warehouses, UOM, Serial/Lot
-- ─────────────────────────────────────────────────────────────

CREATE SEQUENCE IF NOT EXISTS public.warehouses_id_seq AS integer START WITH 1 INCREMENT BY 1;
CREATE TABLE IF NOT EXISTS public.warehouses (
    id integer NOT NULL DEFAULT nextval('warehouses_id_seq'),
    tenant_id integer NOT NULL, code text NOT NULL, name text NOT NULL,
    address text, city text, state text, is_default boolean DEFAULT false,
    record_status integer DEFAULT 1, created_at timestamptz DEFAULT now(), PRIMARY KEY (id)
);
CREATE UNIQUE INDEX IF NOT EXISTS warehouses_tenant_code_uidx ON public.warehouses (tenant_id, code);

CREATE SEQUENCE IF NOT EXISTS public.stock_transfers_id_seq AS integer START WITH 1 INCREMENT BY 1;
CREATE TABLE IF NOT EXISTS public.stock_transfers (
    id integer NOT NULL DEFAULT nextval('stock_transfers_id_seq'),
    tenant_id integer NOT NULL, transfer_no text NOT NULL,
    from_warehouse_id integer, to_warehouse_id integer, transfer_date date NOT NULL,
    status text DEFAULT 'draft', notes text, created_by integer,
    approved_by integer, record_status integer DEFAULT 1, created_at timestamptz DEFAULT now(),
    PRIMARY KEY (id)
);

CREATE SEQUENCE IF NOT EXISTS public.stock_transfer_items_id_seq AS integer START WITH 1 INCREMENT BY 1;
CREATE TABLE IF NOT EXISTS public.stock_transfer_items (
    id integer NOT NULL DEFAULT nextval('stock_transfer_items_id_seq'),
    tenant_id integer NOT NULL, transfer_id integer NOT NULL, product_id varchar,
    product_name text, qty_requested numeric(15,3) NOT NULL DEFAULT 0,
    qty_transferred numeric(15,3) DEFAULT 0, uom text, notes text, PRIMARY KEY (id)
);

CREATE SEQUENCE IF NOT EXISTS public.uom_conversions_id_seq AS integer START WITH 1 INCREMENT BY 1;
CREATE TABLE IF NOT EXISTS public.uom_conversions (
    id integer NOT NULL DEFAULT nextval('uom_conversions_id_seq'),
    tenant_id integer NOT NULL, from_uom text NOT NULL, to_uom text NOT NULL,
    conversion_factor numeric(15,6) NOT NULL, product_id varchar,
    PRIMARY KEY (id)
);
CREATE UNIQUE INDEX IF NOT EXISTS uom_conv_tenant_uidx ON public.uom_conversions (tenant_id, from_uom, to_uom, COALESCE(product_id,''));

CREATE SEQUENCE IF NOT EXISTS public.serial_lot_register_id_seq AS integer START WITH 1 INCREMENT BY 1;
CREATE TABLE IF NOT EXISTS public.serial_lot_register (
    id integer NOT NULL DEFAULT nextval('serial_lot_register_id_seq'),
    tenant_id integer NOT NULL, product_id varchar, serial_no text, lot_no text,
    batch_no text, manufactured_date date, expiry_date date,
    status text DEFAULT 'in_stock', warehouse_id integer,
    invoice_id varchar, gatepass_id varchar,
    record_status integer DEFAULT 1, created_at timestamptz DEFAULT now(),
    PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS serial_lot_tenant_idx ON public.serial_lot_register (tenant_id, product_id);

-- ─────────────────────────────────────────────────────────────
-- GROUP 8: May 1 Phase 4 — Projects, BOQ, Milestones, Timesheets
-- ─────────────────────────────────────────────────────────────

CREATE SEQUENCE IF NOT EXISTS public.projects_id_seq AS integer START WITH 1 INCREMENT BY 1;
CREATE TABLE IF NOT EXISTS public.projects (
    id integer NOT NULL DEFAULT nextval('projects_id_seq'),
    tenant_id integer NOT NULL, project_code text, project_name text NOT NULL,
    customer_id varchar, customer_name text, project_type text DEFAULT 'fixed_price',
    status text DEFAULT 'active', start_date date, end_date date,
    contract_value numeric(15,2) DEFAULT 0, description text,
    manager_id integer, record_status integer DEFAULT 1, created_at timestamptz DEFAULT now(),
    PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS projects_tenant_idx ON public.projects (tenant_id);

CREATE SEQUENCE IF NOT EXISTS public.project_boq_id_seq AS integer START WITH 1 INCREMENT BY 1;
CREATE TABLE IF NOT EXISTS public.project_boq (
    id integer NOT NULL DEFAULT nextval('project_boq_id_seq'),
    tenant_id integer NOT NULL, project_id integer NOT NULL,
    item_no text, description text NOT NULL, uom text,
    qty numeric(15,3) DEFAULT 0, unit_rate numeric(15,2) DEFAULT 0,
    amount numeric(15,2) DEFAULT 0, record_status integer DEFAULT 1, PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS project_boq_project_idx ON public.project_boq (project_id);

CREATE SEQUENCE IF NOT EXISTS public.project_milestones_id_seq AS integer START WITH 1 INCREMENT BY 1;
CREATE TABLE IF NOT EXISTS public.project_milestones (
    id integer NOT NULL DEFAULT nextval('project_milestones_id_seq'),
    tenant_id integer NOT NULL, project_id integer NOT NULL,
    milestone_name text NOT NULL, due_date date, completion_date date,
    billing_amount numeric(15,2) DEFAULT 0, status text DEFAULT 'pending',
    invoice_id varchar, notes text, record_status integer DEFAULT 1, PRIMARY KEY (id)
);

CREATE SEQUENCE IF NOT EXISTS public.hr_timesheets_id_seq AS integer START WITH 1 INCREMENT BY 1;
CREATE TABLE IF NOT EXISTS public.hr_timesheets (
    id integer NOT NULL DEFAULT nextval('hr_timesheets_id_seq'),
    tenant_id integer NOT NULL, employee_id integer NOT NULL,
    project_id integer, work_date date NOT NULL,
    hours_worked numeric(5,2) NOT NULL DEFAULT 0,
    task_description text, billable boolean DEFAULT false,
    approved_by integer, status text DEFAULT 'draft',
    record_status integer DEFAULT 1, created_at timestamptz DEFAULT now(), PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS hr_timesheets_emp_idx ON public.hr_timesheets (tenant_id, employee_id, work_date);

-- ─────────────────────────────────────────────────────────────
-- GROUP 9: May 1 Phase 5 — Fixed Assets, Appraisals, Currencies
-- ─────────────────────────────────────────────────────────────

CREATE SEQUENCE IF NOT EXISTS public.fixed_assets_id_seq AS integer START WITH 1 INCREMENT BY 1;
CREATE TABLE IF NOT EXISTS public.fixed_assets (
    id integer NOT NULL DEFAULT nextval('fixed_assets_id_seq'),
    tenant_id integer NOT NULL, asset_code text NOT NULL, asset_name text NOT NULL,
    category text, purchase_date date, purchase_cost numeric(15,2) DEFAULT 0,
    useful_life_years integer DEFAULT 5, depreciation_method text DEFAULT 'straight_line',
    salvage_value numeric(15,2) DEFAULT 0, current_value numeric(15,2) DEFAULT 0,
    location text, status text DEFAULT 'active',
    disposal_date date, disposal_value numeric(15,2),
    record_status integer DEFAULT 1, created_at timestamptz DEFAULT now(), PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS fixed_assets_tenant_idx ON public.fixed_assets (tenant_id);

CREATE SEQUENCE IF NOT EXISTS public.asset_depreciation_id_seq AS integer START WITH 1 INCREMENT BY 1;
CREATE TABLE IF NOT EXISTS public.asset_depreciation (
    id integer NOT NULL DEFAULT nextval('asset_depreciation_id_seq'),
    tenant_id integer NOT NULL, asset_id integer NOT NULL,
    period_year integer NOT NULL, period_month integer NOT NULL,
    depreciation_amount numeric(15,2) NOT NULL, book_value_after numeric(15,2),
    journal_id varchar, posted boolean DEFAULT false, PRIMARY KEY (id)
);
CREATE UNIQUE INDEX IF NOT EXISTS asset_dep_period_uidx ON public.asset_depreciation (asset_id, period_year, period_month);

CREATE SEQUENCE IF NOT EXISTS public.appraisal_cycles_id_seq AS integer START WITH 1 INCREMENT BY 1;
CREATE TABLE IF NOT EXISTS public.appraisal_cycles (
    id integer NOT NULL DEFAULT nextval('appraisal_cycles_id_seq'),
    tenant_id integer NOT NULL, cycle_name text NOT NULL,
    period_start date NOT NULL, period_end date NOT NULL,
    status text DEFAULT 'open', record_status integer DEFAULT 1,
    created_at timestamptz DEFAULT now(), PRIMARY KEY (id)
);

CREATE SEQUENCE IF NOT EXISTS public.appraisals_id_seq AS integer START WITH 1 INCREMENT BY 1;
CREATE TABLE IF NOT EXISTS public.appraisals (
    id integer NOT NULL DEFAULT nextval('appraisals_id_seq'),
    tenant_id integer NOT NULL, cycle_id integer NOT NULL,
    employee_id integer NOT NULL, manager_id integer,
    self_score numeric(4,2), manager_score numeric(4,2), final_score numeric(4,2),
    rating text, status text DEFAULT 'pending',
    self_comments text, manager_comments text,
    record_status integer DEFAULT 1, created_at timestamptz DEFAULT now(), PRIMARY KEY (id)
);

CREATE SEQUENCE IF NOT EXISTS public.appraisal_kras_id_seq AS integer START WITH 1 INCREMENT BY 1;
CREATE TABLE IF NOT EXISTS public.appraisal_kras (
    id integer NOT NULL DEFAULT nextval('appraisal_kras_id_seq'),
    tenant_id integer NOT NULL, appraisal_id integer NOT NULL, kra text NOT NULL,
    weightage numeric(5,2), self_score numeric(3,1), manager_score numeric(3,1),
    PRIMARY KEY (id)
);

CREATE SEQUENCE IF NOT EXISTS public.currencies_id_seq AS integer START WITH 1 INCREMENT BY 1;
CREATE TABLE IF NOT EXISTS public.currencies (
    id integer NOT NULL DEFAULT nextval('currencies_id_seq'),
    tenant_id integer NOT NULL, code text NOT NULL, name text NOT NULL, symbol text,
    is_base boolean DEFAULT false, record_status integer DEFAULT 1, PRIMARY KEY (id)
);
CREATE UNIQUE INDEX IF NOT EXISTS currencies_tenant_code_uidx ON public.currencies (tenant_id, code);

CREATE SEQUENCE IF NOT EXISTS public.exchange_rates_id_seq AS integer START WITH 1 INCREMENT BY 1;
CREATE TABLE IF NOT EXISTS public.exchange_rates (
    id integer NOT NULL DEFAULT nextval('exchange_rates_id_seq'),
    tenant_id integer NOT NULL, currency_id integer NOT NULL,
    rate date NOT NULL, rate_value numeric(15,6) NOT NULL, PRIMARY KEY (id)
);

-- ─────────────────────────────────────────────────────────────
-- GROUP 10: May 1 T001–T008 — Item Master, Proforma, PRs, GRN, Approvals, Cost Centres
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.products
    ADD COLUMN IF NOT EXISTS item_type    text DEFAULT 'goods',
    ADD COLUMN IF NOT EXISTS reorder_point numeric(15,3) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS reorder_qty   numeric(15,3) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tax_type      varchar DEFAULT 'GST';

ALTER TABLE public.invoices
    ADD COLUMN IF NOT EXISTS invoice_type          text DEFAULT 'tax_invoice',
    ADD COLUMN IF NOT EXISTS currency_code         text DEFAULT 'INR',
    ADD COLUMN IF NOT EXISTS exchange_rate         numeric(15,6) DEFAULT 1,
    ADD COLUMN IF NOT EXISTS proforma_ref_id       integer,
    ADD COLUMN IF NOT EXISTS proforma_converted_to integer;

CREATE SEQUENCE IF NOT EXISTS public.purchase_requisitions_id_seq AS integer START WITH 1 INCREMENT BY 1;
CREATE TABLE IF NOT EXISTS public.purchase_requisitions (
    id integer NOT NULL DEFAULT nextval('purchase_requisitions_id_seq'),
    tenant_id integer NOT NULL, req_no text NOT NULL, req_date date NOT NULL,
    requested_by integer, department text, status text DEFAULT 'draft',
    notes text, approved_by integer, approved_at timestamptz,
    converted_to_po_id varchar, record_status integer DEFAULT 1,
    created_at timestamptz DEFAULT now(), PRIMARY KEY (id)
);

CREATE SEQUENCE IF NOT EXISTS public.purchase_requisition_items_id_seq AS integer START WITH 1 INCREMENT BY 1;
CREATE TABLE IF NOT EXISTS public.purchase_requisition_items (
    id integer NOT NULL DEFAULT nextval('purchase_requisition_items_id_seq'),
    tenant_id integer NOT NULL, req_id integer NOT NULL, product_id varchar,
    product_name text NOT NULL, qty numeric(15,3) NOT NULL, uom text,
    required_by date, estimated_price numeric(15,2), notes text, PRIMARY KEY (id)
);

CREATE SEQUENCE IF NOT EXISTS public.goods_receipt_notes_id_seq AS integer START WITH 1 INCREMENT BY 1;
CREATE TABLE IF NOT EXISTS public.goods_receipt_notes (
    id integer NOT NULL DEFAULT nextval('goods_receipt_notes_id_seq'),
    tenant_id integer NOT NULL, grn_no text NOT NULL, grn_date date NOT NULL,
    po_id varchar, vendor_id varchar, vendor_name text,
    status text DEFAULT 'draft', notes text,
    received_by integer, quality_checked_by integer,
    record_status integer DEFAULT 1, created_at timestamptz DEFAULT now(), PRIMARY KEY (id)
);

CREATE SEQUENCE IF NOT EXISTS public.grn_items_id_seq AS integer START WITH 1 INCREMENT BY 1;
CREATE TABLE IF NOT EXISTS public.grn_items (
    id integer NOT NULL DEFAULT nextval('grn_items_id_seq'),
    tenant_id integer NOT NULL, grn_id integer NOT NULL, product_id varchar,
    product_name text NOT NULL, po_qty numeric(15,3) DEFAULT 0,
    received_qty numeric(15,3) NOT NULL, accepted_qty numeric(15,3) DEFAULT 0,
    rejected_qty numeric(15,3) DEFAULT 0, uom text,
    unit_price numeric(15,2) DEFAULT 0, batch_no text,
    expiry_date date, quality_status text DEFAULT 'pending', PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS grn_items_grn_idx ON public.grn_items (grn_id);

ALTER TABLE public.purchase_orders
    ADD COLUMN IF NOT EXISTS retention_pct numeric(5,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS retention_amount numeric(15,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS payment_terms_days integer DEFAULT 30;

CREATE SEQUENCE IF NOT EXISTS public.approval_rules_id_seq AS integer START WITH 1 INCREMENT BY 1;
CREATE TABLE IF NOT EXISTS public.approval_rules (
    id integer NOT NULL DEFAULT nextval('approval_rules_id_seq'),
    tenant_id integer NOT NULL, entity_type text NOT NULL,
    condition_field text, condition_operator text, condition_value numeric(15,2),
    approver_role_id varchar, approver_user_id integer, sequence_order integer DEFAULT 1,
    is_active boolean DEFAULT true, record_status integer DEFAULT 1, PRIMARY KEY (id)
);

CREATE SEQUENCE IF NOT EXISTS public.approval_requests_id_seq AS integer START WITH 1 INCREMENT BY 1;
CREATE TABLE IF NOT EXISTS public.approval_requests (
    id integer NOT NULL DEFAULT nextval('approval_requests_id_seq'),
    tenant_id integer NOT NULL, entity_type text NOT NULL, entity_id integer NOT NULL,
    rule_id integer, status text DEFAULT 'pending',
    requested_by integer, requested_at timestamptz DEFAULT now(),
    decided_by integer, decided_at timestamptz, remarks text, PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS approval_req_entity_idx ON public.approval_requests (tenant_id, entity_type, entity_id);

CREATE SEQUENCE IF NOT EXISTS public.cost_centres_id_seq AS integer START WITH 1 INCREMENT BY 1;
CREATE TABLE IF NOT EXISTS public.cost_centres (
    id integer NOT NULL DEFAULT nextval('cost_centres_id_seq'),
    tenant_id integer NOT NULL, code text NOT NULL, name text NOT NULL,
    parent_id integer, description text, is_active boolean DEFAULT true,
    record_status integer DEFAULT 1, created_at timestamptz DEFAULT now(), PRIMARY KEY (id)
);
CREATE UNIQUE INDEX IF NOT EXISTS cost_centres_tenant_code_uidx ON public.cost_centres (tenant_id, code);

ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS cost_centre_id integer;
ALTER TABLE public.journal_entries ADD COLUMN IF NOT EXISTS cost_centre_id integer;

-- ─────────────────────────────────────────────────────────────
-- GROUP 11: May 1 T001 — Item Variants, Price Lists
-- ─────────────────────────────────────────────────────────────

CREATE SEQUENCE IF NOT EXISTS public.item_variants_id_seq AS integer START WITH 1 INCREMENT BY 1;
CREATE TABLE IF NOT EXISTS public.item_variants (
    id integer NOT NULL DEFAULT nextval('item_variants_id_seq'),
    tenant_id integer NOT NULL, product_id integer NOT NULL, sku text,
    attributes jsonb DEFAULT '{}', price_override numeric(15,2),
    stock_qty numeric(15,3) DEFAULT 0, record_status integer DEFAULT 1,
    created_at timestamptz DEFAULT now(), PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS item_variants_product_idx ON public.item_variants (product_id);

CREATE SEQUENCE IF NOT EXISTS public.price_lists_id_seq AS integer START WITH 1 INCREMENT BY 1;
CREATE TABLE IF NOT EXISTS public.price_lists (
    id integer NOT NULL DEFAULT nextval('price_lists_id_seq'),
    tenant_id integer NOT NULL, name text NOT NULL, currency text DEFAULT 'INR',
    effective_from date, effective_to date, description text,
    record_status integer DEFAULT 1, created_at timestamptz DEFAULT now(), PRIMARY KEY (id)
);

CREATE SEQUENCE IF NOT EXISTS public.price_list_items_id_seq AS integer START WITH 1 INCREMENT BY 1;
CREATE TABLE IF NOT EXISTS public.price_list_items (
    id integer NOT NULL DEFAULT nextval('price_list_items_id_seq'),
    tenant_id integer NOT NULL, price_list_id integer NOT NULL, product_id integer,
    product_name text, unit_price numeric(15,2) NOT NULL,
    discount_pct numeric(5,2) DEFAULT 0, uom text, record_status integer DEFAULT 1,
    PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS price_list_items_list_idx ON public.price_list_items (price_list_id);

-- ─────────────────────────────────────────────────────────────
-- GROUP 12: May 1 T014+T016 — Audit Trail + Entity Attachments (upgraded)
-- ─────────────────────────────────────────────────────────────

CREATE SEQUENCE IF NOT EXISTS public.audit_logs_id_seq AS integer START WITH 1 INCREMENT BY 1;
CREATE TABLE IF NOT EXISTS public.audit_logs_v2 (
    id integer NOT NULL DEFAULT nextval('audit_logs_id_seq'),
    tenant_id integer, user_id varchar(255), action varchar(50) NOT NULL,
    table_name varchar(100) NOT NULL, record_id varchar(255),
    description text, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS audit_logs_tenant_table_idx ON public.audit_logs (tenant_id, table_name);

-- Add tenant_id to existing audit_logs if missing
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS tenant_id integer;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS record_id varchar(255);

CREATE SEQUENCE IF NOT EXISTS public.entity_attachments_id_seq AS integer START WITH 1 INCREMENT BY 1;
CREATE TABLE IF NOT EXISTS public.entity_attachments (
    id integer NOT NULL DEFAULT nextval('entity_attachments_id_seq'),
    tenant_id integer NOT NULL, entity_type text NOT NULL, entity_id integer NOT NULL,
    file_name text NOT NULL, file_path text NOT NULL, file_size integer,
    mime_type text, uploaded_by integer, created_at timestamptz DEFAULT now(),
    PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS entity_attachments_entity_idx ON public.entity_attachments (tenant_id, entity_type, entity_id);

-- ─────────────────────────────────────────────────────────────
-- GROUP 13: May 1 Industry Verticals
-- ─────────────────────────────────────────────────────────────

-- HEALTHCARE
CREATE TABLE IF NOT EXISTS public.patients (
    id text NOT NULL DEFAULT gen_random_uuid(), tenant_id text NOT NULL,
    patient_no text, name text NOT NULL, dob date, gender text,
    blood_group text, phone text, email text, address text,
    emergency_contact text, emergency_phone text,
    created_at timestamptz DEFAULT now(), PRIMARY KEY (id)
);
CREATE TABLE IF NOT EXISTS public.wards (
    id text NOT NULL DEFAULT gen_random_uuid(), tenant_id text NOT NULL,
    ward_name text NOT NULL, ward_type text DEFAULT 'general',
    total_beds integer DEFAULT 0, available_beds integer DEFAULT 0,
    charges_per_day numeric(10,2) DEFAULT 0, PRIMARY KEY (id)
);
CREATE TABLE IF NOT EXISTS public.appointments (
    id text NOT NULL DEFAULT gen_random_uuid(), tenant_id text NOT NULL,
    patient_id text, doctor_id text, appointment_date date NOT NULL,
    appointment_time text, type text DEFAULT 'opd', status text DEFAULT 'scheduled',
    chief_complaint text, diagnosis text, prescription text,
    fees numeric(10,2) DEFAULT 0, created_at timestamptz DEFAULT now(), PRIMARY KEY (id)
);
CREATE TABLE IF NOT EXISTS public.ipd_admissions (
    id text NOT NULL DEFAULT gen_random_uuid(), tenant_id text NOT NULL,
    patient_id text, ward_id text, bed_no text,
    admission_date date NOT NULL, discharge_date date,
    diagnosis text, doctor_id text, daily_charges numeric(10,2) DEFAULT 0,
    total_charges numeric(12,2) DEFAULT 0, status text DEFAULT 'admitted',
    created_at timestamptz DEFAULT now(), PRIMARY KEY (id)
);

-- LOGISTICS
CREATE TABLE IF NOT EXISTS public.logistics_vehicles (
    id text NOT NULL DEFAULT gen_random_uuid(), tenant_id text NOT NULL,
    vehicle_no text NOT NULL, vehicle_type text, make_model text,
    capacity_tons numeric(10,2), owner_name text, driver_name text, driver_phone text,
    rc_expiry date, insurance_expiry date, fitness_expiry date,
    status text DEFAULT 'active', created_at timestamptz DEFAULT now(), PRIMARY KEY (id)
);
CREATE TABLE IF NOT EXISTS public.trips (
    id text NOT NULL DEFAULT gen_random_uuid(), tenant_id text NOT NULL,
    trip_no text NOT NULL, vehicle_id text, driver_name text,
    from_location text NOT NULL, to_location text NOT NULL, trip_date date NOT NULL,
    return_date date, goods_description text, weight_tons numeric(10,2),
    freight_amount numeric(12,2) DEFAULT 0, advance_paid numeric(12,2) DEFAULT 0,
    expenses numeric(12,2) DEFAULT 0, status text DEFAULT 'planned',
    notes text, created_at timestamptz DEFAULT now(), PRIMARY KEY (id)
);
CREATE TABLE IF NOT EXISTS public.consignment_notes (
    id text NOT NULL DEFAULT gen_random_uuid(), tenant_id text NOT NULL,
    lr_no text NOT NULL, trip_id text, consignor_name text NOT NULL,
    consignor_phone text, consignee_name text NOT NULL, consignee_phone text,
    goods_description text, packages integer DEFAULT 1, weight_kg numeric(10,2),
    freight_charges numeric(12,2) DEFAULT 0, loading_charges numeric(12,2) DEFAULT 0,
    delivery_date date, status text DEFAULT 'in_transit',
    created_at timestamptz DEFAULT now(), PRIMARY KEY (id)
);

-- REAL ESTATE
CREATE TABLE IF NOT EXISTS public.re_projects (
    id text NOT NULL DEFAULT gen_random_uuid(), tenant_id text NOT NULL,
    project_name text NOT NULL, project_code text, project_type text DEFAULT 'residential',
    location text, total_units integer DEFAULT 0, total_area_sqft numeric(12,2),
    start_date date, completion_date date, status text DEFAULT 'planning',
    description text, created_at timestamptz DEFAULT now(), PRIMARY KEY (id)
);
CREATE TABLE IF NOT EXISTS public.re_units (
    id text NOT NULL DEFAULT gen_random_uuid(), tenant_id text NOT NULL,
    project_id text, unit_no text NOT NULL, unit_type text DEFAULT 'apartment',
    floor_no integer, area_sqft numeric(10,2), bedrooms integer,
    bathrooms integer, facing text, base_price numeric(15,2) DEFAULT 0,
    status text DEFAULT 'available', created_at timestamptz DEFAULT now(), PRIMARY KEY (id)
);
CREATE TABLE IF NOT EXISTS public.re_bookings (
    id text NOT NULL DEFAULT gen_random_uuid(), tenant_id text NOT NULL,
    unit_id text, customer_name text NOT NULL, customer_phone text,
    customer_email text, booking_date date NOT NULL,
    total_consideration numeric(15,2) DEFAULT 0, booking_amount numeric(15,2) DEFAULT 0,
    status text DEFAULT 'booked', notes text,
    created_at timestamptz DEFAULT now(), PRIMARY KEY (id)
);
CREATE TABLE IF NOT EXISTS public.re_payment_schedules (
    id text NOT NULL DEFAULT gen_random_uuid(), tenant_id text NOT NULL,
    booking_id text, milestone_name text NOT NULL,
    due_date date, amount numeric(15,2) DEFAULT 0,
    paid_date date, paid_amount numeric(15,2) DEFAULT 0,
    status text DEFAULT 'pending', created_at timestamptz DEFAULT now(), PRIMARY KEY (id)
);

-- RETAIL / POS
CREATE TABLE IF NOT EXISTS public.pos_sessions (
    id text NOT NULL DEFAULT gen_random_uuid(), tenant_id text NOT NULL,
    opened_by integer, opened_at timestamptz DEFAULT now(), closed_at timestamptz,
    opening_cash numeric(12,2) DEFAULT 0, closing_cash numeric(12,2),
    total_sales numeric(12,2) DEFAULT 0, status text DEFAULT 'open',
    PRIMARY KEY (id)
);
CREATE TABLE IF NOT EXISTS public.pos_transactions (
    id text NOT NULL DEFAULT gen_random_uuid(), tenant_id text NOT NULL,
    session_id text, transaction_no text NOT NULL,
    transaction_date timestamptz DEFAULT now(), customer_name text,
    subtotal numeric(12,2) DEFAULT 0, discount_amount numeric(12,2) DEFAULT 0,
    tax_amount numeric(12,2) DEFAULT 0, total_amount numeric(12,2) DEFAULT 0,
    payment_method text DEFAULT 'cash', payment_reference text,
    status text DEFAULT 'completed', cashier_id integer,
    created_at timestamptz DEFAULT now(), PRIMARY KEY (id)
);
CREATE TABLE IF NOT EXISTS public.pos_transaction_items (
    id text NOT NULL DEFAULT gen_random_uuid(), tenant_id text NOT NULL,
    transaction_id text NOT NULL, product_id varchar, product_name text NOT NULL,
    qty numeric(10,3) NOT NULL, unit_price numeric(12,2) NOT NULL,
    discount_pct numeric(5,2) DEFAULT 0, tax_pct numeric(5,2) DEFAULT 0,
    line_total numeric(12,2) NOT NULL, PRIMARY KEY (id)
);

-- AGRICULTURE
CREATE TABLE IF NOT EXISTS public.farms (
    id text NOT NULL DEFAULT gen_random_uuid(), tenant_id text NOT NULL,
    farm_name text NOT NULL, location text, area_acres numeric(10,2),
    soil_type text, owner_name text, contact_phone text,
    status text DEFAULT 'active', created_at timestamptz DEFAULT now(), PRIMARY KEY (id)
);
CREATE TABLE IF NOT EXISTS public.crop_cycles (
    id text NOT NULL DEFAULT gen_random_uuid(), tenant_id text NOT NULL,
    farm_id text, crop_name text NOT NULL, variety text, season text,
    sowing_date date, expected_harvest date, actual_harvest date,
    area_acres numeric(10,2), expected_yield_tons numeric(10,2),
    actual_yield_tons numeric(10,2), status text DEFAULT 'ongoing',
    notes text, created_at timestamptz DEFAULT now(), PRIMARY KEY (id)
);
CREATE TABLE IF NOT EXISTS public.commodity_prices (
    id text NOT NULL DEFAULT gen_random_uuid(), tenant_id text NOT NULL,
    commodity_name text NOT NULL, price_date date NOT NULL,
    market_name text, price_per_quintal numeric(10,2),
    created_at timestamptz DEFAULT now(), PRIMARY KEY (id)
);
CREATE TABLE IF NOT EXISTS public.agri_procurement (
    id text NOT NULL DEFAULT gen_random_uuid(), tenant_id text NOT NULL,
    procurement_no text, farmer_name text NOT NULL, farmer_phone text,
    commodity_name text NOT NULL, quantity_tons numeric(10,2),
    rate_per_quintal numeric(10,2), total_amount numeric(12,2) DEFAULT 0,
    procurement_date date NOT NULL, payment_status text DEFAULT 'pending',
    notes text, created_at timestamptz DEFAULT now(), PRIMARY KEY (id)
);

-- ─────────────────────────────────────────────────────────────
-- GROUP 14: May 1 Education (Full Expansion)
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS blood_group text,
  ADD COLUMN IF NOT EXISTS section text,
  ADD COLUMN IF NOT EXISTS roll_number text,
  ADD COLUMN IF NOT EXISTS transport_opted boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS hostel_opted boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS admission_no text,
  ADD COLUMN IF NOT EXISTS academic_year text;

ALTER TABLE public.teachers
  ADD COLUMN IF NOT EXISTS department text,
  ADD COLUMN IF NOT EXISTS designation text;

CREATE TABLE IF NOT EXISTS public.subjects (
    id uuid NOT NULL DEFAULT gen_random_uuid(), tenant_id text NOT NULL,
    subject_code text, subject_name text NOT NULL,
    class_id uuid, subject_type text DEFAULT 'theory',
    pass_marks numeric(5,2), total_marks numeric(5,2),
    created_at timestamptz DEFAULT now(), PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.timetable_periods (
    id uuid NOT NULL DEFAULT gen_random_uuid(), tenant_id text NOT NULL,
    period_no integer NOT NULL, start_time text NOT NULL, end_time text NOT NULL,
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.timetable_entries (
    id uuid NOT NULL DEFAULT gen_random_uuid(), tenant_id text NOT NULL,
    class_id uuid, subject_id uuid, teacher_id uuid, period_id uuid,
    day_of_week text NOT NULL, PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.examinations (
    id uuid NOT NULL DEFAULT gen_random_uuid(), tenant_id text NOT NULL,
    exam_name text NOT NULL, exam_type text DEFAULT 'unit_test',
    class_id uuid, subject_id uuid, exam_date date,
    total_marks numeric(5,2), pass_marks numeric(5,2),
    created_at timestamptz DEFAULT now(), PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.exam_marks (
    id uuid NOT NULL DEFAULT gen_random_uuid(), tenant_id text NOT NULL,
    examination_id uuid NOT NULL, student_id uuid NOT NULL,
    marks_obtained numeric(5,2), grade text, remarks text,
    created_at timestamptz DEFAULT now(), PRIMARY KEY (id)
);
CREATE UNIQUE INDEX IF NOT EXISTS exam_marks_unique_idx ON public.exam_marks (examination_id, student_id);

CREATE TABLE IF NOT EXISTS public.library_books (
    id uuid NOT NULL DEFAULT gen_random_uuid(), tenant_id text NOT NULL,
    isbn text, title text NOT NULL, author text, publisher text,
    category text, total_copies integer DEFAULT 1, available_copies integer DEFAULT 1,
    rack_no text, created_at timestamptz DEFAULT now(), PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.library_transactions (
    id uuid NOT NULL DEFAULT gen_random_uuid(), tenant_id text NOT NULL,
    book_id uuid NOT NULL, student_id uuid, issue_date date NOT NULL,
    due_date date, return_date date, fine_amount numeric(8,2) DEFAULT 0,
    status text DEFAULT 'issued', PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.transport_vehicles (
    id uuid NOT NULL DEFAULT gen_random_uuid(), tenant_id text NOT NULL,
    vehicle_no text NOT NULL, capacity integer DEFAULT 0,
    driver_name text, driver_phone text, route_name text,
    status text DEFAULT 'active', PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.transport_routes (
    id uuid NOT NULL DEFAULT gen_random_uuid(), tenant_id text NOT NULL,
    route_name text NOT NULL, vehicle_id uuid,
    stops jsonb DEFAULT '[]', monthly_fee numeric(10,2) DEFAULT 0,
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.student_transport (
    id uuid NOT NULL DEFAULT gen_random_uuid(), tenant_id text NOT NULL,
    student_id uuid NOT NULL, route_id uuid, pickup_stop text,
    drop_stop text, enrolled_at date DEFAULT CURRENT_DATE, PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.fee_structures (
    id uuid NOT NULL DEFAULT gen_random_uuid(), tenant_id text NOT NULL,
    structure_name text NOT NULL, class_id uuid, academic_year text,
    total_fee numeric(12,2) DEFAULT 0, created_at timestamptz DEFAULT now(),
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.fee_components (
    id uuid NOT NULL DEFAULT gen_random_uuid(), tenant_id text NOT NULL,
    component_name text NOT NULL, description text,
    is_mandatory boolean DEFAULT true, PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.fee_structure_components (
    id uuid NOT NULL DEFAULT gen_random_uuid(), tenant_id text NOT NULL,
    structure_id uuid NOT NULL, component_id uuid NOT NULL,
    amount numeric(12,2) NOT NULL DEFAULT 0, PRIMARY KEY (id)
);
CREATE UNIQUE INDEX IF NOT EXISTS fee_structure_components_uidx ON public.fee_structure_components (structure_id, component_id);

CREATE TABLE IF NOT EXISTS public.fee_payments (
    id uuid NOT NULL DEFAULT gen_random_uuid(), tenant_id text NOT NULL,
    student_id uuid, fee_structure_id uuid, receipt_no text,
    amount numeric(12,2) NOT NULL, paid_date date NOT NULL,
    payment_mode text DEFAULT 'cash', for_month text,
    status text DEFAULT 'paid', notes text,
    created_at timestamptz DEFAULT now(), PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS fee_payments_student_idx ON public.fee_payments (student_id);

CREATE TABLE IF NOT EXISTS public.scholarships (
    id uuid NOT NULL DEFAULT gen_random_uuid(), tenant_id text NOT NULL,
    scholarship_name text NOT NULL, description text,
    amount numeric(12,2) DEFAULT 0, discount_pct numeric(5,2) DEFAULT 0,
    eligibility_criteria text, is_active boolean DEFAULT true, PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.fee_discounts (
    id uuid NOT NULL DEFAULT gen_random_uuid(), tenant_id text NOT NULL,
    student_id uuid NOT NULL, scholarship_id uuid,
    discount_type text DEFAULT 'fixed', discount_value numeric(10,2) DEFAULT 0,
    applicable_from date, applicable_to date, notes text, PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.announcements (
    id uuid NOT NULL DEFAULT gen_random_uuid(), tenant_id text NOT NULL,
    title text NOT NULL, content text NOT NULL,
    audience text DEFAULT 'all', priority text DEFAULT 'normal',
    publish_date date DEFAULT CURRENT_DATE, expiry_date date,
    created_by integer, created_at timestamptz DEFAULT now(), PRIMARY KEY (id)
);

-- Education schema fixes
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='appointments' AND column_name='doctor_id') THEN
    ALTER TABLE public.appointments ADD COLUMN doctor_id text;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS student_attendance_unique_idx
  ON public.student_attendance (student_id, attendance_date)
  WHERE record_status = 1;

-- ─────────────────────────────────────────────────────────────
-- GROUP 15: May 1 — Plan modules sync + tenant industry
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS industry text DEFAULT 'general';

UPDATE subscription_plans SET modules = modules ||
  '["module_labels","custom_fields","expense_claims","recurring_invoices",
    "warehouses","uom","serial_lot","stock_transfers",
    "projects","timesheets","fixed_assets","appraisals","currencies",
    "purchase_requisitions","grn","approvals","cost_centres",
    "audit_trail","attachments","price_lists","item_variants"]'::jsonb
WHERE name IN ('Professional','Enterprise')
  AND NOT (modules @> '["module_labels"]'::jsonb);

UPDATE subscription_plans SET modules = modules ||
  '["healthcare","education","logistics","real_estate","retail_pos","agriculture"]'::jsonb
WHERE name = 'Enterprise'
  AND NOT (modules @> '["healthcare"]'::jsonb);

-- Seed role_permissions for new modules (idempotent)
INSERT INTO role_permissions (role_id, screen_key, tenant_id, can_view, can_create, can_edit, can_delete, record_status)
SELECT r.id, sk.screen_key, r.tenant_id,
  CASE WHEN lower(r.name) IN ('admin','accountsmanager','manager') THEN 1 ELSE 0 END,
  CASE WHEN lower(r.name) IN ('admin','manager') THEN 1 ELSE 0 END,
  CASE WHEN lower(r.name) IN ('admin','manager') THEN 1 ELSE 0 END,
  CASE WHEN lower(r.name) = 'admin' THEN 1 ELSE 0 END,
  1
FROM roles r
CROSS JOIN (VALUES
  ('expense_claims'),('recurring_invoices'),('warehouses'),('stock_transfers'),
  ('projects'),('timesheets'),('fixed_assets'),('appraisals'),('currencies'),
  ('purchase_requisitions'),('grn'),('approvals'),('cost_centres'),
  ('audit_trail'),('price_lists'),('item_variants'),
  ('healthcare'),('education'),('logistics'),('real_estate'),('retail_pos'),('agriculture')
) AS sk(screen_key)
WHERE r.record_status = 1
ON CONFLICT (role_id, screen_key, tenant_id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- GROUP 16: May 1 — Update plan features/taglines
-- ─────────────────────────────────────────────────────────────

UPDATE subscription_plans SET features = '[
  "5 users included",
  "+₹80/extra user/month (max 20)",
  "Invoicing & GST compliance",
  "Purchase orders & vendors",
  "Basic inventory",
  "Sales orders",
  "Customer management",
  "Expense tracking",
  "Document management",
  "Email support"
]'::jsonb WHERE slug = 'basic';

UPDATE subscription_plans SET features = '[
  "15 users included",
  "+₹100/extra user/month (max 100)",
  "Everything in Basic",
  "Production & BOM management",
  "Multi-warehouse & stock transfers",
  "UOM conversions & serial/lot tracking",
  "Purchase requisitions + GRN",
  "Three-way matching (PO / GRN / Invoice)",
  "Approval workflows (amount-based)",
  "Quality control & returns",
  "Double-entry accounting",
  "Preventive maintenance",
  "Recurring invoices & GSTR-1/3B reports",
  "Cost centres & expense claims",
  "WhatsApp integration",
  "MIS analytics dashboard",
  "Audit trail",
  "API Hub",
  "Priority support"
]'::jsonb WHERE slug = 'professional';

UPDATE subscription_plans SET features = '[
  "20 users included",
  "+₹130/extra user/month (max 200)",
  "Everything in Professional",
  "HR & Payroll (PF, ESI, TDS, Form 16)",
  "Employee Self-Service portal",
  "Performance appraisals",
  "Project management (BOQ, milestones, timesheets)",
  "Fixed assets & depreciation",
  "Multi-currency & exchange rates",
  "Custom fields on any entity",
  "Configurable module labels",
  "Healthcare vertical (OPD/IPD, wards)",
  "Education vertical (students, classes, fees)",
  "Logistics vertical (fleet, trips, LR)",
  "Real Estate vertical (projects, units, bookings)",
  "Retail / POS vertical (billing terminal)",
  "Agriculture vertical (farms, crop cycles)",
  "White-labeling & custom branding",
  "Dedicated account manager",
  "SLA guarantee",
  "Data export & backups"
]'::jsonb WHERE slug = 'enterprise';

-- ─────────────────────────────────────────────────────────────
-- GROUP 17: Gatepass batch fix (May 5)
-- ─────────────────────────────────────────────────────────────
-- NOTE: This is a SERVER CODE change (server/routes.ts line 5177).
-- No SQL needed — deploy the updated code to apply this fix.
-- Change: .filter(fg => fg.availableQuantity > 0)
--    TO:  .filter(fg => fg.quantity > 0)
-- This shows ALL physical batches in gatepass dropdown,
-- not just FIFO-computed available ones.

-- ============================================================
--  END OF MASTER MIGRATION
--  Safe to re-run at any time — all statements are idempotent.
-- ============================================================
