-- Phase 12-18: New tables for Gold Live Rates, Digital Gold, CDSCO Alerts,
--   Ecommerce Marketplace Sync, Shipments, CRM Drip Campaigns, Telephony,
--   Agriculture Mandi Prices, IoT Sensors

-- ── Gold ERP ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gold_rates (
  id SERIAL PRIMARY KEY, tenant_id INT NOT NULL,
  rate_22k NUMERIC(12,2), rate_24k NUMERIC(12,2), silver_rate NUMERIC(12,2),
  source VARCHAR(50) DEFAULT 'manual',
  rate_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gold_rate_alerts (
  id SERIAL PRIMARY KEY, tenant_id INT NOT NULL,
  webhook_url TEXT,
  alert_on_change_pct NUMERIC(5,2) DEFAULT 0.5,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gold_digital_holdings (
  id SERIAL PRIMARY KEY, tenant_id INT NOT NULL,
  customer_id INT, customer_name VARCHAR(200),
  grams NUMERIC(10,4) DEFAULT 0,
  purchase_rate NUMERIC(12,2) DEFAULT 0,
  purchase_amount NUMERIC(14,2) DEFAULT 0,
  purchase_date DATE DEFAULT CURRENT_DATE,
  holding_value NUMERIC(14,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Pharmacy ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pharmacy_cdsco_alerts (
  id SERIAL PRIMARY KEY, tenant_id INT NOT NULL,
  drug_name VARCHAR(200) NOT NULL, batch_no VARCHAR(100),
  manufacturer VARCHAR(200), alert_type VARCHAR(50),
  alert_date DATE DEFAULT CURRENT_DATE,
  description TEXT, action_required TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pharmacy_prescriptions (
  id SERIAL PRIMARY KEY, tenant_id INT NOT NULL,
  prescription_no VARCHAR(100), patient_name VARCHAR(200),
  doctor_name VARCHAR(200), doctor_reg_no VARCHAR(100),
  issued_date DATE, items JSONB DEFAULT '[]',
  verified_by INT, verified_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'pending',
  notes TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── E-Commerce Marketplace ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ecom_inventory_sync (
  id SERIAL PRIMARY KEY, tenant_id INT, sku VARCHAR(100), product_name VARCHAR(300),
  available_qty INT DEFAULT 0, reserved_qty INT DEFAULT 0,
  last_synced TIMESTAMPTZ, channels_updated JSONB DEFAULT '[]',
  UNIQUE(tenant_id, sku)
);

CREATE TABLE IF NOT EXISTS ecom_shipments (
  id SERIAL PRIMARY KEY, tenant_id INT, order_id INT, provider VARCHAR(50),
  tracking_no VARCHAR(100), status VARCHAR(50), label_url TEXT,
  estimated_delivery DATE, delivered_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── CRM Drip Campaigns ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crm_drip_campaigns (
  id SERIAL PRIMARY KEY, tenant_id INT NOT NULL,
  name VARCHAR(200) NOT NULL,
  trigger_event VARCHAR(50) DEFAULT 'lead_created',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm_drip_steps (
  id SERIAL PRIMARY KEY, tenant_id INT NOT NULL,
  campaign_id INT NOT NULL, step_order INT DEFAULT 1,
  delay_days INT DEFAULT 1,
  message_type VARCHAR(20) DEFAULT 'email',
  message_template TEXT,
  subject VARCHAR(300)
);

CREATE TABLE IF NOT EXISTS crm_drip_enrollments (
  id SERIAL PRIMARY KEY, tenant_id INT NOT NULL,
  campaign_id INT NOT NULL, contact_id INT NOT NULL,
  current_step INT DEFAULT 0,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'active',
  next_send_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS crm_drip_log (
  id SERIAL PRIMARY KEY, tenant_id INT NOT NULL,
  enrollment_id INT, step_id INT,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(20), error TEXT
);

CREATE TABLE IF NOT EXISTS crm_call_logs (
  id SERIAL PRIMARY KEY, tenant_id INT NOT NULL,
  contact_id INT, agent_id INT,
  call_direction VARCHAR(10) DEFAULT 'outbound',
  phone VARCHAR(20), duration_secs INT DEFAULT 0,
  call_recording_url TEXT, call_notes TEXT,
  call_outcome VARCHAR(50),
  called_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Agriculture ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agri_mandi_prices (
  id SERIAL PRIMARY KEY, tenant_id INT,
  commodity VARCHAR(200), market_name VARCHAR(200),
  state VARCHAR(100), district VARCHAR(100),
  min_price DECIMAL(10,2), max_price DECIMAL(10,2), modal_price DECIMAL(10,2),
  arrival_date DATE, unit VARCHAR(30) DEFAULT 'Quintal',
  source VARCHAR(30) DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agri_sensor_readings (
  id SERIAL PRIMARY KEY, tenant_id INT, farm_id INT, sensor_id VARCHAR(100),
  sensor_type VARCHAR(50), value DECIMAL(10,4), unit VARCHAR(20),
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agri_produce_sales (
  id SERIAL PRIMARY KEY, tenant_id INT NOT NULL,
  sale_no VARCHAR(50), farmer_id INT, farm_id INT,
  commodity VARCHAR(200), quantity DECIMAL(12,3),
  unit VARCHAR(30) DEFAULT 'Quintal',
  sale_rate DECIMAL(10,2), sale_amount DECIMAL(14,2),
  mandi_fee DECIMAL(10,2) DEFAULT 0,
  base_amount DECIMAL(14,2),
  buyer_name VARCHAR(200), market_name VARCHAR(200),
  sale_date DATE DEFAULT CURRENT_DATE,
  payment_mode VARCHAR(50) DEFAULT 'bank_transfer',
  notes TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
);
