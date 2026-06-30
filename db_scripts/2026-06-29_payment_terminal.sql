-- Task 13: Payment Terminal Integration — create payment_terminal_logs and tenant_configs tables
CREATE TABLE IF NOT EXISTS payment_terminal_logs (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  kot_id INTEGER,
  terminal_type VARCHAR(20),
  amount DECIMAL(10,2),
  reference_id VARCHAR(100),
  status VARCHAR(30) DEFAULT 'initiated',
  payment_id VARCHAR(100),
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tenant_configs (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  config_key VARCHAR(100) NOT NULL,
  config_value TEXT,
  UNIQUE(tenant_id, config_key)
);
