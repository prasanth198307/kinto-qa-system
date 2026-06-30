-- Task 18, 19, 29, 30: Restaurant CRM/MIS Integration
-- ADDITIVE ONLY — nullable FK columns, new tables. Existing tenants unaffected.

-- CRM contact link for restaurant customers (Task 18)
ALTER TABLE restaurant_customers ADD COLUMN IF NOT EXISTS crm_contact_id INTEGER;
-- CRM contact link for reservations (Task 30)
ALTER TABLE restaurant_reservations ADD COLUMN IF NOT EXISTS crm_contact_id INTEGER;

CREATE INDEX IF NOT EXISTS idx_restaurant_customers_crm ON restaurant_customers(crm_contact_id) WHERE crm_contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_restaurant_reservations_crm ON restaurant_reservations(crm_contact_id) WHERE crm_contact_id IS NOT NULL;

-- MIS daily sales table — shared across all ERP modules (Task 19)
CREATE TABLE IF NOT EXISTS mis_daily_sales (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  sale_date DATE NOT NULL,
  revenue DECIMAL(12,2) DEFAULT 0,
  tax_collected DECIMAL(12,2) DEFAULT 0,
  order_count INTEGER DEFAULT 0,
  avg_order_value DECIMAL(10,2) DEFAULT 0,
  source_module VARCHAR(30) DEFAULT 'restaurant',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, sale_date, source_module)
);

-- CRM calendar events (Task 30)
CREATE TABLE IF NOT EXISTS crm_calendar_events (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  contact_id INTEGER,
  title VARCHAR(300),
  event_date DATE,
  event_time TIME,
  duration_minutes INTEGER DEFAULT 60,
  event_type VARCHAR(50),
  notes TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

-- CRM campaigns (Task 29)
CREATE TABLE IF NOT EXISTS crm_campaigns (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  name VARCHAR(200),
  message TEXT,
  status VARCHAR(20) DEFAULT 'draft',
  contact_count INTEGER DEFAULT 0,
  source VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm_campaign_contacts (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER NOT NULL,
  contact_id INTEGER NOT NULL,
  tenant_id INTEGER NOT NULL,
  UNIQUE(campaign_id, contact_id)
);
