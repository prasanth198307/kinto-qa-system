-- Migration: Add approved_by column to credit_notes table (FIXED)
-- Date: 2025-11-12 15:00:00
-- Description: Adds approved_by column to track who approved the credit note
-- FIX: Checks if table exists first, safe to run in any order

-- Only add column if table exists
DO $$ 
BEGIN
  -- Check if credit_notes table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'credit_notes'
  ) THEN
    -- Add approved_by column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'credit_notes' AND column_name = 'approved_by'
    ) THEN
      ALTER TABLE credit_notes ADD COLUMN approved_by VARCHAR;
      RAISE NOTICE 'Added approved_by column to credit_notes table';
    ELSE
      RAISE NOTICE 'Column approved_by already exists in credit_notes table';
    END IF;
  ELSE
    RAISE NOTICE 'Table credit_notes does not exist yet - skipping migration (will run after table is created)';
  END IF;
END $$;

-- Add comment for documentation (only if table exists)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'credit_notes'
  ) THEN
    COMMENT ON COLUMN credit_notes.approved_by IS 'User ID or name of the person who approved this credit note';
  END IF;
END $$;
