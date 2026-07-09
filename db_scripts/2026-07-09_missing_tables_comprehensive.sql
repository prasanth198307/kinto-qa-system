-- =============================================================================
-- MISSING TABLES — Comprehensive Migration
-- Generated: 2026-07-09
-- All statements use CREATE TABLE IF NOT EXISTS so this is safe to re-run.
-- =============================================================================


-- =============================================================================
-- SECTION 1: RESTAURANT LOYALTY
-- =============================================================================

CREATE TABLE IF NOT EXISTS restaurant_customers (
  id              SERIAL PRIMARY KEY,
  tenant_id       INTEGER NOT NULL,
  name            TEXT NOT NULL,
  phone           TEXT,
  email           TEXT,
  dob             DATE,
  anniversary     DATE,
  address         TEXT,
  loyalty_points  INTEGER DEFAULT 0,
  total_spend     NUMERIC(14,2) DEFAULT 0,
  last_visit_date DATE,
  expiry_date     DATE,
  crm_contact_id  INTEGER,
  record_status   INTEGER DEFAULT 1,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_restaurant_customers_tenant  ON restaurant_customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_customers_phone   ON restaurant_customers(tenant_id, phone);

-- Shared loyalty config (used by restaurant AND retail POS)
CREATE TABLE IF NOT EXISTS loyalty_config (
  id                          SERIAL PRIMARY KEY,
  tenant_id                   INTEGER NOT NULL UNIQUE,
  -- Restaurant columns
  points_per_100              NUMERIC(10,2) DEFAULT 1,
  redemption_value            NUMERIC(10,4) DEFAULT 0.5,
  min_redemption              INTEGER DEFAULT 100,
  max_points_per_bill         INTEGER DEFAULT 500,
  -- Retail POS columns
  points_per_50_rupees        NUMERIC(10,2) DEFAULT 1,
  redemption_value_per_point  NUMERIC(10,4) DEFAULT 0.5,
  -- Shared
  expiry_days                 INTEGER DEFAULT 365,
  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

-- Retail POS loyalty customers
CREATE TABLE IF NOT EXISTS loyalty_customers (
  id             SERIAL PRIMARY KEY,
  tenant_id      INTEGER NOT NULL,
  name           TEXT NOT NULL,
  phone          TEXT,
  email          TEXT,
  points_balance INTEGER DEFAULT 0,
  expiry_date    DATE,
  record_status  INTEGER DEFAULT 1,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_loyalty_customers_tenant ON loyalty_customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_customers_phone  ON loyalty_customers(tenant_id, phone);

CREATE TABLE IF NOT EXISTS restaurant_loyalty_transactions (
  id            SERIAL PRIMARY KEY,
  tenant_id     INTEGER NOT NULL,
  customer_id   INTEGER REFERENCES restaurant_customers(id),
  txn_type      TEXT NOT NULL DEFAULT 'earn',   -- earn | redeem | expire | adjust
  points        INTEGER NOT NULL DEFAULT 0,
  reference     TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rest_loyalty_txn_cust ON restaurant_loyalty_transactions(customer_id);


-- =============================================================================
-- SECTION 2: HOTEL TABLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS hotel_room_types (
  id          SERIAL PRIMARY KEY,
  tenant_id   INTEGER NOT NULL,
  name        TEXT NOT NULL,
  code        TEXT,
  description TEXT,
  base_rate   NUMERIC(14,2) DEFAULT 0,
  capacity    INTEGER DEFAULT 2,
  amenities   TEXT,
  is_active   INTEGER DEFAULT 1,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hotel_room_types_tenant ON hotel_room_types(tenant_id);

CREATE TABLE IF NOT EXISTS hotel_guests (
  id              SERIAL PRIMARY KEY,
  tenant_id       INTEGER NOT NULL,
  name            TEXT NOT NULL,
  phone           TEXT,
  email           TEXT,
  id_type         TEXT,                         -- passport | aadhaar | pan | driving_license
  id_number       TEXT,
  nationality     TEXT DEFAULT 'Indian',
  address         TEXT,
  company_name    TEXT,
  gstin           TEXT,
  blacklisted     INTEGER DEFAULT 0,
  notes           TEXT,
  record_status   INTEGER DEFAULT 1,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hotel_guests_tenant ON hotel_guests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hotel_guests_phone  ON hotel_guests(tenant_id, phone);

CREATE TABLE IF NOT EXISTS hotel_rooms (
  id            SERIAL PRIMARY KEY,
  tenant_id     INTEGER NOT NULL,
  room_number   TEXT NOT NULL,
  room_type_id  INTEGER REFERENCES hotel_room_types(id),
  floor         TEXT,
  status        TEXT DEFAULT 'available',       -- available | occupied | maintenance | cleaning | blocked
  is_active     INTEGER DEFAULT 1,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hotel_rooms_tenant ON hotel_rooms(tenant_id);

CREATE TABLE IF NOT EXISTS hotel_reservations (
  id                  SERIAL PRIMARY KEY,
  tenant_id           INTEGER NOT NULL,
  reservation_no      TEXT NOT NULL,
  guest_id            INTEGER REFERENCES hotel_guests(id),
  room_id             INTEGER REFERENCES hotel_rooms(id),
  check_in_date       DATE,
  check_out_date      DATE,
  actual_check_in     TIMESTAMPTZ,
  actual_check_out    TIMESTAMPTZ,
  adults              INTEGER DEFAULT 1,
  children            INTEGER DEFAULT 0,
  total_amount        NUMERIC(14,2) DEFAULT 0,
  advance_paid        NUMERIC(14,2) DEFAULT 0,
  rate_plan           TEXT,
  source              TEXT DEFAULT 'walk_in',   -- walk_in | online | phone | ota | corporate
  channel_code        TEXT,
  status              TEXT DEFAULT 'confirmed', -- confirmed | checked_in | checked_out | cancelled | no_show
  special_requests    TEXT,
  notes               TEXT,
  created_by          INTEGER,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hotel_reservations_tenant      ON hotel_reservations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hotel_reservations_checkin     ON hotel_reservations(tenant_id, check_in_date);
CREATE INDEX IF NOT EXISTS idx_hotel_reservations_status      ON hotel_reservations(tenant_id, status);

CREATE TABLE IF NOT EXISTS hotel_folios (
  id               SERIAL PRIMARY KEY,
  tenant_id        INTEGER NOT NULL,
  folio_number     TEXT NOT NULL,
  reservation_id   INTEGER REFERENCES hotel_reservations(id),
  guest_id         INTEGER REFERENCES hotel_guests(id),
  room_id          INTEGER REFERENCES hotel_rooms(id),
  total_amount     NUMERIC(14,2) DEFAULT 0,
  paid_amount      NUMERIC(14,2) DEFAULT 0,
  balance_amount   NUMERIC(14,2) DEFAULT 0,
  payment_mode     TEXT DEFAULT 'cash',
  status           TEXT DEFAULT 'open',          -- open | settled | cancelled
  invoice_number   TEXT,
  gstin            TEXT,
  notes            TEXT,
  created_by       INTEGER,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hotel_folios_tenant      ON hotel_folios(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hotel_folios_reservation ON hotel_folios(reservation_id);

CREATE TABLE IF NOT EXISTS hotel_folio_items (
  id            SERIAL PRIMARY KEY,
  folio_id      INTEGER NOT NULL REFERENCES hotel_folios(id),
  tenant_id     INTEGER NOT NULL,
  description   TEXT NOT NULL,
  category      TEXT DEFAULT 'room',            -- room | food | laundry | telephone | misc | tax
  amount        NUMERIC(14,2) DEFAULT 0,
  quantity      INTEGER DEFAULT 1,
  item_date     DATE DEFAULT CURRENT_DATE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hotel_folio_items_folio ON hotel_folio_items(folio_id);

CREATE TABLE IF NOT EXISTS hotel_rate_plans (
  id          SERIAL PRIMARY KEY,
  tenant_id   INTEGER NOT NULL,
  name        TEXT NOT NULL,
  code        TEXT,
  description TEXT,
  base_markup NUMERIC(6,2) DEFAULT 0,
  is_active   INTEGER DEFAULT 1,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hotel_rate_plans_tenant ON hotel_rate_plans(tenant_id);

CREATE TABLE IF NOT EXISTS hotel_housekeeping_tasks (
  id          SERIAL PRIMARY KEY,
  tenant_id   INTEGER NOT NULL,
  room_id     INTEGER REFERENCES hotel_rooms(id),
  task_type   TEXT DEFAULT 'cleaning',         -- cleaning | inspection | maintenance | turndown
  assigned_to TEXT,
  status      TEXT DEFAULT 'pending',           -- pending | in_progress | done
  notes       TEXT,
  task_date   DATE DEFAULT CURRENT_DATE,
  completed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hotel_housekeeping_tenant ON hotel_housekeeping_tasks(tenant_id);


-- =============================================================================
-- SECTION 3: NGO TABLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS ngo_donors (
  id            SERIAL PRIMARY KEY,
  tenant_id     INTEGER NOT NULL,
  donor_code    TEXT,
  name          TEXT NOT NULL,
  phone         TEXT,
  email         TEXT,
  address       TEXT,
  pan_number    TEXT,
  donor_type    TEXT DEFAULT 'individual',      -- individual | corporate | trust | foreign
  total_donated NUMERIC(14,2) DEFAULT 0,
  notes         TEXT,
  record_status INTEGER DEFAULT 1,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ngo_donors_tenant ON ngo_donors(tenant_id);

CREATE TABLE IF NOT EXISTS ngo_projects (
  id             SERIAL PRIMARY KEY,
  tenant_id      INTEGER NOT NULL,
  project_code   TEXT,
  name           TEXT NOT NULL,
  description    TEXT,
  start_date     DATE,
  end_date       DATE,
  target_amount  NUMERIC(14,2) DEFAULT 0,
  funds_received NUMERIC(14,2) DEFAULT 0,
  location       TEXT,
  status         TEXT DEFAULT 'active',         -- active | completed | suspended
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ngo_projects_tenant ON ngo_projects(tenant_id);

CREATE TABLE IF NOT EXISTS ngo_donations (
  id               SERIAL PRIMARY KEY,
  tenant_id        INTEGER NOT NULL,
  donation_number  TEXT,
  donor_id         INTEGER REFERENCES ngo_donors(id),
  project_id       INTEGER REFERENCES ngo_projects(id),
  amount           NUMERIC(14,2) DEFAULT 0,
  donation_date    DATE,
  payment_mode     TEXT DEFAULT 'cash',
  reference_number TEXT,
  purpose          TEXT,
  is_80g_eligible  BOOLEAN DEFAULT TRUE,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ngo_donations_tenant ON ngo_donations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ngo_donations_donor  ON ngo_donations(donor_id);

CREATE TABLE IF NOT EXISTS ngo_80g_receipts (
  id               SERIAL PRIMARY KEY,
  tenant_id        INTEGER NOT NULL,
  receipt_number   TEXT,
  donor_id         INTEGER REFERENCES ngo_donors(id),
  donation_id      INTEGER REFERENCES ngo_donations(id),
  amount           NUMERIC(14,2) DEFAULT 0,
  financial_year   TEXT,
  issue_date       DATE,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ngo_80g_tenant ON ngo_80g_receipts(tenant_id);

CREATE TABLE IF NOT EXISTS ngo_grants (
  id                SERIAL PRIMARY KEY,
  tenant_id         INTEGER NOT NULL,
  grant_code        TEXT,
  project_id        INTEGER REFERENCES ngo_projects(id),
  grantor_name      TEXT NOT NULL,
  grant_type        TEXT DEFAULT 'government',  -- government | corporate | foreign | multilateral
  applied_amount    NUMERIC(14,2) DEFAULT 0,
  approved_amount   NUMERIC(14,2) DEFAULT 0,
  application_date  DATE,
  approval_date     DATE,
  status            TEXT DEFAULT 'applied',     -- applied | approved | received | rejected | closed
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ngo_grants_tenant ON ngo_grants(tenant_id);

CREATE TABLE IF NOT EXISTS ngo_volunteers (
  id              SERIAL PRIMARY KEY,
  tenant_id       INTEGER NOT NULL,
  volunteer_code  TEXT,
  name            TEXT NOT NULL,
  phone           TEXT,
  email           TEXT,
  skills          TEXT,
  availability    TEXT,
  joined_date     DATE,
  status          TEXT DEFAULT 'active',        -- active | inactive | suspended
  notes           TEXT,
  record_status   INTEGER DEFAULT 1,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ngo_volunteers_tenant ON ngo_volunteers(tenant_id);

CREATE TABLE IF NOT EXISTS ngo_beneficiaries (
  id              SERIAL PRIMARY KEY,
  tenant_id       INTEGER NOT NULL,
  beneficiary_code TEXT,
  name            TEXT NOT NULL,
  phone           TEXT,
  address         TEXT,
  age             INTEGER,
  gender          TEXT,
  category        TEXT,
  project_id      INTEGER REFERENCES ngo_projects(id),
  enrolled_date   DATE,
  status          TEXT DEFAULT 'active',
  notes           TEXT,
  record_status   INTEGER DEFAULT 1,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ngo_beneficiaries_tenant ON ngo_beneficiaries(tenant_id);

CREATE TABLE IF NOT EXISTS ngo_fcra_submissions (
  id              SERIAL PRIMARY KEY,
  tenant_id       INTEGER NOT NULL,
  year            INTEGER NOT NULL,
  return_type     TEXT,
  status          TEXT DEFAULT 'pending',
  submission_ref  TEXT,
  submitted_at    TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ngo_fcra_tenant ON ngo_fcra_submissions(tenant_id);

CREATE TABLE IF NOT EXISTS ngo_csr_projects (
  id                            SERIAL PRIMARY KEY,
  tenant_id                     INTEGER NOT NULL,
  project_name                  TEXT NOT NULL,
  corporate_donor               TEXT,
  cin                           TEXT,
  csr_amount                    NUMERIC(14,2) DEFAULT 0,
  project_description           TEXT,
  beneficiary_count             INTEGER DEFAULT 0,
  start_date                    DATE,
  end_date                      DATE,
  utilisation_certificate_no    TEXT,
  status                        TEXT DEFAULT 'active',
  created_at                    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ngo_csr_tenant ON ngo_csr_projects(tenant_id);


-- =============================================================================
-- SECTION 4: E-COMMERCE (ec_* tables)
-- =============================================================================

CREATE TABLE IF NOT EXISTS ec_channels (
  id              SERIAL PRIMARY KEY,
  tenant_id       INTEGER NOT NULL,
  name            TEXT NOT NULL,
  platform        TEXT DEFAULT 'manual',        -- amazon | flipkart | meesho | jiomart | manual | shopify
  api_key         TEXT,
  api_secret      TEXT,
  seller_id       TEXT,
  marketplace_id  TEXT,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ec_channels_tenant ON ec_channels(tenant_id);

CREATE TABLE IF NOT EXISTS ec_orders (
  id                SERIAL PRIMARY KEY,
  tenant_id         INTEGER NOT NULL,
  order_number      TEXT NOT NULL,
  channel_id        INTEGER REFERENCES ec_channels(id),
  channel_order_id  TEXT,
  customer_name     TEXT NOT NULL,
  customer_phone    TEXT,
  customer_email    TEXT,
  shipping_address  TEXT,
  order_date        DATE,
  total_amount      NUMERIC(14,2) DEFAULT 0,
  shipping_amount   NUMERIC(14,2) DEFAULT 0,
  commission_amount NUMERIC(14,2) DEFAULT 0,
  payment_method    TEXT DEFAULT 'prepaid',     -- prepaid | cod
  status            TEXT DEFAULT 'pending',     -- pending | confirmed | packed | shipped | delivered | cancelled | returned
  fulfilment_status TEXT DEFAULT 'unfulfilled',
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ec_orders_tenant  ON ec_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ec_orders_channel ON ec_orders(channel_id);

CREATE TABLE IF NOT EXISTS ec_order_items (
  id             SERIAL PRIMARY KEY,
  order_id       INTEGER NOT NULL REFERENCES ec_orders(id) ON DELETE CASCADE,
  listing_id     INTEGER,
  sku            TEXT,
  product_name   TEXT NOT NULL,
  quantity       INTEGER DEFAULT 1,
  mrp            NUMERIC(14,2) DEFAULT 0,
  selling_price  NUMERIC(14,2) DEFAULT 0,
  discount       NUMERIC(14,2) DEFAULT 0,
  amount         NUMERIC(14,2) DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_ec_order_items_order ON ec_order_items(order_id);

CREATE TABLE IF NOT EXISTS ec_listings (
  id            SERIAL PRIMARY KEY,
  tenant_id     INTEGER NOT NULL,
  channel_id    INTEGER REFERENCES ec_channels(id),
  sku           TEXT,
  product_name  TEXT NOT NULL,
  category      TEXT,
  mrp           NUMERIC(14,2) DEFAULT 0,
  selling_price NUMERIC(14,2) DEFAULT 0,
  stock_qty     INTEGER DEFAULT 0,
  listing_url   TEXT,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ec_listings_tenant ON ec_listings(tenant_id);

CREATE TABLE IF NOT EXISTS ec_returns (
  id              SERIAL PRIMARY KEY,
  tenant_id       INTEGER NOT NULL,
  return_number   TEXT,
  order_id        INTEGER REFERENCES ec_orders(id),
  return_type     TEXT DEFAULT 'return',        -- return | exchange | refund
  reason          TEXT,
  amount          NUMERIC(14,2) DEFAULT 0,
  status          TEXT DEFAULT 'pending',       -- pending | approved | rejected | completed
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ec_returns_tenant ON ec_returns(tenant_id);

CREATE TABLE IF NOT EXISTS ec_settlements (
  id                  SERIAL PRIMARY KEY,
  tenant_id           INTEGER NOT NULL,
  settlement_number   TEXT,
  channel_id          INTEGER REFERENCES ec_channels(id),
  settlement_date     DATE,
  period_from         DATE,
  period_to           DATE,
  gross_amount        NUMERIC(14,2) DEFAULT 0,
  commission          NUMERIC(14,2) DEFAULT 0,
  tds                 NUMERIC(14,2) DEFAULT 0,
  other_deductions    NUMERIC(14,2) DEFAULT 0,
  net_amount          NUMERIC(14,2) DEFAULT 0,
  utr_number          TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ec_settlements_tenant ON ec_settlements(tenant_id);

CREATE TABLE IF NOT EXISTS ec_inventory_sync (
  id          SERIAL PRIMARY KEY,
  tenant_id   INTEGER NOT NULL,
  channel_id  INTEGER REFERENCES ec_channels(id),
  listing_id  INTEGER,
  sku         TEXT,
  qty_before  INTEGER DEFAULT 0,
  qty_after   INTEGER DEFAULT 0,
  sync_type   TEXT DEFAULT 'manual',
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ec_inventory_sync_tenant ON ec_inventory_sync(tenant_id);

CREATE TABLE IF NOT EXISTS ecom_shipments (
  id              SERIAL PRIMARY KEY,
  tenant_id       INTEGER NOT NULL,
  shipment_number TEXT,
  order_id        INTEGER REFERENCES ec_orders(id),
  courier         TEXT,
  awb_number      TEXT,
  weight_kg       NUMERIC(8,3),
  dimensions      TEXT,
  status          TEXT DEFAULT 'pending',       -- pending | dispatched | in_transit | delivered | returned
  dispatched_at   TIMESTAMPTZ,
  delivered_at    TIMESTAMPTZ,
  tracking_url    TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ecom_shipments_tenant ON ecom_shipments(tenant_id);


-- =============================================================================
-- SECTION 5: RETAIL / POS EXTRAS
-- =============================================================================

-- pos_counters, pos_shifts, pos_bills may already exist from Phase 6; guard only
CREATE TABLE IF NOT EXISTS pos_hardware_config (
  id            SERIAL PRIMARY KEY,
  tenant_id     INTEGER NOT NULL UNIQUE,
  scale_type    TEXT DEFAULT 'none',
  cash_drawer   BOOLEAN DEFAULT FALSE,
  pole_display  BOOLEAN DEFAULT FALSE,
  label_printer BOOLEAN DEFAULT FALSE,
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reorder_configs (
  id               SERIAL PRIMARY KEY,
  tenant_id        INTEGER NOT NULL UNIQUE,
  default_lead_days INTEGER DEFAULT 7,
  auto_create      BOOLEAN DEFAULT FALSE,
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS delivery_orders (
  id                  SERIAL PRIMARY KEY,
  tenant_id           INTEGER NOT NULL,
  bill_id             INTEGER,
  delivery_boy_name   TEXT,
  delivery_boy_phone  TEXT,
  expected_time       TIMESTAMPTZ,
  status              TEXT DEFAULT 'pending',   -- pending | dispatched | delivered | failed
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_tenant ON delivery_orders(tenant_id);

CREATE TABLE IF NOT EXISTS distributor_orders (
  id          SERIAL PRIMARY KEY,
  tenant_id   INTEGER NOT NULL,
  vendor_id   INTEGER,
  items       JSONB,
  status      TEXT DEFAULT 'draft',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_distributor_orders_tenant ON distributor_orders(tenant_id);


-- =============================================================================
-- SECTION 6: FINANCE ADVANCED
-- =============================================================================

CREATE TABLE IF NOT EXISTS finance_recurring_journals (
  id              SERIAL PRIMARY KEY,
  tenant_id       INTEGER NOT NULL,
  template_name   TEXT NOT NULL,
  description     TEXT,
  frequency       TEXT DEFAULT 'monthly',       -- daily | weekly | monthly | quarterly | yearly
  next_run_date   DATE,
  last_run_date   DATE,
  debit_account   INTEGER,
  credit_account  INTEGER,
  amount          NUMERIC(14,2) DEFAULT 0,
  narration       TEXT,
  is_active       INTEGER DEFAULT 1,
  created_by      INTEGER,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_finance_recurring_journals_tenant ON finance_recurring_journals(tenant_id);

CREATE TABLE IF NOT EXISTS finance_consolidation_groups (
  id              SERIAL PRIMARY KEY,
  tenant_id       INTEGER NOT NULL,
  group_name      TEXT NOT NULL,
  description     TEXT,
  parent_tenant_ids INTEGER[],
  currency_code   TEXT DEFAULT 'INR',
  is_active       INTEGER DEFAULT 1,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_finance_consol_tenant ON finance_consolidation_groups(tenant_id);

CREATE TABLE IF NOT EXISTS finance_zatca_submissions (
  id                SERIAL PRIMARY KEY,
  tenant_id         INTEGER NOT NULL,
  invoice_id        INTEGER,
  invoice_number    TEXT,
  submission_uuid   TEXT,
  clearance_status  TEXT DEFAULT 'pending',
  xml_payload       TEXT,
  response_data     JSONB,
  submitted_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_finance_zatca_tenant ON finance_zatca_submissions(tenant_id);


-- =============================================================================
-- SECTION 7: ANALYTICS STUDIO
-- =============================================================================

CREATE TABLE IF NOT EXISTS analytics_dashboards (
  id            SERIAL PRIMARY KEY,
  tenant_id     INTEGER NOT NULL,
  name          TEXT NOT NULL,
  description   TEXT,
  layout        JSONB,
  is_public     BOOLEAN DEFAULT FALSE,
  public_token  TEXT UNIQUE,
  created_by    INTEGER,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_analytics_dashboards_tenant ON analytics_dashboards(tenant_id);

CREATE TABLE IF NOT EXISTS analytics_widgets (
  id              SERIAL PRIMARY KEY,
  dashboard_id    INTEGER NOT NULL REFERENCES analytics_dashboards(id) ON DELETE CASCADE,
  tenant_id       INTEGER NOT NULL,
  widget_type     TEXT NOT NULL,               -- chart | kpi | table | text
  title           TEXT,
  config          JSONB,
  position_x      INTEGER DEFAULT 0,
  position_y      INTEGER DEFAULT 0,
  width           INTEGER DEFAULT 4,
  height          INTEGER DEFAULT 3,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_analytics_widgets_dashboard ON analytics_widgets(dashboard_id);


-- =============================================================================
-- END
-- =============================================================================
