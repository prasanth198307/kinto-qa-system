-- Item variations
CREATE TABLE IF NOT EXISTS menu_item_variations (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  menu_item_id INTEGER,
  variation_name TEXT NOT NULL,
  price_modifier NUMERIC(10,2) DEFAULT 0,
  sku TEXT,
  is_available BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Menu outlet sync
CREATE TABLE IF NOT EXISTS menu_outlet_sync (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  menu_item_id INTEGER,
  outlet_id INTEGER,
  synced_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, menu_item_id, outlet_id)
);

-- Central kitchen dispatches
CREATE TABLE IF NOT EXISTS central_kitchen_dispatches (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  dispatch_number TEXT,
  from_outlet_id INTEGER,
  to_outlet_id INTEGER,
  items_json JSONB DEFAULT '[]',
  notes TEXT,
  dispatch_date DATE,
  status TEXT DEFAULT 'dispatched',
  received_at TIMESTAMP,
  received_by TEXT,
  received_notes TEXT,
  received_items_json JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Customer feedback
CREATE TABLE IF NOT EXISTS restaurant_feedback (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  table_number TEXT,
  food_rating INTEGER CHECK (food_rating BETWEEN 1 AND 5),
  service_rating INTEGER CHECK (service_rating BETWEEN 1 AND 5),
  ambience_rating INTEGER CHECK (ambience_rating BETWEEN 1 AND 5),
  overall_rating INTEGER CHECK (overall_rating BETWEEN 1 AND 5),
  comment TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  kot_order_id INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- WhatsApp order messages
CREATE TABLE IF NOT EXISTS whatsapp_order_messages (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  from_number TEXT,
  raw_message JSONB DEFAULT '{}',
  status TEXT DEFAULT 'received',
  confirmed_at TIMESTAMP,
  order_details JSONB DEFAULT '{}',
  received_at TIMESTAMP DEFAULT NOW()
);

-- Credit billing columns on kot_orders
ALTER TABLE kot_orders
  ADD COLUMN IF NOT EXISTS credit_customer_name TEXT,
  ADD COLUMN IF NOT EXISTS credit_account TEXT,
  ADD COLUMN IF NOT EXISTS credit_due_date DATE,
  ADD COLUMN IF NOT EXISTS credit_notes TEXT,
  ADD COLUMN IF NOT EXISTS credit_customer_id INTEGER;
