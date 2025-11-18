-- Migration: Add photo and verification columns to submission_tasks table
-- Date: 2025-11-18
-- Description: Adds columns needed for WhatsApp photo uploads and task verification

-- Add photo_url column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'submission_tasks' 
    AND column_name = 'photo_url'
  ) THEN
    ALTER TABLE submission_tasks 
    ADD COLUMN photo_url VARCHAR(500);
    
    RAISE NOTICE 'Column photo_url added successfully';
  ELSE
    RAISE NOTICE 'Column photo_url already exists';
  END IF;
END $$;

-- Add task_name column if it doesn't exist (for WhatsApp submissions without template reference)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'submission_tasks' 
    AND column_name = 'task_name'
  ) THEN
    ALTER TABLE submission_tasks 
    ADD COLUMN task_name VARCHAR(255);
    
    RAISE NOTICE 'Column task_name added successfully';
  ELSE
    RAISE NOTICE 'Column task_name already exists';
  END IF;
END $$;

-- Add result column if it doesn't exist (OK, NOK, NA)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'submission_tasks' 
    AND column_name = 'result'
  ) THEN
    ALTER TABLE submission_tasks 
    ADD COLUMN result VARCHAR(10);
    
    RAISE NOTICE 'Column result added successfully';
  ELSE
    RAISE NOTICE 'Column result already exists';
  END IF;
END $$;

-- Add remarks column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'submission_tasks' 
    AND column_name = 'remarks'
  ) THEN
    ALTER TABLE submission_tasks 
    ADD COLUMN remarks TEXT;
    
    RAISE NOTICE 'Column remarks added successfully';
  ELSE
    RAISE NOTICE 'Column remarks already exists';
  END IF;
END $$;

-- Add verified_by_name column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'submission_tasks' 
    AND column_name = 'verified_by_name'
  ) THEN
    ALTER TABLE submission_tasks 
    ADD COLUMN verified_by_name VARCHAR(255);
    
    RAISE NOTICE 'Column verified_by_name added successfully';
  ELSE
    RAISE NOTICE 'Column verified_by_name already exists';
  END IF;
END $$;

-- Add verified_signature column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'submission_tasks' 
    AND column_name = 'verified_signature'
  ) THEN
    ALTER TABLE submission_tasks 
    ADD COLUMN verified_signature TEXT;
    
    RAISE NOTICE 'Column verified_signature added successfully';
  ELSE
    RAISE NOTICE 'Column verified_signature already exists';
  END IF;
END $$;

-- Add comments
COMMENT ON COLUMN submission_tasks.photo_url IS 'URL to photo uploaded by operator (especially for WhatsApp submissions)';
COMMENT ON COLUMN submission_tasks.task_name IS 'Task name (used when submission is not linked to template)';
COMMENT ON COLUMN submission_tasks.result IS 'Task result: OK, NOK, or NA';
COMMENT ON COLUMN submission_tasks.remarks IS 'Operator remarks for the task';
COMMENT ON COLUMN submission_tasks.verified_by_name IS 'Name of reviewer who verified the task';
COMMENT ON COLUMN submission_tasks.verified_signature IS 'Digital signature of reviewer';

-- Verify columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'submission_tasks' 
AND column_name IN ('photo_url', 'task_name', 'result', 'remarks', 'verified_by_name', 'verified_signature')
ORDER BY column_name;

SELECT 'Submission tasks columns added successfully!' as status;
