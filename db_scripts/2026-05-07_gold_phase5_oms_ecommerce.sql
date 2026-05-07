-- ============================================================
-- Gold ERP Phase 5: OMS (Order Portal) + E-Commerce
-- Priority: MEDIUM — customer-facing, depends on Phase 1-4 data
-- ============================================================

-- ── OMS — CUSTOMER ORDER PORTAL ───────────────────────────

-- 1. OMS Orders — customer-facing order booking
CREATE TABLE IF NOT EXISTS jw_oms_orders (
  id                SERIAL PRIMARY KEY,
  tenant_id         INTEGER NOT NULL,
  order_no          VARCHAR(40),
  order_date        DATE DEFAULT CURRENT_DATE,
  customer_name     VARCHAR(100) NOT NULL,
  customer_phone    VARCHAR(20) NOT NULL,
  customer_email    VARCHAR(100),
  order_type        VARCHAR(30) DEFAULT 'new_design',  -- new_design / repair / remodel / resize / stone
  design_id         INTEGER REFERENCES jw_design_library(id),
  design_ref        VARCHAR(60),
  metal_type        VARCHAR(20) DEFAULT 'gold',
  purity_name       VARCHAR(30),
  approx_weight_gm  NUMERIC(10,3),
  making_charges_quoted NUMERIC(12,2),
  stone_requirements TEXT,
  customisation_notes TEXT,
  advance_paid      NUMERIC(12,2) DEFAULT 0,
  advance_mode      VARCHAR(20),
  balance_due       NUMERIC(12,2) DEFAULT 0,
  expected_delivery DATE,
  linked_production_id INTEGER REFERENCES jw_production_orders(id),
  status            VARCHAR(30) DEFAULT 'booked',
  -- status: booked / design_confirmed / in_production / qc / ready / dispatched / delivered / cancelled
  whatsapp_updates  INTEGER DEFAULT 1,
  counter_staff     VARCHAR(100),
  record_status     INTEGER DEFAULT 1,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_jw_oms_orders_tenant ON jw_oms_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_jw_oms_orders_phone  ON jw_oms_orders(customer_phone);

-- 2. OMS Status Timeline — stage-by-stage tracking
CREATE TABLE IF NOT EXISTS jw_oms_status_log (
  id           SERIAL PRIMARY KEY,
  tenant_id    INTEGER NOT NULL,
  order_id     INTEGER NOT NULL REFERENCES jw_oms_orders(id) ON DELETE CASCADE,
  status       VARCHAR(30) NOT NULL,
  notes        TEXT,
  notified_via VARCHAR(20),    -- whatsapp / sms / email
  notified_at  TIMESTAMPTZ,
  changed_by   VARCHAR(100),
  changed_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_jw_oms_log_order ON jw_oms_status_log(order_id);

-- 3. OMS Notifications Config — WhatsApp trigger settings per tenant
CREATE TABLE IF NOT EXISTS jw_oms_notify_config (
  id                  SERIAL PRIMARY KEY,
  tenant_id           INTEGER NOT NULL UNIQUE,
  notify_booked       INTEGER DEFAULT 1,
  notify_in_prod      INTEGER DEFAULT 1,
  notify_qc           INTEGER DEFAULT 1,
  notify_ready        INTEGER DEFAULT 1,
  notify_dispatched   INTEGER DEFAULT 1,
  notify_delivered    INTEGER DEFAULT 1,
  notify_payment_due  INTEGER DEFAULT 1,
  channel             VARCHAR(20) DEFAULT 'whatsapp',
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── E-COMMERCE ────────────────────────────────────────────

-- 4. E-Commerce Store Config — per-tenant store setup
CREATE TABLE IF NOT EXISTS jw_ecom_config (
  id                    SERIAL PRIMARY KEY,
  tenant_id             INTEGER NOT NULL UNIQUE,
  store_name            VARCHAR(100),
  subdomain             VARCHAR(60),
  logo_url              TEXT,
  primary_color         VARCHAR(10),
  rate_source           VARCHAR(20) DEFAULT 'manual',   -- manual / mcx / ibja
  rate_update_freq_mins INTEGER DEFAULT 60,
  making_charges_display VARCHAR(20) DEFAULT 'included', -- included / separate
  price_validity_mins   INTEGER DEFAULT 30,
  cod_enabled           INTEGER DEFAULT 0,
  return_policy         TEXT,
  shipping_zones        JSONB DEFAULT '[]',
  seo_title             VARCHAR(150),
  seo_description       TEXT,
  ga_id                 VARCHAR(30),
  is_active             INTEGER DEFAULT 0,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- 5. E-Commerce Cart — customer cart sessions
CREATE TABLE IF NOT EXISTS jw_ecom_carts (
  id              SERIAL PRIMARY KEY,
  tenant_id       INTEGER NOT NULL,
  session_token   VARCHAR(80) NOT NULL,
  customer_phone  VARCHAR(20),
  customer_email  VARCHAR(100),
  items           JSONB DEFAULT '[]',
  gold_rate_at_add NUMERIC(12,2),
  rate_locked_till TIMESTAMPTZ,
  coupon_code     VARCHAR(30),
  discount_amount NUMERIC(12,2) DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_jw_ecom_cart_tenant  ON jw_ecom_carts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_jw_ecom_cart_session ON jw_ecom_carts(session_token);

-- 6. E-Commerce Orders — online orders
CREATE TABLE IF NOT EXISTS jw_ecom_orders (
  id               SERIAL PRIMARY KEY,
  tenant_id        INTEGER NOT NULL,
  order_no         VARCHAR(40),
  order_date       TIMESTAMPTZ DEFAULT NOW(),
  customer_name    VARCHAR(100) NOT NULL,
  customer_phone   VARCHAR(20) NOT NULL,
  customer_email   VARCHAR(100),
  delivery_address JSONB,
  items            JSONB DEFAULT '[]',
  gold_rate_locked NUMERIC(12,2),
  rate_lock_time   TIMESTAMPTZ,
  subtotal         NUMERIC(14,2) DEFAULT 0,
  making_charges   NUMERIC(12,2) DEFAULT 0,
  gst_amount       NUMERIC(12,2) DEFAULT 0,
  shipping_charges NUMERIC(12,2) DEFAULT 0,
  discount_amount  NUMERIC(12,2) DEFAULT 0,
  total_amount     NUMERIC(14,2) DEFAULT 0,
  payment_mode     VARCHAR(20),
  payment_status   VARCHAR(20) DEFAULT 'pending',
  razorpay_order_id VARCHAR(60),
  razorpay_payment_id VARCHAR(60),
  status           VARCHAR(30) DEFAULT 'placed',
  courier_name     VARCHAR(60),
  tracking_no      VARCHAR(60),
  erp_order_id     INTEGER REFERENCES jw_oms_orders(id),
  synced_to_erp    INTEGER DEFAULT 0,
  record_status    INTEGER DEFAULT 1,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_jw_ecom_orders_tenant ON jw_ecom_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_jw_ecom_orders_phone  ON jw_ecom_orders(customer_phone);

-- 7. E-Commerce Wishlists — customer saved items
CREATE TABLE IF NOT EXISTS jw_ecom_wishlists (
  id             SERIAL PRIMARY KEY,
  tenant_id      INTEGER NOT NULL,
  customer_phone VARCHAR(20) NOT NULL,
  item_id        INTEGER REFERENCES jw_items(id),
  item_code      VARCHAR(40),
  added_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, customer_phone, item_id)
);
CREATE INDEX IF NOT EXISTS idx_jw_ecom_wishlist_tenant ON jw_ecom_wishlists(tenant_id);

-- 8. E-Commerce Coupons
CREATE TABLE IF NOT EXISTS jw_ecom_coupons (
  id               SERIAL PRIMARY KEY,
  tenant_id        INTEGER NOT NULL,
  coupon_code      VARCHAR(30) NOT NULL,
  discount_type    VARCHAR(20) NOT NULL,  -- flat / percent / free_shipping / gift
  discount_value   NUMERIC(10,2) DEFAULT 0,
  discount_pct     NUMERIC(5,2) DEFAULT 0,
  min_order_value  NUMERIC(12,2),
  max_discount     NUMERIC(12,2),
  usage_limit      INTEGER,
  used_count       INTEGER DEFAULT 0,
  customer_specific VARCHAR(20),
  valid_from       DATE,
  valid_to         DATE,
  is_active        INTEGER DEFAULT 1,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, coupon_code)
);
CREATE INDEX IF NOT EXISTS idx_jw_ecom_coupon_tenant ON jw_ecom_coupons(tenant_id);

-- ── RFID (Software Layer — UI shell pending hardware) ─────

-- 9. RFID Tags Registry — links tag to item
CREATE TABLE IF NOT EXISTS jw_rfid_tags (
  id            SERIAL PRIMARY KEY,
  tenant_id     INTEGER NOT NULL,
  tag_id        VARCHAR(80) NOT NULL,
  epc_code      VARCHAR(80),
  item_id       INTEGER REFERENCES jw_items(id),
  design_code   VARCHAR(40),
  metal_type    VARCHAR(20),
  weight_gm     NUMERIC(10,3),
  huid_no       VARCHAR(20),
  location      VARCHAR(60) DEFAULT 'showroom',
  tag_type      VARCHAR(20) DEFAULT 'uhf',
  encoded_by    VARCHAR(100),
  encoded_at    TIMESTAMPTZ DEFAULT NOW(),
  is_active     INTEGER DEFAULT 1,
  UNIQUE(tenant_id, tag_id)
);
CREATE INDEX IF NOT EXISTS idx_jw_rfid_tenant ON jw_rfid_tags(tenant_id);

-- 10. RFID Scan Sessions — bulk scan logs
CREATE TABLE IF NOT EXISTS jw_rfid_scan_sessions (
  id              SERIAL PRIMARY KEY,
  tenant_id       INTEGER NOT NULL,
  session_code    VARCHAR(40),
  scan_date       DATE DEFAULT CURRENT_DATE,
  location        VARCHAR(60),
  scanner_device  VARCHAR(60),
  scan_mode       VARCHAR(20) DEFAULT 'full_audit',
  started_at      TIMESTAMPTZ DEFAULT NOW(),
  ended_at        TIMESTAMPTZ,
  tags_expected   INTEGER DEFAULT 0,
  tags_scanned    INTEGER DEFAULT 0,
  tags_matched    INTEGER DEFAULT 0,
  tags_missing    INTEGER DEFAULT 0,
  tags_extra      INTEGER DEFAULT 0,
  discrepancy_gm  NUMERIC(12,3) DEFAULT 0,
  scanned_by      VARCHAR(100),
  status          VARCHAR(20) DEFAULT 'in_progress'
);
CREATE INDEX IF NOT EXISTS idx_jw_rfid_session_tenant ON jw_rfid_scan_sessions(tenant_id);

-- 11. RFID Security Alerts
CREATE TABLE IF NOT EXISTS jw_rfid_alerts (
  id            SERIAL PRIMARY KEY,
  tenant_id     INTEGER NOT NULL,
  alert_type    VARCHAR(30) NOT NULL,   -- unauthorised_exit / ghost_item / missing / tampered / unusual_movement
  tag_id        VARCHAR(80),
  item_code     VARCHAR(40),
  description   VARCHAR(150),
  weight_gm     NUMERIC(10,3),
  location      VARCHAR(60),
  triggered_at  TIMESTAMPTZ DEFAULT NOW(),
  acknowledged  INTEGER DEFAULT 0,
  acknowledged_by VARCHAR(100),
  action_taken  TEXT,
  resolved      INTEGER DEFAULT 0,
  cctv_ref      VARCHAR(60)
);
CREATE INDEX IF NOT EXISTS idx_jw_rfid_alert_tenant ON jw_rfid_alerts(tenant_id);
