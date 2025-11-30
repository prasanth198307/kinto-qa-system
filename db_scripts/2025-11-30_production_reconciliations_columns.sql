-- Add missing columns to production_reconciliations table
-- Run this on your local Mac database

-- Add rejected_cases column
ALTER TABLE production_reconciliations ADD COLUMN IF NOT EXISTS rejected_cases INTEGER DEFAULT 0 NOT NULL;

-- Add empty bottle tracking columns
ALTER TABLE production_reconciliations ADD COLUMN IF NOT EXISTS empty_bottles_produced INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE production_reconciliations ADD COLUMN IF NOT EXISTS empty_bottles_used INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE production_reconciliations ADD COLUMN IF NOT EXISTS empty_bottles_pending INTEGER DEFAULT 0 NOT NULL;

-- Add edit tracking columns
ALTER TABLE production_reconciliations ADD COLUMN IF NOT EXISTS edit_count INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE production_reconciliations ADD COLUMN IF NOT EXISTS last_edited_by VARCHAR REFERENCES users(id);
ALTER TABLE production_reconciliations ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMP;

-- Verify columns were added
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'production_reconciliations' 
ORDER BY ordinal_position;
