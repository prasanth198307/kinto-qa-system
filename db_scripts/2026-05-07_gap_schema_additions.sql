-- ─────────────────────────────────────────────────────────────────────────────
-- Gap schema additions for Gold ERP — based on audit review 2026-05-07
-- Run: psql $DATABASE_URL -f db_scripts/2026-05-07_gap_schema_additions.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. jw_ghat_entries — add purity_received_pct (purity of gold returned by karigar)
ALTER TABLE jw_ghat_entries
  ADD COLUMN IF NOT EXISTS purity_received_pct NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS purity_variance_pct NUMERIC(6,3),
  ADD COLUMN IF NOT EXISTS gold_issued_gm      NUMERIC(10,3),
  ADD COLUMN IF NOT EXISTS gold_returned_gm    NUMERIC(10,3);

-- 2. jw_metal_ledger — add customer_id FK (optional, normalise customer ref)
ALTER TABLE jw_metal_ledger
  ADD COLUMN IF NOT EXISTS customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL;

-- 3. jw_item_images — multi-angle photos for jewellery items
CREATE TABLE IF NOT EXISTS jw_item_images (
  id          SERIAL PRIMARY KEY,
  tenant_id   INTEGER NOT NULL,
  item_id     INTEGER NOT NULL REFERENCES jw_items(id) ON DELETE CASCADE,
  image_url   TEXT NOT NULL,
  angle       VARCHAR(30),           -- top / side / front / back / detail / lifestyle
  sort_order  INTEGER DEFAULT 0,
  is_primary  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_jw_item_images_item   ON jw_item_images(item_id);
CREATE INDEX IF NOT EXISTS idx_jw_item_images_tenant ON jw_item_images(tenant_id);

-- 4. jw_karigar_attendance — daily attendance & wages
CREATE TABLE IF NOT EXISTS jw_karigar_attendance (
  id              SERIAL PRIMARY KEY,
  tenant_id       INTEGER NOT NULL,
  karigar_id      INTEGER REFERENCES jw_karigars(id) ON DELETE SET NULL,
  attend_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  check_in_time   TIME,
  check_out_time  TIME,
  work_hours      NUMERIC(5,2),
  work_type       VARCHAR(40) DEFAULT 'production',  -- casting/setting/finishing/polishing/other
  daily_wages     NUMERIC(10,2) DEFAULT 0,
  advance_given   NUMERIC(10,2) DEFAULT 0,
  present         INTEGER DEFAULT 1,                 -- 1=present, 0=absent, 2=half-day
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_jw_karigar_attend_karigar ON jw_karigar_attendance(karigar_id);
CREATE INDEX IF NOT EXISTS idx_jw_karigar_attend_date    ON jw_karigar_attendance(attend_date);
CREATE INDEX IF NOT EXISTS idx_jw_karigar_attend_tenant  ON jw_karigar_attendance(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_jw_karigar_attend_day
  ON jw_karigar_attendance(tenant_id, karigar_id, attend_date);

-- 5. jw_bullion_rate_cuts — rate-cut invoices for bullion trade
CREATE TABLE IF NOT EXISTS jw_bullion_rate_cuts (
  id              SERIAL PRIMARY KEY,
  tenant_id       INTEGER NOT NULL,
  invoice_no      VARCHAR(40),
  cut_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  party_name      VARCHAR(150),
  party_type      VARCHAR(30) DEFAULT 'dealer',   -- bank/dealer/refinery
  metal_type      VARCHAR(20) DEFAULT 'gold',
  purity_name     VARCHAR(30),
  weight_gm       NUMERIC(12,3) NOT NULL DEFAULT 0,
  spot_rate       NUMERIC(12,2),                  -- MCX / IBJA rate
  rate_cut_pct    NUMERIC(6,3) DEFAULT 0,         -- % discount on spot
  rate_cut_per_gm NUMERIC(10,2) DEFAULT 0,        -- ₹/g deducted
  net_rate        NUMERIC(12,2),                  -- spot - rate_cut
  total_amount    NUMERIC(14,2),
  gst_pct         NUMERIC(5,2) DEFAULT 3,
  gst_amount      NUMERIC(12,2),
  grand_total     NUMERIC(14,2),
  payment_mode    VARCHAR(30) DEFAULT 'bank',
  payment_ref     VARCHAR(60),
  status          VARCHAR(20) DEFAULT 'draft',    -- draft/invoiced/settled
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_jw_rate_cuts_tenant ON jw_bullion_rate_cuts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_jw_rate_cuts_date   ON jw_bullion_rate_cuts(cut_date);

-- 6. jw_chit_installments — monthly collection register (per member per month)
CREATE TABLE IF NOT EXISTS jw_chit_installments (
  id              SERIAL PRIMARY KEY,
  tenant_id       INTEGER NOT NULL,
  scheme_id       INTEGER REFERENCES jw_chit_schemes(id) ON DELETE CASCADE,
  member_id       INTEGER REFERENCES jw_chit_members(id) ON DELETE CASCADE,
  installment_no  INTEGER NOT NULL,
  due_date        DATE,
  paid_date       DATE,
  amount_inr      NUMERIC(12,2) DEFAULT 0,
  amount_gm       NUMERIC(10,3) DEFAULT 0,        -- gm-based chit support
  payment_mode    VARCHAR(30) DEFAULT 'cash',      -- cash/UPI/bank/cheque
  receipt_no      VARCHAR(40),
  status          VARCHAR(20) DEFAULT 'pending',   -- pending/paid/defaulted/waived
  late_fee        NUMERIC(10,2) DEFAULT 0,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_jw_chit_inst_scheme ON jw_chit_installments(scheme_id);
CREATE INDEX IF NOT EXISTS idx_jw_chit_inst_member ON jw_chit_installments(member_id);
CREATE INDEX IF NOT EXISTS idx_jw_chit_inst_tenant ON jw_chit_installments(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_jw_chit_inst
  ON jw_chit_installments(member_id, installment_no);

-- 7. jw_wholesale_b2b_orders — Wholesale B2B order bookings (finished pieces to retailers)
CREATE TABLE IF NOT EXISTS jw_wholesale_b2b_orders (
  id              SERIAL PRIMARY KEY,
  tenant_id       INTEGER NOT NULL,
  order_no        VARCHAR(40),
  order_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  customer_name   VARCHAR(150),
  customer_phone  VARCHAR(20),
  customer_gstin  VARCHAR(20),
  delivery_date   DATE,
  metal_type      VARCHAR(20) DEFAULT 'gold',
  purity_name     VARCHAR(30),
  total_pieces    INTEGER DEFAULT 0,
  total_weight_gm NUMERIC(12,3) DEFAULT 0,
  gold_rate_used  NUMERIC(12,2),
  making_total    NUMERIC(12,2) DEFAULT 0,
  stone_total     NUMERIC(12,2) DEFAULT 0,
  subtotal        NUMERIC(14,2) DEFAULT 0,
  discount_pct    NUMERIC(5,2) DEFAULT 0,
  discount_amt    NUMERIC(12,2) DEFAULT 0,
  gst_pct         NUMERIC(5,2) DEFAULT 3,
  gst_amount      NUMERIC(12,2) DEFAULT 0,
  grand_total     NUMERIC(14,2) DEFAULT 0,
  advance_paid    NUMERIC(12,2) DEFAULT 0,
  balance_due     NUMERIC(14,2) DEFAULT 0,
  status          VARCHAR(20) DEFAULT 'draft',    -- draft/confirmed/dispatched/delivered
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS jw_wholesale_b2b_order_items (
  id              SERIAL PRIMARY KEY,
  order_id        INTEGER NOT NULL REFERENCES jw_wholesale_b2b_orders(id) ON DELETE CASCADE,
  item_id         INTEGER REFERENCES jw_items(id) ON DELETE SET NULL,
  description     VARCHAR(200),
  qty             INTEGER DEFAULT 1,
  gross_weight_gm NUMERIC(10,3) DEFAULT 0,
  net_weight_gm   NUMERIC(10,3) DEFAULT 0,
  making_charge   NUMERIC(10,2) DEFAULT 0,
  stone_value     NUMERIC(10,2) DEFAULT 0,
  unit_price      NUMERIC(12,2) DEFAULT 0,
  line_total      NUMERIC(14,2) DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_jw_b2b_orders_tenant ON jw_wholesale_b2b_orders(tenant_id);

-- 8. jw_jewellery_pos_bills — full jewellery POS (rate-linked, with exchange)
CREATE TABLE IF NOT EXISTS jw_jewellery_pos_bills (
  id              SERIAL PRIMARY KEY,
  tenant_id       INTEGER NOT NULL,
  bill_no         VARCHAR(40),
  bill_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  customer_name   VARCHAR(150),
  customer_phone  VARCHAR(20),
  customer_gstin  VARCHAR(20),
  gold_rate       NUMERIC(12,2),                  -- live rate at time of billing
  purity_name     VARCHAR(30),
  items_json      JSONB DEFAULT '[]',              -- line items
  gross_total     NUMERIC(14,2) DEFAULT 0,
  exchange_gold_wt NUMERIC(10,3) DEFAULT 0,       -- old gold given in exchange
  exchange_rate   NUMERIC(12,2) DEFAULT 0,
  exchange_value  NUMERIC(12,2) DEFAULT 0,
  discount_amt    NUMERIC(12,2) DEFAULT 0,
  taxable_value   NUMERIC(14,2) DEFAULT 0,
  cgst_pct        NUMERIC(5,2) DEFAULT 1.5,
  sgst_pct        NUMERIC(5,2) DEFAULT 1.5,
  gst_amount      NUMERIC(12,2) DEFAULT 0,
  grand_total     NUMERIC(14,2) DEFAULT 0,
  paid_cash       NUMERIC(12,2) DEFAULT 0,
  paid_card       NUMERIC(12,2) DEFAULT 0,
  paid_upi        NUMERIC(12,2) DEFAULT 0,
  advance_used    NUMERIC(12,2) DEFAULT 0,
  balance         NUMERIC(12,2) DEFAULT 0,
  booking_id      INTEGER,                         -- link to counter booking if any
  status          VARCHAR(20) DEFAULT 'draft',    -- draft/paid/cancelled
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_jw_pos_bills_tenant ON jw_jewellery_pos_bills(tenant_id);
CREATE INDEX IF NOT EXISTS idx_jw_pos_bills_date   ON jw_jewellery_pos_bills(bill_date);

-- 9. jw_bullion_vault_movements — movement tracking across vault locations
CREATE TABLE IF NOT EXISTS jw_bullion_vault_movements (
  id              SERIAL PRIMARY KEY,
  tenant_id       INTEGER NOT NULL,
  movement_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  movement_type   VARCHAR(20) NOT NULL,           -- in/out/transfer
  metal_type      VARCHAR(20) DEFAULT 'gold',
  purity_name     VARCHAR(30),
  weight_gm       NUMERIC(12,3) NOT NULL DEFAULT 0,
  from_location   VARCHAR(100),
  to_location     VARCHAR(100),
  vehicle_no      VARCHAR(30),
  driver_name     VARCHAR(100),
  security_seal   VARCHAR(60),
  escorted_by     VARCHAR(100),
  reason          VARCHAR(200),
  reference_type  VARCHAR(40),                    -- bullion_txn/production/sale
  reference_id    INTEGER,
  verified_by     VARCHAR(100),
  status          VARCHAR(20) DEFAULT 'pending',  -- pending/in_transit/delivered/verified
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_jw_vault_mv_tenant ON jw_bullion_vault_movements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_jw_vault_mv_date   ON jw_bullion_vault_movements(movement_date);

SELECT 'Gap schema additions complete' AS result;
