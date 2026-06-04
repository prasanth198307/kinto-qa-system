-- Hardware terminal registry — maps physical devices to POS counters
CREATE TABLE IF NOT EXISTS pos_terminals (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  counter_name TEXT NOT NULL,
  terminal_name TEXT,
  terminal_type TEXT NOT NULL DEFAULT 'manual',  -- manual | razorpay_pos | pine_labs | ingenico | generic_http
  terminal_id TEXT,   -- hardware serial / Razorpay terminal ID
  ip_address TEXT,    -- local network IP for Pine Labs / Ingenico
  port INTEGER DEFAULT 80,
  api_key TEXT,       -- optional API key / bearer token
  merchant_id TEXT,   -- Pine Labs merchant/application ID
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS pos_terminals_tenant_idx ON pos_terminals(tenant_id);
CREATE INDEX IF NOT EXISTS pos_terminals_counter_idx ON pos_terminals(tenant_id, counter_name);

-- Extend transactions to record hardware payment refs
ALTER TABLE pos_transactions ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT;
ALTER TABLE pos_transactions ADD COLUMN IF NOT EXISTS terminal_id TEXT;
ALTER TABLE pos_transactions ADD COLUMN IF NOT EXISTS card_ref TEXT;
