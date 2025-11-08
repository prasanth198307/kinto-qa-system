-- Migration: Change all image/photo URL columns from varchar to text for base64 support
-- Date: November 8, 2025
-- Purpose: Support base64-encoded images across all tables (users, tasks, PM executions, invoices)

-- ============================================================================
-- CHANGES SUMMARY
-- ============================================================================
-- 1. users.profile_image_url: varchar → text (profile pictures)
-- 2. submission_tasks.photo_url: varchar(500) → text (QA checklist photos)
-- 3. pm_execution_tasks.photo_url: varchar(500) → text (PM task photos)
-- 4. invoice_templates.logo_url: varchar(500) → text (company logos)

-- ============================================================================
-- WHY THESE CHANGES ARE NEEDED
-- ============================================================================
-- Base64 encoded images are typically 10KB-500KB in size
-- When encoded, this results in strings of 13,000+ characters
-- varchar(500) or even unlimited varchar is too small for base64 data
-- text type supports unlimited length and is optimized for large strings

-- ============================================================================
-- 1. USERS TABLE - Profile Images
-- ============================================================================

-- Change profile_image_url to support base64 profile pictures
ALTER TABLE users 
ALTER COLUMN profile_image_url TYPE text;

-- ============================================================================
-- 2. SUBMISSION TASKS TABLE - QA Checklist Photos
-- ============================================================================

-- Change photo_url to support base64 task completion photos
ALTER TABLE submission_tasks 
ALTER COLUMN photo_url TYPE text;

-- ============================================================================
-- 3. PM EXECUTION TASKS TABLE - Preventive Maintenance Photos
-- ============================================================================

-- Change photo_url to support base64 PM task completion photos
ALTER TABLE pm_execution_tasks 
ALTER COLUMN photo_url TYPE text;

-- ============================================================================
-- 4. INVOICE TEMPLATES TABLE - Company Logos
-- ============================================================================

-- Change logo_url to support base64 company logos
ALTER TABLE invoice_templates 
ALTER COLUMN logo_url TYPE text;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Run these queries to verify all columns were changed successfully:

-- Verify all 4 columns are now type 'text':
SELECT 
  table_name, 
  column_name, 
  data_type, 
  character_maximum_length 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND column_name IN ('profile_image_url', 'photo_url', 'logo_url')
ORDER BY table_name, column_name;

-- Expected result (all should show data_type = 'text'):
-- table_name            | column_name        | data_type | character_maximum_length
-- ---------------------+--------------------+-----------+-------------------------
-- invoice_templates    | logo_url           | text      | (null)
-- pm_execution_tasks   | photo_url          | text      | (null)
-- submission_tasks     | photo_url          | text      | (null)
-- users                | profile_image_url  | text      | (null)

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================

-- WARNING: Rolling back will truncate any base64 images longer than 500 chars!
-- Only rollback if you haven't stored any base64 images yet.

-- ROLLBACK COMMANDS (uncomment to execute):
-- ALTER TABLE users ALTER COLUMN profile_image_url TYPE varchar;
-- ALTER TABLE submission_tasks ALTER COLUMN photo_url TYPE varchar(500);
-- ALTER TABLE pm_execution_tasks ALTER COLUMN photo_url TYPE varchar(500);
-- ALTER TABLE invoice_templates ALTER COLUMN logo_url TYPE varchar(500);

-- ============================================================================
-- NOTES
-- ============================================================================

-- Safety:
-- - These are non-breaking changes (varchar → text is always safe)
-- - No data loss occurs during conversion
-- - Existing data is preserved
-- - Compatible with all PostgreSQL versions
-- - No application code changes required

-- Performance:
-- - text type is optimized for large strings
-- - PostgreSQL handles text columns efficiently
-- - No performance degradation expected

-- Storage:
-- - Typical base64 image sizes:
--   * Small icon (16x16): ~1KB → ~1,300 chars
--   * Avatar (100x100): ~10KB → ~13,000 chars
--   * Company logo (500x500): ~100KB → ~130,000 chars
--   * High-res photo (1920x1080): ~500KB → ~650,000 chars
