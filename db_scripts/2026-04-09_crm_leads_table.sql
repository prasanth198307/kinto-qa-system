-- CRM Lead Management table
-- Creates the crm_leads table for the CRM module (Professional plan+)
-- assigned_to is varchar(36) to store user UUID (references users.id)

CREATE TABLE IF NOT EXISTS crm_leads (
  id               SERIAL PRIMARY KEY,
  tenant_id        INTEGER NOT NULL,
  lead_no          VARCHAR(30),
  name             VARCHAR(150) NOT NULL,
  company          VARCHAR(150),
  phone            VARCHAR(20),
  email            VARCHAR(150),
  source           VARCHAR(50),
  product_interest TEXT,
  assigned_to      VARCHAR(36),
  status           VARCHAR(30) DEFAULT 'new',
  notes            TEXT,
  next_follow_up   DATE,
  record_status    INTEGER DEFAULT 1,
  created_at       TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at       TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- If the table existed before with assigned_to as integer, fix it
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_leads' AND column_name = 'assigned_to'
      AND data_type = 'integer'
  ) THEN
    ALTER TABLE crm_leads ALTER COLUMN assigned_to TYPE VARCHAR(36) USING assigned_to::TEXT;
    RAISE NOTICE 'Fixed crm_leads.assigned_to from integer to varchar(36)';
  END IF;
END $$;
