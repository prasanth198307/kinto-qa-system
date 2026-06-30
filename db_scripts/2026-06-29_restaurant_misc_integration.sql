-- Task 20: tax config link
-- (country_tax_config already exists from previous migration)

-- Task 21: outlet → branch link
ALTER TABLE restaurant_outlets ADD COLUMN IF NOT EXISTS branch_id INTEGER;
ALTER TABLE restaurant_outlets ADD COLUMN IF NOT EXISTS cost_center_id INTEGER;

-- Task 23: steward assignments
CREATE TABLE IF NOT EXISTS restaurant_staff_assignments (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  outlet_id INTEGER,
  role VARCHAR(50) DEFAULT 'steward',
  assigned_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, user_id, outlet_id)
);

-- Task 27: invoice link to KOT
ALTER TABLE kot_orders ADD COLUMN IF NOT EXISTS invoice_id INTEGER;

-- Task 31: approval requests
CREATE TABLE IF NOT EXISTS restaurant_approval_requests (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  request_type VARCHAR(50) NOT NULL,
  reference_id INTEGER,
  requested_by VARCHAR(100),
  requested_by_user_id INTEGER,
  amount DECIMAL(10,2) DEFAULT 0,
  reason TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  approved_by VARCHAR(100),
  approved_at TIMESTAMP,
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Task 32: audit log
CREATE TABLE IF NOT EXISTS restaurant_audit_log (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id INTEGER,
  old_value TEXT,
  new_value TEXT,
  performed_by VARCHAR(100),
  user_id INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_restaurant_audit_tenant ON restaurant_audit_log(tenant_id, created_at DESC);

-- Task 24: Hotel shared integration
ALTER TABLE hotel_reservations ADD COLUMN IF NOT EXISTS crm_contact_id INTEGER;
CREATE TABLE IF NOT EXISTS hotel_audit_log (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id INTEGER,
  performed_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Task 24: Healthcare shared integration
CREATE TABLE IF NOT EXISTS healthcare_audit_log (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id INTEGER,
  performed_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

SELECT 'restaurant misc integration complete' as result;
