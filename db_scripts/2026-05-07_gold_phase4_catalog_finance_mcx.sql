-- ============================================================
-- Gold ERP Phase 4: E-Catalog + Finance (Metal Accounting) + MCX Rate Config
-- Priority: HIGH — MCX is dependency for all pricing
-- ============================================================

-- ── MCX / IBJA RATE INTEGRATION ───────────────────────────

-- 1. MCX Rate Config — per-tenant API settings
CREATE TABLE IF NOT EXISTS jw_mcx_rate_config (
  id              SERIAL PRIMARY KEY,
  tenant_id       INTEGER NOT NULL UNIQUE,
  rate_source     VARCHAR(20) DEFAULT 'manual',  -- manual / mcx / ibja / custom_api
  api_url         TEXT,
  api_key_hint    VARCHAR(60),
  poll_interval_mins INTEGER DEFAULT 60,
  auto_update     INTEGER DEFAULT 0,
  last_fetched_at TIMESTAMPTZ,
  fallback_source VARCHAR(20) DEFAULT 'manual',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Extend jw_metal_rates with MCX-specific fields
ALTER TABLE jw_metal_rates
  ADD COLUMN IF NOT EXISTS mcx_symbol    VARCHAR(20),
  ADD COLUMN IF NOT EXISTS open_rate     NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS high_rate     NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS low_rate      NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS prev_close    NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS change_pct    NUMERIC(6,3),
  ADD COLUMN IF NOT EXISTS rate_time     TIMESTAMPTZ;

-- ── E-CATALOG ─────────────────────────────────────────────

-- 3. Digital Catalogues — setup & branding
CREATE TABLE IF NOT EXISTS jw_catalogs (
  id               SERIAL PRIMARY KEY,
  tenant_id        INTEGER NOT NULL,
  catalog_name     VARCHAR(100) NOT NULL,
  brand_name       VARCHAR(100),
  logo_url         TEXT,
  primary_color    VARCHAR(10),
  secondary_color  VARCHAR(10),
  watermark_text   TEXT,
  footer_text      TEXT,
  access_type      VARCHAR(20) DEFAULT 'link',   -- link / password / otp / timed
  password         VARCHAR(60),
  expiry_dt        TIMESTAMPTZ,
  default_currency VARCHAR(10) DEFAULT 'INR',
  language         VARCHAR(10) DEFAULT 'en',
  show_prices      VARCHAR(20) DEFAULT 'hide',   -- hide / mrp / making_only / range
  is_active        INTEGER DEFAULT 1,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_jw_catalog_tenant ON jw_catalogs(tenant_id);

-- 4. Catalog Share Links — unique links per customer/batch
CREATE TABLE IF NOT EXISTS jw_catalog_shares (
  id           SERIAL PRIMARY KEY,
  tenant_id    INTEGER NOT NULL,
  catalog_id   INTEGER NOT NULL REFERENCES jw_catalogs(id) ON DELETE CASCADE,
  share_token  VARCHAR(80) NOT NULL UNIQUE,
  customer_name VARCHAR(100),
  customer_phone VARCHAR(20),
  shared_by    VARCHAR(100),
  shared_at    TIMESTAMPTZ DEFAULT NOW(),
  expires_at   TIMESTAMPTZ,
  views        INTEGER DEFAULT 0,
  last_viewed  TIMESTAMPTZ,
  otp_required INTEGER DEFAULT 0,
  is_active    INTEGER DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_jw_catalog_share_tenant ON jw_catalog_shares(tenant_id);
CREATE INDEX IF NOT EXISTS idx_jw_catalog_share_token  ON jw_catalog_shares(share_token);

-- 5. Catalog Enquiries — leads from catalog portal
CREATE TABLE IF NOT EXISTS jw_catalog_enquiries (
  id            SERIAL PRIMARY KEY,
  tenant_id     INTEGER NOT NULL,
  catalog_id    INTEGER REFERENCES jw_catalogs(id),
  share_id      INTEGER REFERENCES jw_catalog_shares(id),
  customer_name VARCHAR(100),
  customer_phone VARCHAR(20),
  items         JSONB DEFAULT '[]',
  message       TEXT,
  status        VARCHAR(20) DEFAULT 'new',
  followed_up   INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_jw_cat_enquiry_tenant ON jw_catalog_enquiries(tenant_id);

-- 6. Catalog Analytics — per-item view tracking
CREATE TABLE IF NOT EXISTS jw_catalog_analytics (
  id         SERIAL PRIMARY KEY,
  tenant_id  INTEGER NOT NULL,
  catalog_id INTEGER REFERENCES jw_catalogs(id),
  share_id   INTEGER REFERENCES jw_catalog_shares(id),
  item_id    INTEGER REFERENCES jw_items(id),
  item_code  VARCHAR(40),
  event_type VARCHAR(20) NOT NULL,   -- view / share / enquiry
  session_id VARCHAR(60),
  viewed_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_jw_cat_analytics_tenant ON jw_catalog_analytics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_jw_cat_analytics_catalog ON jw_catalog_analytics(catalog_id);

-- ── FINANCE — METAL-BASED ACCOUNTING ──────────────────────

-- 7. Metal Finance Accounts — track gold/silver accounts in gm
CREATE TABLE IF NOT EXISTS jw_metal_accounts (
  id            SERIAL PRIMARY KEY,
  tenant_id     INTEGER NOT NULL,
  account_code  VARCHAR(20) NOT NULL,
  account_name  VARCHAR(100) NOT NULL,
  account_type  VARCHAR(30) NOT NULL,   -- asset / liability / income / expense
  metal_type    VARCHAR(20) DEFAULT 'gold',
  balance_gm    NUMERIC(14,3) DEFAULT 0,
  balance_inr   NUMERIC(16,2) DEFAULT 0,
  is_active     INTEGER DEFAULT 1,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, account_code)
);
CREATE INDEX IF NOT EXISTS idx_jw_metal_acc_tenant ON jw_metal_accounts(tenant_id);

-- 8. Metal Journal Entries — double-entry with weight
CREATE TABLE IF NOT EXISTS jw_metal_journals (
  id              SERIAL PRIMARY KEY,
  tenant_id       INTEGER NOT NULL,
  journal_no      VARCHAR(40),
  txn_date        DATE DEFAULT CURRENT_DATE,
  txn_type        VARCHAR(40) NOT NULL,
  narration       TEXT,
  reference_type  VARCHAR(30),
  reference_id    INTEGER,
  total_debit_gm  NUMERIC(14,3) DEFAULT 0,
  total_credit_gm NUMERIC(14,3) DEFAULT 0,
  total_debit_inr NUMERIC(16,2) DEFAULT 0,
  total_credit_inr NUMERIC(16,2) DEFAULT 0,
  gold_rate_used  NUMERIC(12,2),
  created_by      VARCHAR(100),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_jw_metal_journal_tenant ON jw_metal_journals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_jw_metal_journal_date   ON jw_metal_journals(tenant_id, txn_date DESC);

-- 9. Metal Journal Lines — debit/credit lines per journal
CREATE TABLE IF NOT EXISTS jw_metal_journal_lines (
  id              SERIAL PRIMARY KEY,
  journal_id      INTEGER NOT NULL REFERENCES jw_metal_journals(id) ON DELETE CASCADE,
  tenant_id       INTEGER NOT NULL,
  account_id      INTEGER REFERENCES jw_metal_accounts(id),
  account_name    VARCHAR(100),
  side            VARCHAR(6) NOT NULL,   -- debit / credit
  weight_gm       NUMERIC(14,3) DEFAULT 0,
  purity_name     VARCHAR(30),
  rate_per_gram   NUMERIC(12,2),
  amount_inr      NUMERIC(16,2) DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_jw_metal_jl_journal ON jw_metal_journal_lines(journal_id);

-- 10. Multi-Branch Gold Stock Consolidation — daily snapshot
CREATE TABLE IF NOT EXISTS jw_stock_consolidation (
  id              SERIAL PRIMARY KEY,
  tenant_id       INTEGER NOT NULL,
  snapshot_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  branch          VARCHAR(60) DEFAULT 'main',
  metal_type      VARCHAR(20) DEFAULT 'gold',
  purity_name     VARCHAR(30),
  stock_in_hand_gm NUMERIC(14,3) DEFAULT 0,
  stock_with_karigar_gm NUMERIC(14,3) DEFAULT 0,
  stock_in_transit_gm   NUMERIC(14,3) DEFAULT 0,
  total_gm        NUMERIC(14,3) DEFAULT 0,
  gold_rate       NUMERIC(12,2),
  total_value_inr NUMERIC(16,2) DEFAULT 0,
  avg_purchase_rate NUMERIC(12,2),
  unrealised_pl   NUMERIC(14,2) DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_jw_stock_cons_tenant ON jw_stock_consolidation(tenant_id, snapshot_date DESC);

-- 11. Weight & Purity Loss P&L — period reconciliation
CREATE TABLE IF NOT EXISTS jw_metal_loss_reports (
  id                   SERIAL PRIMARY KEY,
  tenant_id            INTEGER NOT NULL,
  period_from          DATE NOT NULL,
  period_to            DATE NOT NULL,
  metal_type           VARCHAR(20) DEFAULT 'gold',
  gold_issued_gm       NUMERIC(14,3) DEFAULT 0,
  gold_in_products_gm  NUMERIC(14,3) DEFAULT 0,
  wastage_collected_gm NUMERIC(14,3) DEFAULT 0,
  refinery_sent_gm     NUMERIC(14,3) DEFAULT 0,
  refinery_received_gm NUMERIC(14,3) DEFAULT 0,
  unaccounted_loss_gm  NUMERIC(14,3) DEFAULT 0,
  gold_rate_used       NUMERIC(12,2),
  loss_value_inr       NUMERIC(14,2) DEFAULT 0,
  loss_pct             NUMERIC(6,3) DEFAULT 0,
  purity_loss_gm       NUMERIC(14,3) DEFAULT 0,
  purity_loss_inr      NUMERIC(14,2) DEFAULT 0,
  total_metal_loss_inr NUMERIC(14,2) DEFAULT 0,
  created_by           VARCHAR(100),
  created_at           TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_jw_metal_loss_tenant ON jw_metal_loss_reports(tenant_id);

-- 12. BIS HUID Integration Config — per tenant
CREATE TABLE IF NOT EXISTS jw_bis_config (
  id            SERIAL PRIMARY KEY,
  tenant_id     INTEGER NOT NULL UNIQUE,
  bis_login_id  VARCHAR(60),
  bis_licence_no VARCHAR(40),
  hallmarking_centre VARCHAR(100),
  centre_address TEXT,
  auto_submit   INTEGER DEFAULT 0,
  last_sync_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
