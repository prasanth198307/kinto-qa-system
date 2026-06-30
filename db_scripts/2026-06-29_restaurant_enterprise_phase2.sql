-- Aggregator configs
CREATE TABLE IF NOT EXISTS aggregator_configs (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  platform VARCHAR(30) NOT NULL,
  is_enabled INTEGER DEFAULT 0,
  api_key VARCHAR(255),
  api_secret VARCHAR(255),
  restaurant_id VARCHAR(100),
  webhook_secret VARCHAR(100),
  auto_accept INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, platform)
);

-- Aggregator orders
CREATE TABLE IF NOT EXISTS aggregator_orders (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  platform VARCHAR(30) NOT NULL,
  platform_order_id VARCHAR(100),
  customer_name VARCHAR(255),
  customer_phone VARCHAR(20),
  delivery_address TEXT,
  items JSONB DEFAULT '[]',
  subtotal NUMERIC(12,2) DEFAULT 0,
  platform_commission NUMERIC(12,2) DEFAULT 0,
  gst_amount NUMERIC(12,2) DEFAULT 0,
  total_amount NUMERIC(12,2) DEFAULT 0,
  status VARCHAR(30) DEFAULT 'new',
  kot_id INTEGER,
  platform_status VARCHAR(50),
  estimated_delivery_time INTEGER,
  special_instructions TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Country tax config
CREATE TABLE IF NOT EXISTS country_tax_config (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  country VARCHAR(50) NOT NULL,
  tax_name VARCHAR(20) NOT NULL,
  tax_rate NUMERIC(5,2) NOT NULL,
  tax_number VARCHAR(50),
  invoice_prefix VARCHAR(20),
  currency VARCHAR(3) DEFAULT 'INR',
  currency_symbol VARCHAR(5) DEFAULT '₹',
  decimal_separator VARCHAR(2) DEFAULT '.',
  thousand_separator VARCHAR(2) DEFAULT ',',
  date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY',
  is_active INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, country)
);

-- Staff schedules
CREATE TABLE IF NOT EXISTS staff_schedules (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  staff_name VARCHAR(255) NOT NULL,
  staff_role VARCHAR(50),
  outlet_id INTEGER,
  schedule_date DATE NOT NULL,
  shift_start TIME NOT NULL,
  shift_end TIME NOT NULL,
  actual_start TIMESTAMP,
  actual_end TIMESTAMP,
  status VARCHAR(20) DEFAULT 'scheduled',
  tips_earned NUMERIC(10,2) DEFAULT 0,
  record_status INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Menu engineering cache
CREATE TABLE IF NOT EXISTS menu_engineering_cache (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  menu_item_id INTEGER,
  item_name TEXT,
  qty_sold INTEGER DEFAULT 0,
  revenue NUMERIC(12,2) DEFAULT 0,
  food_cost NUMERIC(12,2) DEFAULT 0,
  margin_pct NUMERIC(5,2) DEFAULT 0,
  category VARCHAR(10),
  computed_at TIMESTAMP DEFAULT NOW()
);

-- Offline KOT queue
CREATE TABLE IF NOT EXISTS offline_kot_queue (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  device_id TEXT,
  kot_data JSONB NOT NULL,
  synced_at TIMESTAMP,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);
