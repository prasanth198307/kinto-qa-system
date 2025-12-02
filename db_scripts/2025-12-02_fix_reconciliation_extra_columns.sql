-- Migration: Fix production_reconciliations extra columns
-- Your local database has columns that don't exist in the Drizzle schema
-- This script removes the NOT NULL constraint or drops the extra columns

-- First, let's see what columns your database has
-- Run this query first to see all columns:
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns 
-- WHERE table_name = 'production_reconciliations' 
-- ORDER BY ordinal_position;

-- Option 1: Make extra columns nullable (safer - preserves data)
ALTER TABLE production_reconciliations 
  ALTER COLUMN total_issued_quantity DROP NOT NULL;

-- If there are other columns causing issues, make them nullable too:
-- Common extra columns that might exist:
ALTER TABLE production_reconciliations 
  ALTER COLUMN total_used_quantity DROP NOT NULL;

ALTER TABLE production_reconciliations 
  ALTER COLUMN total_returned_quantity DROP NOT NULL;

ALTER TABLE production_reconciliations 
  ALTER COLUMN total_pending_quantity DROP NOT NULL;

ALTER TABLE production_reconciliations 
  ALTER COLUMN variance_quantity DROP NOT NULL;

ALTER TABLE production_reconciliations 
  ALTER COLUMN variance_percentage DROP NOT NULL;

-- Option 2 (alternative): Drop the extra columns entirely
-- Only run these if you want to remove the columns completely:
-- ALTER TABLE production_reconciliations DROP COLUMN IF EXISTS total_issued_quantity;
-- ALTER TABLE production_reconciliations DROP COLUMN IF EXISTS total_used_quantity;
-- ALTER TABLE production_reconciliations DROP COLUMN IF EXISTS total_returned_quantity;
-- ALTER TABLE production_reconciliations DROP COLUMN IF EXISTS total_pending_quantity;
-- ALTER TABLE production_reconciliations DROP COLUMN IF EXISTS variance_quantity;
-- ALTER TABLE production_reconciliations DROP COLUMN IF EXISTS variance_percentage;

-- Verify columns after running
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'production_reconciliations' 
ORDER BY ordinal_position;
