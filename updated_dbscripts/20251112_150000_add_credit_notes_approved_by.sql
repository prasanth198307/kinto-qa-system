-- Migration: Add approved_by column to credit_notes table
-- Date: 2025-11-12 15:00:00
-- Description: Adds approved_by column to track who approved the credit note

-- Add approved_by column to credit_notes table
ALTER TABLE credit_notes 
ADD COLUMN IF NOT EXISTS approved_by VARCHAR;

-- Add comment for documentation
COMMENT ON COLUMN credit_notes.approved_by IS 'User ID or name of the person who approved this credit note';
