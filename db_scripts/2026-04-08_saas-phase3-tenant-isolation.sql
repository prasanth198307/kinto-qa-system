-- ============================================================
-- PHASE 3: TENANT ISOLATION
-- Adds tenant_id column to all core ERP tables so every row
-- is scoped to a specific tenant. All columns default to 1
-- (the seed/demo tenant) for backward compatibility.
-- Run AFTER phase1 (tenants table must exist).
-- ============================================================

-- ── Products & BOM ──────────────────────────────────────────
ALTER TABLE products               ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE product_categories     ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE product_types          ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE product_bom            ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE product_bom_configurations ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;

-- ── Raw Materials ────────────────────────────────────────────
ALTER TABLE raw_materials              ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE raw_material_types         ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE raw_material_transactions  ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE raw_material_issuance      ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE raw_material_issuance_items ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;

-- ── Vendors ──────────────────────────────────────────────────
ALTER TABLE vendors                    ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE vendor_types               ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE vendor_vendor_types        ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE vendor_debit_notes         ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE vendor_debit_note_items    ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE vendor_debit_note_adjustments ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;

-- ── Invoices & Payments ──────────────────────────────────────
ALTER TABLE invoices              ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE invoice_items         ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE invoice_payments      ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE invoice_templates     ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE payment_evidence      ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE terms_conditions      ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;

-- ── Gatepasses ───────────────────────────────────────────────
ALTER TABLE gatepasses            ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE gatepass_items        ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;

-- ── Purchase Orders & Returns ────────────────────────────────
ALTER TABLE purchase_orders       ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE purchase_order_items  ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE purchase_returns      ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE purchase_return_items ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;

-- ── Sales Orders & Returns ───────────────────────────────────
ALTER TABLE sales_orders          ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE sales_order_items     ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE sales_returns         ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE sales_return_items    ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE sales_officers        ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE salesperson_mappings  ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;

-- ── Logistics ────────────────────────────────────────────────
ALTER TABLE uom          ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE transporters ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE vehicles     ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE drivers      ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;

-- ── Machines & Maintenance ───────────────────────────────────
ALTER TABLE machines               ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE machine_types          ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE machine_spares         ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE machine_startup_tasks  ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE maintenance_plans      ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE maintenance_history    ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE pm_executions          ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE pm_execution_tasks     ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE pm_task_list_templates ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE pm_template_tasks      ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE spare_parts_catalog    ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE spare_part_entries     ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE spare_part_issuances   ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE required_spares        ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;

-- ── Checklists & QA ─────────────────────────────────────────
ALTER TABLE checklist_templates   ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE checklist_assignments ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE checklist_submissions ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE submission_tasks      ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE template_tasks        ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE partial_task_answers  ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;

-- ── Production ───────────────────────────────────────────────
ALTER TABLE production_entries              ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE production_reconciliations      ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE production_reconciliation_items ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE finished_goods                  ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE scrap_inventory                 ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;

-- ── Accounting ───────────────────────────────────────────────
ALTER TABLE chart_of_accounts    ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE journal_entries      ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE journal_lines        ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE banks                ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE bank_transactions    ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE bank_statement_imports ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE budgets              ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE budget_items         ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE tds_rates            ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE tds_entries          ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;

-- ── Expenses ─────────────────────────────────────────────────
ALTER TABLE expense_categories  ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE expense_items       ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE expense_vouchers    ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE expense_attachments ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE monthly_expenses    ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE monthly_expense_payments ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;

-- ── Cash Register ────────────────────────────────────────────
ALTER TABLE cash_register_days             ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE cash_register_transactions     ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE cash_register_expense_items    ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;

-- ── Credit / Debit Notes & Advances ─────────────────────────
ALTER TABLE credit_notes                   ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE credit_note_items              ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE manual_credit_note_requests    ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE debit_notes                    ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE debit_note_items               ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE customer_advances              ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE advance_applications           ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;

-- ── Documents & Alerts ───────────────────────────────────────
ALTER TABLE documents           ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE document_categories ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE system_alerts       ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE audit_logs          ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;

-- ── Users & Assignments ──────────────────────────────────────
ALTER TABLE users            ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id);
ALTER TABLE user_assignments ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;

-- ── WhatsApp Sessions ────────────────────────────────────────
ALTER TABLE whatsapp_conversation_sessions ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) DEFAULT 1;

-- ── Per-tenant unique constraints on users ───────────────────
-- Drop old global unique constraints if they exist
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_username_unique;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_unique;

-- Add composite unique constraints scoped per tenant
CREATE UNIQUE INDEX IF NOT EXISTS users_username_tenant_unique ON users (username, tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_tenant_unique    ON users (email, tenant_id);

-- ── Record status on users (for soft-delete) ─────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS record_status INTEGER NOT NULL DEFAULT 1;
