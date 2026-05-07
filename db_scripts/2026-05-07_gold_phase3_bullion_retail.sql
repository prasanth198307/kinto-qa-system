-- ============================================================
-- Gold ERP Phase 3: Bullion Trade (full) + Retail Operations
-- Priority: HIGH
-- ============================================================

-- ── BULLION TRADE ─────────────────────────────────────────

-- 1. Extend jw_bullion_transactions with rate-cut and full fields
ALTER TABLE jw_bullion_transactions
  ADD COLUMN IF NOT EXISTS party_type        VARCHAR(20) DEFAULT 'vendor',
  ADD COLUMN IF NOT EXISTS form_type         VARCHAR(30) DEFAULT 'bar',
  ADD COLUMN IF NOT EXISTS fineness          VARCHAR(20),
  ADD COLUMN IF NOT EXISTS weight_unit       VARCHAR(10) DEFAULT 'gm',
  ADD COLUMN IF NOT EXISTS rate_cut_1        NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rate_cut_2_pct    NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rate_cut_3        NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_rate          NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS gst_pct           NUMERIC(5,2) DEFAULT 3,
  ADD COLUMN IF NOT EXISTS gst_amount        NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_amount      NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS eway_bill_no      VARCHAR(20),
  ADD COLUMN IF NOT EXISTS assay_cert_url    TEXT,
  ADD COLUMN IF NOT EXISTS payment_mode      VARCHAR(30),
  ADD COLUMN IF NOT EXISTS payment_done      INTEGER DEFAULT 0;

