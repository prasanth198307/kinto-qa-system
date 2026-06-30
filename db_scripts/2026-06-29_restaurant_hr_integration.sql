-- Task 15: Restaurant Staff → Shared HR Module
-- Link restaurant staff schedules to shared HR employees (nullable, additive)
ALTER TABLE staff_schedules ADD COLUMN IF NOT EXISTS employee_id INTEGER REFERENCES hr_employees(id) ON DELETE SET NULL;

-- Restaurant-specific roles that can be HR employees
CREATE TABLE IF NOT EXISTS restaurant_staff_profiles (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  employee_id INTEGER REFERENCES hr_employees(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL, -- waiter, chef, cashier, manager, delivery_boy
  outlet_id INTEGER,
  tip_share_pct DECIMAL(5,2) DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, employee_id)
);
CREATE INDEX IF NOT EXISTS idx_staff_profiles_tenant ON restaurant_staff_profiles(tenant_id);

-- Task 16: Restaurant Ingredient Suppliers → Shared Vendor Master
-- vendor_id links raw_material_purchases to shared vendors table (nullable, additive)
ALTER TABLE raw_material_purchases ADD COLUMN IF NOT EXISTS vendor_id INTEGER;

-- Task 17: Restaurant Raw Material → Shared Products Catalog
-- Link menu items to raw_materials/products record for inventory sync (nullable, additive)
ALTER TABLE restaurant_menu_items ADD COLUMN IF NOT EXISTS raw_material_id INTEGER;

CREATE TABLE IF NOT EXISTS restaurant_raw_material_stock (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  raw_material_id INTEGER,
  raw_material_name VARCHAR(200) NOT NULL,
  unit VARCHAR(20) DEFAULT 'kg',
  current_stock DECIMAL(12,3) DEFAULT 0,
  min_stock DECIMAL(12,3) DEFAULT 0,
  last_updated TIMESTAMP DEFAULT NOW(),
  outlet_id INTEGER,
  UNIQUE(tenant_id, raw_material_name, outlet_id)
);

-- Task 26: Steward/Waiter → KOT Attribution & Performance
-- Link KOT orders to waiter HR employee (nullable, additive)
ALTER TABLE kot_orders ADD COLUMN IF NOT EXISTS waiter_employee_id INTEGER;
ALTER TABLE kot_orders ADD COLUMN IF NOT EXISTS waiter_name VARCHAR(100);
