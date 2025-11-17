-- ============================================================================
-- KINTO Smart Ops - Database Migration Scripts
-- ============================================================================
-- File: updated_dbscripts.sql
-- Purpose: Track all database schema changes for production deployment
-- Last Updated: November 15, 2025
-- ============================================================================

-- ============================================================================
-- Migration 1: Add Dynamic SMTP Configuration Support
-- Date: November 15, 2025
-- Description: Add columns to notification_config table to support dynamic
--              email provider selection (SendGrid or Office 365 SMTP) from UI
-- ============================================================================

-- Email Provider Selection (SendGrid or Office365)
ALTER TABLE notification_config 
ADD COLUMN IF NOT EXISTS email_provider VARCHAR(50) DEFAULT 'SendGrid';

-- Office 365 SMTP Settings
ALTER TABLE notification_config 
ADD COLUMN IF NOT EXISTS smtp_host VARCHAR(255);

ALTER TABLE notification_config 
ADD COLUMN IF NOT EXISTS smtp_port INTEGER DEFAULT 587;

ALTER TABLE notification_config 
ADD COLUMN IF NOT EXISTS smtp_user VARCHAR(255);

ALTER TABLE notification_config 
ADD COLUMN IF NOT EXISTS smtp_password TEXT;

ALTER TABLE notification_config 
ADD COLUMN IF NOT EXISTS smtp_secure INTEGER DEFAULT 0;

-- SendGrid API Key (moved from env to database for centralized management)
ALTER TABLE notification_config 
ADD COLUMN IF NOT EXISTS sendgrid_api_key TEXT;

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Verify new columns were added successfully
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'notification_config' 
  AND column_name IN (
    'email_provider', 
    'smtp_host', 
    'smtp_port', 
    'smtp_user', 
    'smtp_password', 
    'smtp_secure', 
    'sendgrid_api_key'
  )
ORDER BY column_name;

-- ============================================================================
-- Notes for Production Deployment
-- ============================================================================
-- 1. Run these scripts on production database (Mac)
-- 2. All ALTER statements use "IF NOT EXISTS" to prevent errors if re-run
-- 3. After migration, update Drizzle schema in shared/schema.ts
-- 4. Run: npm run db:push --force (if needed to sync schema)
-- 5. Rebuild application: npm run build
-- 6. Restart PM2: pm2 restart kinto-backend
-- ============================================================================

-- ============================================================================
-- Rollback Script (if needed)
-- ============================================================================
-- Uncomment below to rollback this migration

-- ALTER TABLE notification_config DROP COLUMN IF EXISTS email_provider;
-- ALTER TABLE notification_config DROP COLUMN IF EXISTS smtp_host;
-- ALTER TABLE notification_config DROP COLUMN IF EXISTS smtp_port;
-- ALTER TABLE notification_config DROP COLUMN IF EXISTS smtp_user;
-- ALTER TABLE notification_config DROP COLUMN IF EXISTS smtp_password;
-- ALTER TABLE notification_config DROP COLUMN IF EXISTS smtp_secure;
-- ALTER TABLE notification_config DROP COLUMN IF EXISTS sendgrid_api_key;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