-- 2. Bullion Bookings — formal booking & inward process
CREATE TABLE IF NOT EXISTS jw_bullion_bookings (
  id                SERIAL PRIMARY KEY,
  tenant_id         INTEGER NOT NULL,
  booking_no        VARCHAR(40),
  booking_date      DATE DEFAULT CURRENT_DATE,
  party_type        VARCHAR(20) DEFAULT 'supplier',
  party_name        VARCHAR(100) NOT NULL,
  metal_type        VARCHAR(20) DEFAULT 'gold',
  form_type         VARCHAR(30) DEFAULT 'bar',
  fineness          VARCHAR(20),
  weight_unit       VARCHAR(10) DEFAULT 'gm',
  quantity          INTEGER DEFAULT 1,
  weight_gm         NUMERIC(12,3) NOT NULL DEFAULT 0,
  rate_per_gram     NUMERIC(12,2),
  exchange_rate     NUMERIC(12,4) DEFAULT 1,
  amount            NUMERIC(14,2),
  delivery_type     VARCHAR(20) DEFAULT 'physical',
  expected_delivery DATE,
  actual_delivery   DATE,
  received_weight_gm NUMERIC(12,3),
  weight_discrepancy NUMERIC(12,3) DEFAULT 0,
  assay_cert_no     VARCHAR(60),
  assay_cert_url    TEXT,
  payment_terms     VARCHAR(30) DEFAULT 'advance',
  gst_amount        NUMERIC(12,2) DEFAULT 0,
  status            VARCHAR(20) DEFAULT 'booked',
  record_status     INTEGER DEFAULT 1,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_jw_bullion_booking_tenant ON jw_bullion_bookings(tenant_id);

-- 3. Vault Physical Audit
CREATE TABLE IF NOT EXISTS jw_vault_audits (
  id              SERIAL PRIMARY KEY,
  tenant_id       INTEGER NOT NULL,
  audit_no        VARCHAR(40),
  audit_date      DATE DEFAULT CURRENT_DATE,
  location        VARCHAR(60) DEFAULT 'main_vault',
  auditor_1       VARCHAR(100),
  auditor_2       VARCHAR(100),
  manager_name    VARCHAR(100),
  total_system_gm NUMERIC(12,3) DEFAULT 0,
  total_physical_gm NUMERIC(12,3) DEFAULT 0,
  discrepancy_gm  NUMERIC(12,3) DEFAULT 0,
  discrepancy_val NUMERIC(14,2) DEFAULT 0,
  seal_intact     INTEGER DEFAULT 1,
  tamper_evidence TEXT,
  photos          JSONB DEFAULT '[]',
  status          VARCHAR(20) DEFAULT 'in_progress',
  signed_off      INTEGER DEFAULT 0,
  next_audit_date DATE,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_jw_vault_audit_tenant ON jw_vault_audits(tenant_id);

-- 4. Vault Audit Items — per-bar/item verification
CREATE TABLE IF NOT EXISTS jw_vault_audit_items (
  id               SERIAL PRIMARY KEY,
  audit_id         INTEGER NOT NULL REFERENCES jw_vault_audits(id) ON DELETE CASCADE,
  tenant_id        INTEGER NOT NULL,
  serial_bar_no    VARCHAR(60),
  metal_type       VARCHAR(20),
  fineness         VARCHAR(20),
  system_weight_gm NUMERIC(12,3),
  physical_weight_gm NUMERIC(12,3),
  variance_gm      NUMERIC(12,3) GENERATED ALWAYS AS (
                     COALESCE(physical_weight_gm,0) - COALESCE(system_weight_gm,0)
                   ) STORED,
  cert_no          VARCHAR(60),
  verified         INTEGER DEFAULT 0,
  notes            TEXT
);
CREATE INDEX IF NOT EXISTS idx_jw_vault_item_audit ON jw_vault_audit_items(audit_id);

-- ── RETAIL OPERATIONS ─────────────────────────────────────

-- 5. Customer Approval Management — items given on approval
CREATE TABLE IF NOT EXISTS jw_customer_approvals (
  id                SERIAL PRIMARY KEY,
  tenant_id         INTEGER NOT NULL,
  approval_no       VARCHAR(40),
  customer_name     VARCHAR(100) NOT NULL,
  customer_phone    VARCHAR(20),
  issue_date        DATE DEFAULT CURRENT_DATE,
  expected_return   DATE,
  total_value       NUMERIC(14,2) DEFAULT 0,
  deposit_collected INTEGER DEFAULT 0,
  deposit_amount    NUMERIC(12,2) DEFAULT 0,
  items_returned    INTEGER DEFAULT 0,
  return_date       DATE,
  converted_to_sale INTEGER DEFAULT 0,
  invoice_id        INTEGER,
  overdue_flag      INTEGER DEFAULT 0,
  status            VARCHAR(20) DEFAULT 'open',
  counter_staff     VARCHAR(100),
  notes             TEXT,
  record_status     INTEGER DEFAULT 1,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_jw_cust_approval_tenant ON jw_customer_approvals(tenant_id);

-- 6. Approval Items — individual items in each approval
CREATE TABLE IF NOT EXISTS jw_customer_approval_items (
  id           SERIAL PRIMARY KEY,
  approval_id  INTEGER NOT NULL REFERENCES jw_customer_approvals(id) ON DELETE CASCADE,
  tenant_id    INTEGER NOT NULL,
  item_id      INTEGER REFERENCES jw_items(id),
  tag_no       VARCHAR(60),
  design_code  VARCHAR(40),
  description  VARCHAR(150),
  metal_type   VARCHAR(20),
  weight_gm    NUMERIC(10,3),
  value        NUMERIC(12,2),
  returned     INTEGER DEFAULT 0,
  return_condition VARCHAR(20),
  purchased    INTEGER DEFAULT 0
);

-- 7. Customer Buy-back Management — old gold purchase
CREATE TABLE IF NOT EXISTS jw_buyback_transactions (
  id                SERIAL PRIMARY KEY,
  tenant_id         INTEGER NOT NULL,
  buyback_no        VARCHAR(40),
  buyback_date      DATE DEFAULT CURRENT_DATE,
  customer_name     VARCHAR(100) NOT NULL,
  customer_phone    VARCHAR(20),
  item_description  TEXT,
  metal_type        VARCHAR(20) DEFAULT 'gold',
  purity_tested_pct NUMERIC(5,2),
  gross_weight_gm   NUMERIC(10,3) NOT NULL DEFAULT 0,
  stone_weight_gm   NUMERIC(10,3) DEFAULT 0,
  net_weight_gm     NUMERIC(10,3) DEFAULT 0,
  gold_rate_today   NUMERIC(12,2),
  buyback_rate_pct  NUMERIC(5,2) DEFAULT 95,
  buyback_value     NUMERIC(12,2) DEFAULT 0,
  deductions        NUMERIC(12,2) DEFAULT 0,
  net_offered       NUMERIC(12,2) DEFAULT 0,
  customer_accepted INTEGER DEFAULT 0,
  payment_mode      VARCHAR(30),
  linked_invoice_id INTEGER,
  stock_updated     INTEGER DEFAULT 0,
  refinery_flag     INTEGER DEFAULT 0,
  original_invoice_ref VARCHAR(40),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_jw_buyback_tenant ON jw_buyback_transactions(tenant_id);

-- 8. Physical Inventory Audits — retail stock count
CREATE TABLE IF NOT EXISTS jw_physical_audits (
  id                SERIAL PRIMARY KEY,
  tenant_id         INTEGER NOT NULL,
  audit_no          VARCHAR(40),
  audit_date        DATE DEFAULT CURRENT_DATE,
  branch            VARCHAR(60),
  audit_type        VARCHAR(20) DEFAULT 'full',
  auditor_name      VARCHAR(100),
  total_system_pieces INTEGER DEFAULT 0,
  total_physical_pieces INTEGER DEFAULT 0,
  total_system_gm   NUMERIC(12,3) DEFAULT 0,
  total_physical_gm NUMERIC(12,3) DEFAULT 0,
  discrepancy_gm    NUMERIC(12,3) DEFAULT 0,
  discrepancy_val   NUMERIC(14,2) DEFAULT 0,
  shrinkage_pct     NUMERIC(5,3) DEFAULT 0,
  approved_by       VARCHAR(100),
  action_taken      TEXT,
  next_audit_date   DATE,
  status            VARCHAR(20) DEFAULT 'in_progress',
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_jw_phys_audit_tenant ON jw_physical_audits(tenant_id);

-- 9. Physical Audit Items — per-item physical count
CREATE TABLE IF NOT EXISTS jw_physical_audit_items (
  id               SERIAL PRIMARY KEY,
  audit_id         INTEGER NOT NULL REFERENCES jw_physical_audits(id) ON DELETE CASCADE,
  tenant_id        INTEGER NOT NULL,
  tag_no           VARCHAR(60),
  design_code      VARCHAR(40),
  description      VARCHAR(150),
  metal_type       VARCHAR(20),
  system_weight_gm NUMERIC(10,3),
  physical_weight_gm NUMERIC(10,3),
  variance_gm      NUMERIC(10,3) GENERATED ALWAYS AS (
                     COALESCE(physical_weight_gm,0) - COALESCE(system_weight_gm,0)
                   ) STORED,
  physically_found INTEGER DEFAULT 0,
  condition        VARCHAR(20) DEFAULT 'good',
  discrepancy_type VARCHAR(20),
  notes            TEXT
);
CREATE INDEX IF NOT EXISTS idx_jw_phys_audit_item ON jw_physical_audit_items(audit_id);

-- 10. Loyalty Programs — programme setup
CREATE TABLE IF NOT EXISTS jw_loyalty_programs (
  id                SERIAL PRIMARY KEY,
  tenant_id         INTEGER NOT NULL,
  program_name      VARCHAR(100) NOT NULL,
  silver_threshold  NUMERIC(12,2) DEFAULT 50000,
  gold_threshold    NUMERIC(12,2) DEFAULT 200000,
  platinum_threshold NUMERIC(12,2) DEFAULT 500000,
  points_per_rupee  NUMERIC(8,4) DEFAULT 0.01,
  points_on         VARCHAR(20) DEFAULT 'making_charges',
  redemption_value  NUMERIC(8,4) DEFAULT 0.5,
  points_expiry_months INTEGER DEFAULT 12,
  is_active         INTEGER DEFAULT 1,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Loyalty Members — customer loyalty enrollment
CREATE TABLE IF NOT EXISTS jw_loyalty_members (
  id              SERIAL PRIMARY KEY,
  tenant_id       INTEGER NOT NULL,
  program_id      INTEGER REFERENCES jw_loyalty_programs(id),
  member_name     VARCHAR(100) NOT NULL,
  phone           VARCHAR(20),
  email           VARCHAR(100),
  tier            VARCHAR(20) DEFAULT 'silver',
  total_spent     NUMERIC(14,2) DEFAULT 0,
  points_balance  NUMERIC(12,2) DEFAULT 0,
  points_earned   NUMERIC(12,2) DEFAULT 0,
  points_redeemed NUMERIC(12,2) DEFAULT 0,
  birthday        DATE,
  anniversary     DATE,
  enrolled_date   DATE DEFAULT CURRENT_DATE,
  status          VARCHAR(20) DEFAULT 'active',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_jw_loyalty_member_tenant ON jw_loyalty_members(tenant_id);

-- 12. Loyalty Transactions — points earn / redeem log
CREATE TABLE IF NOT EXISTS jw_loyalty_transactions (
  id           SERIAL PRIMARY KEY,
  tenant_id    INTEGER NOT NULL,
  member_id    INTEGER NOT NULL REFERENCES jw_loyalty_members(id),
  txn_type     VARCHAR(20) NOT NULL,  -- earn / redeem / expire / bonus
  points       NUMERIC(12,2) NOT NULL DEFAULT 0,
  reference_no VARCHAR(40),
  invoice_id   INTEGER,
  notes        TEXT,
  expires_on   DATE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_jw_loyalty_txn_tenant ON jw_loyalty_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_jw_loyalty_txn_member ON jw_loyalty_transactions(member_id);

-- 13. Jewellery Promotions
CREATE TABLE IF NOT EXISTS jw_promotions (
  id                SERIAL PRIMARY KEY,
  tenant_id         INTEGER NOT NULL,
  promo_name        VARCHAR(100) NOT NULL,
  promo_type        VARCHAR(30) NOT NULL,  -- making_waiver / flat_discount / gift / double_points
  applicable_categories TEXT DEFAULT 'all',
  min_purchase_value NUMERIC(12,2),
  min_weight_gm     NUMERIC(10,3),
  discount_value    NUMERIC(10,2) DEFAULT 0,
  discount_pct      NUMERIC(5,2) DEFAULT 0,
  valid_from        DATE,
  valid_to          DATE,
  branch            TEXT DEFAULT 'all',
  customer_segment  VARCHAR(30) DEFAULT 'all',
  stackable         INTEGER DEFAULT 0,
  terms             TEXT,
  usage_count       INTEGER DEFAULT 0,
  budget_allocated  NUMERIC(14,2),
  is_active         INTEGER DEFAULT 1,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_jw_promotions_tenant ON jw_promotions(tenant_id);
