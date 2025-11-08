-- Migration: Change logo_url from varchar(500) to text for base64 image support
-- Date: November 8, 2025
-- Purpose: Support base64-encoded images in invoice templates (larger than 500 chars)

-- ============================================================================
-- Change logo_url column type from varchar(500) to text
-- ============================================================================

-- This change is safe and non-destructive:
-- - varchar(500) → text allows for larger strings (base64 images)
-- - Existing data is preserved during conversion
-- - text type has no length limit, perfect for base64 encoded images

ALTER TABLE invoice_templates 
ALTER COLUMN logo_url TYPE text;

-- ============================================================================
-- Verification Query
-- ============================================================================

-- Run this to verify the column type was changed:
-- SELECT column_name, data_type, character_maximum_length 
-- FROM information_schema.columns 
-- WHERE table_name = 'invoice_templates' AND column_name = 'logo_url';
-- 
-- Expected result:
-- column_name | data_type | character_maximum_length
-- ------------+-----------+-------------------------
-- logo_url    | text      | (null)

-- ============================================================================
-- Rollback (if needed)
-- ============================================================================

-- WARNING: Rolling back will truncate any base64 images longer than 500 chars!
-- Only rollback if you haven't stored any base64 images yet.

-- ROLLBACK COMMAND (uncomment to execute):
-- ALTER TABLE invoice_templates ALTER COLUMN logo_url TYPE varchar(500);

-- ============================================================================
-- Notes
-- ============================================================================

-- Why this change was needed:
-- - Base64 encoded images are typically 10KB-500KB in size
-- - When encoded, this results in strings of 13,000+ characters
-- - varchar(500) was too small, causing insert/update failures
-- - text type supports unlimited length, perfect for base64 data

-- Safety:
-- - This is a non-breaking change (varchar → text is always safe)
-- - No data loss occurs during conversion
-- - Compatible with all PostgreSQL versions
-- - No application code changes required
