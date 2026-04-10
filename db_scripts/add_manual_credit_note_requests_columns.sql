-- Add all missing columns to manual_credit_note_requests
-- Safe to run multiple times (IF NOT EXISTS / DROP NOT NULL is idempotent)
ALTER TABLE manual_credit_note_requests
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS processing_notes TEXT,
  ADD COLUMN IF NOT EXISTS request_number VARCHAR(50),
  ADD COLUMN IF NOT EXISTS invoice_id VARCHAR,
  ADD COLUMN IF NOT EXISTS return_number VARCHAR(100),
  ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);

-- Drop NOT NULL on any column OCI may have defined that way
ALTER TABLE manual_credit_note_requests
  ALTER COLUMN request_number DROP NOT NULL,
  ALTER COLUMN invoice_id DROP NOT NULL,
  ALTER COLUMN return_number DROP NOT NULL,
  ALTER COLUMN customer_name DROP NOT NULL;
