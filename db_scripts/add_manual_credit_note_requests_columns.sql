-- Add missing notes columns to manual_credit_note_requests
-- notes and processing_notes were added in schema but missing on older OCI installs
ALTER TABLE manual_credit_note_requests
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS processing_notes TEXT;
