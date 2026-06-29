-- Gift cards
CREATE TABLE IF NOT EXISTS gift_cards (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  card_number TEXT NOT NULL,
  original_amount NUMERIC(10,2) DEFAULT 0,
  current_balance NUMERIC(10,2) DEFAULT 0,
  purchaser_name TEXT,
  purchaser_phone TEXT,
  issued_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS gift_cards_number_idx ON gift_cards(tenant_id, card_number);

-- Gift card transactions
CREATE TABLE IF NOT EXISTS gift_card_transactions (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  card_number TEXT,
  transaction_type TEXT,
  amount NUMERIC(10,2),
  kot_order_id INTEGER,
  balance_after NUMERIC(10,2),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Franchise config
CREATE TABLE IF NOT EXISTS franchise_config (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  royalty_pct NUMERIC(5,2) DEFAULT 5.0,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Outlet currency settings
ALTER TABLE restaurant_outlets
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS currency_symbol TEXT DEFAULT '₹',
  ADD COLUMN IF NOT EXISTS tax_type TEXT DEFAULT 'GST',
  ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5,2) DEFAULT 5.0,
  ADD COLUMN IF NOT EXISTS tax_number TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'India',
  ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS is_cloud_kitchen BOOLEAN DEFAULT false;

-- Menu item translations
CREATE TABLE IF NOT EXISTS menu_item_translations (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  menu_item_id INTEGER,
  language_code TEXT,
  translated_name TEXT,
  translated_description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, menu_item_id, language_code)
);

-- WhatsApp orders
CREATE TABLE IF NOT EXISTS whatsapp_orders (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  phone TEXT,
  raw_message TEXT,
  status TEXT DEFAULT 'pending',
  kot_id INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
