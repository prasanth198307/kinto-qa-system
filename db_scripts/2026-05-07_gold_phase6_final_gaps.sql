-- ============================================================
-- Gold ERP Phase 6: Final Gaps — 9 screens + 6 integrations
-- Covers every remaining table gap found in the coverage audit
-- ============================================================

-- ── WHOLESALE ─────────────────────────────────────────────

-- W2: Jobwork Processing (Wholesale) — customer sends own gold
-- Tracks customer's gold account, separate from internal karigar jobwork
CREATE TABLE IF NOT EXISTS jw_wholesale_jobwork (
  id                    SERIAL PRIMARY KEY,
  tenant_id             INTEGER NOT NULL,
  jobwork_no            VARCHAR(40),
  customer_name         VARCHAR(100) NOT NULL,
  customer_phone        VARCHAR(20),
  customer_id           INTEGER,
  receipt_date          DATE DEFAULT CURRENT_DATE,
  design_id             INTEGER REFERENCES jw_design_library(id),
  design_ref            VARCHAR(60),
  qty_pieces            INTEGER DEFAULT 1,
  customer_gold_recv_gm NUMERIC(10,3) NOT NULL DEFAULT 0,  -- gold sent by customer
  customer_gold_purity  VARCHAR(30),
  fine_gold_recv_gm     NUMERIC(10,3) DEFAULT 0,           -- after purity conversion
  making_charges_type   VARCHAR(20) DEFAULT 'per_gram',    -- per_gram / per_piece
  making_charges        NUMERIC(12,2) DEFAULT 0,
  stone_setting_charges NUMERIC(12,2) DEFAULT 0,
  timeline_days         INTEGER DEFAULT 10,
  karigar_id            INTEGER REFERENCES jw_karigars(id),
  gold_issued_to_karigar_gm NUMERIC(10,3) DEFAULT 0,
  finished_weight_gm    NUMERIC(10,3) DEFAULT 0,
  customer_gold_balance_gm NUMERIC(10,3) DEFAULT 0,        -- outstanding balance
  invoice_type          VARCHAR(20) DEFAULT 'making_only', -- making_only (not gold value)
  customer_approval_req INTEGER DEFAULT 0,
  status                VARCHAR(20) DEFAULT 'received',
  delivery_date         DATE,
  notes                 TEXT,
  record_status         INTEGER DEFAULT 1,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_jw_ws_jobwork_tenant ON jw_wholesale_jobwork(tenant_id);
CREATE INDEX IF NOT EXISTS idx_jw_ws_jobwork_cust   ON jw_wholesale_jobwork(customer_phone);

-- W14: Hallmarking Batches — batch BIS submission (per-item uses jw_hallmarking)
CREATE TABLE IF NOT EXISTS jw_hallmarking_batches (
  id                SERIAL PRIMARY KEY,
  tenant_id         INTEGER NOT NULL,
  batch_no          VARCHAR(40),
  submission_date   DATE DEFAULT CURRENT_DATE,
  centre_name       VARCHAR(100),
  bis_licence_no    VARCHAR(40),
  testing_method    VARCHAR(30) DEFAULT 'xrf',  -- xrf / acid / cupellation
  items_submitted   INTEGER DEFAULT 0,
  items_passed      INTEGER DEFAULT 0,
  items_rejected    INTEGER DEFAULT 0,
  date_sent         DATE,
  date_received     DATE,
  total_cost        NUMERIC(12,2) DEFAULT 0,
  certificate_url   TEXT,
  status            VARCHAR(20) DEFAULT 'submitted',
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_jw_hm_batch_tenant ON jw_hallmarking_batches(tenant_id);

-- Link items to a hallmarking batch
ALTER TABLE jw_hallmarking
  ADD COLUMN IF NOT EXISTS batch_id      INTEGER REFERENCES jw_hallmarking_batches(id),
  ADD COLUMN IF NOT EXISTS tested_purity NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS test_method   VARCHAR(30),
  ADD COLUMN IF NOT EXISTS rejected_reason TEXT;

-- ── RETAIL ────────────────────────────────────────────────

-- R7: Refining Process — customer old gold / workshop wastage → refinery
CREATE TABLE IF NOT EXISTS jw_refining_entries (
  id                    SERIAL PRIMARY KEY,
  tenant_id             INTEGER NOT NULL,
  refinery_no           VARCHAR(40),
  source_type           VARCHAR(30) NOT NULL,  -- customer_gold / workshop_wastage / returned_goods
  customer_name         VARCHAR(100),
  customer_phone        VARCHAR(20),
  item_description      TEXT,
  gross_recv_gm         NUMERIC(10,3) NOT NULL DEFAULT 0,
  assay_purity_pct      NUMERIC(5,2),
  net_fine_gold_gm      NUMERIC(10,3) DEFAULT 0,
  refinery_name         VARCHAR(100),
  date_sent             DATE,
  date_received         DATE,
  refined_gold_recv_gm  NUMERIC(10,3) DEFAULT 0,
  recovery_pct          NUMERIC(5,2) DEFAULT 0,
  loss_gm               NUMERIC(10,3) DEFAULT 0,
  loss_within_limit     INTEGER DEFAULT 1,
  credited_to           VARCHAR(30) DEFAULT 'customer',  -- customer / own_stock
  payment_to_customer   NUMERIC(12,2) DEFAULT 0,
  payment_from_customer NUMERIC(12,2) DEFAULT 0,
  certificate_url       TEXT,
  status                VARCHAR(20) DEFAULT 'sent',
  created_at            TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_jw_refining_tenant ON jw_refining_entries(tenant_id);

-- R12: Counter Bookings — quick booking screen (repair/order at retail counter)
CREATE TABLE IF NOT EXISTS jw_counter_bookings (
  id              SERIAL PRIMARY KEY,
  tenant_id       INTEGER NOT NULL,
  booking_no      VARCHAR(40),
  booking_date    DATE DEFAULT CURRENT_DATE,
  customer_name   VARCHAR(100) NOT NULL,
  customer_phone  VARCHAR(20) NOT NULL,
  booking_type    VARCHAR(30) NOT NULL,  -- new_order / repair / remodel / resize / stone_setting
  urgency         VARCHAR(20) DEFAULT 'normal',  -- normal / urgent / vip
  description     TEXT,
  design_ref      VARCHAR(60),
  voice_note_url  TEXT,
  attachment_url  TEXT,
  advance_collected NUMERIC(12,2) DEFAULT 0,
  receipt_issued  INTEGER DEFAULT 0,
  assigned_to     VARCHAR(100),
  expected_ready  DATE,
  counter_staff   VARCHAR(100),
  status          VARCHAR(20) DEFAULT 'booked',
  reminder_sent   INTEGER DEFAULT 0,
  linked_repair_id    INTEGER REFERENCES jw_repairs(id),
  linked_order_id     INTEGER REFERENCES jw_oms_orders(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_jw_counter_booking_tenant ON jw_counter_bookings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_jw_counter_booking_phone  ON jw_counter_bookings(customer_phone);

-- R13: POS Old Gold Exchange — jewellery POS-specific old gold table
CREATE TABLE IF NOT EXISTS jw_pos_old_gold (
  id               SERIAL PRIMARY KEY,
  tenant_id        INTEGER NOT NULL,
  pos_session_id   INTEGER,
  transaction_date DATE DEFAULT CURRENT_DATE,
  customer_name    VARCHAR(100),
  customer_phone   VARCHAR(20),
  item_description TEXT,
  metal_type       VARCHAR(20) DEFAULT 'gold',
  purity_tested_pct NUMERIC(5,2),
  gross_weight_gm  NUMERIC(10,3) NOT NULL DEFAULT 0,
  stone_weight_gm  NUMERIC(10,3) DEFAULT 0,
  net_weight_gm    NUMERIC(10,3) DEFAULT 0,
  today_rate       NUMERIC(12,2),
  buyback_rate_pct NUMERIC(5,2) DEFAULT 95,
  credit_value     NUMERIC(12,2) DEFAULT 0,
  applied_to_bill  INTEGER DEFAULT 0,
  linked_invoice_id INTEGER,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_jw_pos_old_gold_tenant ON jw_pos_old_gold(tenant_id);

-- ── E-COMMERCE ────────────────────────────────────────────

-- EX3: Gold Rate History for e-commerce price widget
CREATE TABLE IF NOT EXISTS jw_ecom_rate_history (
  id           SERIAL PRIMARY KEY,
  tenant_id    INTEGER NOT NULL,
  metal_type   VARCHAR(20) NOT NULL DEFAULT 'gold',
  purity_name  VARCHAR(30),
  rate_per_gram NUMERIC(12,2) NOT NULL,
  source       VARCHAR(20) DEFAULT 'mcx',
  recorded_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_jw_ecom_rate_tenant ON jw_ecom_rate_history(tenant_id, recorded_at DESC);

-- EX5: E-Commerce Customer Profiles — registration + login
CREATE TABLE IF NOT EXISTS jw_ecom_customers (
  id               SERIAL PRIMARY KEY,
  tenant_id        INTEGER NOT NULL,
  customer_name    VARCHAR(100) NOT NULL,
  phone            VARCHAR(20) NOT NULL,
  email            VARCHAR(100),
  password_hash    TEXT,
  otp_hash         TEXT,
  otp_expires_at   TIMESTAMPTZ,
  city             VARCHAR(60),
  preferred_metal  VARCHAR(20),
  preferred_purity VARCHAR(30),
  newsletter_opt   INTEGER DEFAULT 0,
  birthday         DATE,
  anniversary      DATE,
  loyalty_member_id INTEGER REFERENCES jw_loyalty_members(id),
  total_orders     INTEGER DEFAULT 0,
  total_spent      NUMERIC(14,2) DEFAULT 0,
  is_active        INTEGER DEFAULT 1,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, phone)
);
CREATE INDEX IF NOT EXISTS idx_jw_ecom_cust_tenant ON jw_ecom_customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_jw_ecom_cust_phone  ON jw_ecom_customers(tenant_id, phone);

-- Link ecom_orders and ecom_carts to customer
ALTER TABLE jw_ecom_orders
  ADD COLUMN IF NOT EXISTS customer_id INTEGER REFERENCES jw_ecom_customers(id);
ALTER TABLE jw_ecom_carts
  ADD COLUMN IF NOT EXISTS customer_id INTEGER REFERENCES jw_ecom_customers(id);

-- ── RFID ──────────────────────────────────────────────────

-- RF3: RFID Gate Movements — gate reader inward/outward auto-detect
CREATE TABLE IF NOT EXISTS jw_rfid_gate_movements (
  id             SERIAL PRIMARY KEY,
  tenant_id      INTEGER NOT NULL,
  movement_date  TIMESTAMPTZ DEFAULT NOW(),
  direction      VARCHAR(10) NOT NULL,   -- in / out
  gate_location  VARCHAR(60),
  tag_id         VARCHAR(80),
  item_id        INTEGER REFERENCES jw_items(id),
  item_code      VARCHAR(40),
  weight_gm      NUMERIC(10,3),
  reference_type VARCHAR(30),            -- invoice / transfer / grn / none
  reference_id   INTEGER,
  is_authorised  INTEGER DEFAULT 0,
  alert_raised   INTEGER DEFAULT 0,
  alert_id       INTEGER REFERENCES jw_rfid_alerts(id),
  reader_device  VARCHAR(60)
);
CREATE INDEX IF NOT EXISTS idx_jw_rfid_gate_tenant ON jw_rfid_gate_movements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_jw_rfid_gate_tag    ON jw_rfid_gate_movements(tag_id);
CREATE INDEX IF NOT EXISTS idx_jw_rfid_gate_dt     ON jw_rfid_gate_movements(tenant_id, movement_date DESC);

-- RF4: RFID Packing & Dispatch Validation — scan vs invoice
CREATE TABLE IF NOT EXISTS jw_rfid_dispatch_validations (
  id               SERIAL PRIMARY KEY,
  tenant_id        INTEGER NOT NULL,
  validation_no    VARCHAR(40),
  dispatch_date    DATE DEFAULT CURRENT_DATE,
  invoice_id       INTEGER,
  customer_name    VARCHAR(100),
  expected_items   JSONB DEFAULT '[]',   -- [{tag_id, item_code, weight_gm}]
  scanned_items    JSONB DEFAULT '[]',
  all_matched      INTEGER DEFAULT 0,
  missing_count    INTEGER DEFAULT 0,
  extra_count      INTEGER DEFAULT 0,
  total_weight_gm  NUMERIC(12,3) DEFAULT 0,
  seal_no          VARCHAR(40),
  package_sealed   INTEGER DEFAULT 0,
  authorised_by    VARCHAR(100),
  override_reason  TEXT,
  packing_photos   JSONB DEFAULT '[]',
  status           VARCHAR(20) DEFAULT 'pending',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_jw_rfid_dispatch_tenant ON jw_rfid_dispatch_validations(tenant_id);

-- ── INTEGRATION CONFIG TABLES ─────────────────────────────

-- XRF Analyser — purity test results from device
CREATE TABLE IF NOT EXISTS jw_xrf_readings (
  id               SERIAL PRIMARY KEY,
  tenant_id        INTEGER NOT NULL,
  device_id        VARCHAR(60),
  reading_date     TIMESTAMPTZ DEFAULT NOW(),
  item_id          INTEGER REFERENCES jw_items(id),
  production_order_id INTEGER REFERENCES jw_production_orders(id),
  ghat_entry_id    INTEGER REFERENCES jw_ghat_entries(id),
  sample_id        VARCHAR(40),
  gold_pct         NUMERIC(5,2),
  silver_pct       NUMERIC(5,2),
  copper_pct       NUMERIC(5,2),
  zinc_pct         NUMERIC(5,2),
  other_pct        NUMERIC(5,2),
  total_purity_pct NUMERIC(5,2),
  raw_output       JSONB,
  source           VARCHAR(20) DEFAULT 'manual_entry',  -- device_import / manual_entry
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_jw_xrf_tenant ON jw_xrf_readings(tenant_id);

-- Shipping / Courier Config (Shiprocket / Delhivery)
CREATE TABLE IF NOT EXISTS jw_shipping_config (
  id               SERIAL PRIMARY KEY,
  tenant_id        INTEGER NOT NULL UNIQUE,
  provider         VARCHAR(30) DEFAULT 'shiprocket',  -- shiprocket / delhivery / custom
  api_key_hint     VARCHAR(60),
  api_url          TEXT,
  default_weight_kg NUMERIC(6,3) DEFAULT 0.1,
  auto_book        INTEGER DEFAULT 0,
  webhook_url      TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Shipping Tracking — per-order courier details
CREATE TABLE IF NOT EXISTS jw_shipment_tracking (
  id               SERIAL PRIMARY KEY,
  tenant_id        INTEGER NOT NULL,
  reference_type   VARCHAR(20) NOT NULL,  -- ecom_order / oms_order / bullion
  reference_id     INTEGER NOT NULL,
  courier_name     VARCHAR(60),
  awb_no           VARCHAR(60),
  tracking_url     TEXT,
  dispatched_at    TIMESTAMPTZ,
  estimated_delivery DATE,
  delivered_at     TIMESTAMPTZ,
  status           VARCHAR(30) DEFAULT 'booked',
  last_status_update TIMESTAMPTZ,
  raw_status       JSONB,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_jw_shipment_tenant ON jw_shipment_tracking(tenant_id);

-- Insurance Config — transit insurance for gold movements
CREATE TABLE IF NOT EXISTS jw_insurance_config (
  id              SERIAL PRIMARY KEY,
  tenant_id       INTEGER NOT NULL UNIQUE,
  provider        VARCHAR(60),
  policy_no       VARCHAR(60),
  coverage_per_gm NUMERIC(12,2),
  max_coverage    NUMERIC(14,2),
  premium_pct     NUMERIC(5,3),
  auto_insure_above_gm NUMERIC(10,3) DEFAULT 100,
  contact_name    VARCHAR(100),
  contact_phone   VARCHAR(20),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Insurance on transit movements (add fields to bullion_bookings & shipment_tracking)
ALTER TABLE jw_bullion_bookings
  ADD COLUMN IF NOT EXISTS insured         INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS insurance_value NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS insurance_policy VARCHAR(60);

-- TRACES TDS Config — for gold chit cash payouts >₹10,000
CREATE TABLE IF NOT EXISTS jw_traces_config (
  id            SERIAL PRIMARY KEY,
  tenant_id     INTEGER NOT NULL UNIQUE,
  tan_no        VARCHAR(20),
  deductor_name VARCHAR(100),
  deductor_type VARCHAR(20) DEFAULT 'company',
  tds_rate_pct  NUMERIC(5,2) DEFAULT 1,
  threshold_inr NUMERIC(12,2) DEFAULT 10000,
  auto_deduct   INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Armoured Van / 3PL Config (Brinks / SIS Prosegur)
CREATE TABLE IF NOT EXISTS jw_armoured_van_config (
  id              SERIAL PRIMARY KEY,
  tenant_id       INTEGER NOT NULL UNIQUE,
  provider        VARCHAR(60),
  contact_name    VARCHAR(100),
  contact_phone   VARCHAR(20),
  api_url         TEXT,
  api_key_hint    VARCHAR(60),
  gps_tracking    INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Armoured Van Movements — for large bullion shipments
CREATE TABLE IF NOT EXISTS jw_armoured_movements (
  id              SERIAL PRIMARY KEY,
  tenant_id       INTEGER NOT NULL,
  movement_no     VARCHAR(40),
  movement_date   DATE DEFAULT CURRENT_DATE,
  provider        VARCHAR(60),
  driver_name     VARCHAR(100),
  vehicle_no      VARCHAR(20),
  from_location   VARCHAR(100),
  to_location     VARCHAR(100),
  metal_type      VARCHAR(20) DEFAULT 'gold',
  weight_gm       NUMERIC(12,3) NOT NULL DEFAULT 0,
  insured_value   NUMERIC(14,2) DEFAULT 0,
  eway_bill_no    VARCHAR(20),
  customs_ref     VARCHAR(40),
  gps_ref         VARCHAR(60),
  seal_no         VARCHAR(40),
  received_by     VARCHAR(100),
  received_at     TIMESTAMPTZ,
  status          VARCHAR(20) DEFAULT 'in_transit',
  linked_booking_id INTEGER REFERENCES jw_bullion_bookings(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_jw_armoured_tenant ON jw_armoured_movements(tenant_id);
