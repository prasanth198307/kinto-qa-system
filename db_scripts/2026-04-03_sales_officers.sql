-- Sales Officers Master Table
-- Run: psql -h localhost -U kinto-admin -d kinto-qa-db -f db_scripts/2026-04-03_sales_officers.sql

CREATE TABLE IF NOT EXISTS sales_officers (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL UNIQUE,
  mobile_number VARCHAR(15),
  email VARCHAR(255),
  territory VARCHAR(255),
  is_active INTEGER NOT NULL DEFAULT 1,
  record_status INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add sales_officer_id to sales_orders if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales_orders' AND column_name = 'sales_officer_id'
  ) THEN
    ALTER TABLE sales_orders ADD COLUMN sales_officer_id VARCHAR REFERENCES sales_officers(id);
  END IF;
END $$;
