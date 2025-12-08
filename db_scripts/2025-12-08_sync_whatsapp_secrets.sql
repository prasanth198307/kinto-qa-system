-- Sync WhatsApp Secrets from Environment to Database
-- Date: 2025-12-08
-- Purpose: Document the sync of WhatsApp credentials from Replit Secrets to notification_config table

-- NOTE: This script documents what was synced automatically by the server on startup.
-- The actual values come from Replit Secrets (environment variables):
--   - WHATSAPP_PHONE_NUMBER_ID -> meta_phone_number_id
--   - WHATSAPP_ACCESS_TOKEN -> meta_access_token  
--   - WHATSAPP_VERIFY_TOKEN -> meta_verify_token

-- The sync is performed automatically by server/index.ts on startup if:
-- 1. The database fields are empty (NULL)
-- 2. The corresponding environment variables are set

-- To verify the sync was successful:
SELECT 
    id,
    email_enabled,
    email_provider,
    sender_email,
    whatsapp_enabled,
    CASE WHEN meta_phone_number_id IS NOT NULL THEN 'SET' ELSE 'NOT SET' END as phone_number_id_status,
    CASE WHEN meta_access_token IS NOT NULL THEN 'SET' ELSE 'NOT SET' END as access_token_status,
    CASE WHEN meta_verify_token IS NOT NULL THEN 'SET' ELSE 'NOT SET' END as verify_token_status,
    test_mode,
    updated_at
FROM notification_config 
WHERE record_status = 1;

-- To manually clear the database values and re-trigger sync on next restart:
-- UPDATE notification_config SET 
--     meta_phone_number_id = NULL,
--     meta_access_token = NULL,
--     meta_verify_token = NULL,
--     updated_at = NOW()
-- WHERE record_status = 1;

-- To disable test mode and enable real WhatsApp sending:
-- UPDATE notification_config SET 
--     test_mode = 0,
--     updated_at = NOW()
-- WHERE record_status = 1;

-- To enable test mode (console logging only):
-- UPDATE notification_config SET 
--     test_mode = 1,
--     updated_at = NOW()
-- WHERE record_status = 1;
