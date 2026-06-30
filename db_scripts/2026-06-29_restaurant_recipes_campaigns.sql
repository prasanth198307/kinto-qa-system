CREATE TABLE IF NOT EXISTS restaurant_recipes (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  menu_item_id INTEGER NOT NULL,
  yield_qty DECIMAL(10,3) DEFAULT 1,
  yield_unit VARCHAR(50) DEFAULT 'portion',
  prep_time_minutes INTEGER,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, menu_item_id)
);

CREATE TABLE IF NOT EXISTS restaurant_recipe_ingredients (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  recipe_id INTEGER NOT NULL REFERENCES restaurant_recipes(id) ON DELETE CASCADE,
  raw_material_id INTEGER,
  raw_material_name VARCHAR(200) NOT NULL,
  quantity DECIMAL(10,3) NOT NULL,
  unit VARCHAR(50),
  cost_per_unit DECIMAL(10,2) DEFAULT 0
);

CREATE TABLE IF NOT EXISTS restaurant_campaigns (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  name VARCHAR(200) NOT NULL,
  segment VARCHAR(50),
  channel VARCHAR(20),
  message TEXT,
  scheduled_at TIMESTAMP,
  status VARCHAR(20) DEFAULT 'draft',
  customer_count INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
