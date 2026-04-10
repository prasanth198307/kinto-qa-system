-- Add missing columns to manual_credit_note_requests
-- notes and processing_notes were added in schema but missing on older installs
-- request_number added as nullable (OCI had it as NOT NULL — drop that constraint)
ALTER TABLE manual_credit_note_requests
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS processing_notes TEXT,
  ADD COLUMN IF NOT EXISTS request_number VARCHAR(50);

-- Drop NOT NULL on request_number if it was defined that way on OCI
-- (idempotent — safe if column is already nullable)
ALTER TABLE manual_credit_note_requests
  ALTER COLUMN request_number DROP NOT NULL;
