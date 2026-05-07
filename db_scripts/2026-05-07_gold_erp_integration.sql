-- Gold ERP Integration Bridge
-- Adds journal tracking, CRM linkage, approval flags across all key gold tables

-- Gap 1/2/3: Journal entry tracking for idempotency
ALTER TABLE jw_bullion_transactions  ADD COLUMN IF NOT EXISTS journal_entry_id text;
ALTER TABLE jw_settlement            ADD COLUMN IF NOT EXISTS journal_entry_id text;
ALTER TABLE jw_repairs               ADD COLUMN IF NOT EXISTS journal_entry_id text;
ALTER TABLE jw_ghat_entries          ADD COLUMN IF NOT EXISTS journal_entry_id text;

-- Gap 2: Approval request tracking on large transactions
ALTER TABLE jw_bullion_transactions  ADD COLUMN IF NOT EXISTS approval_request_id integer;
ALTER TABLE jw_settlement            ADD COLUMN IF NOT EXISTS approval_request_id integer;

-- Gap 5: CRM link on estimates
ALTER TABLE jw_estimates             ADD COLUMN IF NOT EXISTS crm_lead_id integer;
ALTER TABLE jw_estimates             ADD COLUMN IF NOT EXISTS invoice_id text;

-- Gap 3: Track if karigar settlement wages were posted to payroll expense
ALTER TABLE jw_settlement            ADD COLUMN IF NOT EXISTS expense_posted integer DEFAULT 0;

-- jw_buyback_transactions journal tracking
ALTER TABLE jw_buyback_transactions  ADD COLUMN IF NOT EXISTS journal_entry_id text;

-- Gap 4: Sync gold items to products table (track which products were auto-synced)
ALTER TABLE jw_items                 ADD COLUMN IF NOT EXISTS product_id text;

