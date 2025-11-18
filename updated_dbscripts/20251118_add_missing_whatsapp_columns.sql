-- Migration: Add missing columns to whatsapp_conversation_sessions table
-- Date: 2025-11-18
-- Description: Adds assignment_id and pending_photo_url columns to existing table

-- Add assignment_id column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'whatsapp_conversation_sessions' 
    AND column_name = 'assignment_id'
  ) THEN
    ALTER TABLE whatsapp_conversation_sessions 
    ADD COLUMN assignment_id VARCHAR REFERENCES checklist_assignments(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Column assignment_id added successfully';
  ELSE
    RAISE NOTICE 'Column assignment_id already exists';
  END IF;
END $$;

-- Add pending_photo_url column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'whatsapp_conversation_sessions' 
    AND column_name = 'pending_photo_url'
  ) THEN
    ALTER TABLE whatsapp_conversation_sessions 
    ADD COLUMN pending_photo_url TEXT;
    
    RAISE NOTICE 'Column pending_photo_url added successfully';
  ELSE
    RAISE NOTICE 'Column pending_photo_url already exists';
  END IF;
END $$;

-- Create index on assignment_id if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_assignment 
ON whatsapp_conversation_sessions(assignment_id);

-- Add comments
COMMENT ON COLUMN whatsapp_conversation_sessions.assignment_id IS 'Links conversation to checklist assignment';
COMMENT ON COLUMN whatsapp_conversation_sessions.pending_photo_url IS 'Photo URL when photo arrives before text answer';

-- Verify columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'whatsapp_conversation_sessions' 
AND column_name IN ('assignment_id', 'pending_photo_url');

SELECT 'Missing columns added successfully!' as status;
