-- Update Notification Config: Migrate from Twilio to Meta WhatsApp Cloud API
-- Created: 2025-11-10
-- Purpose: Replace Twilio WhatsApp fields with Meta Business Cloud API fields

-- Add Meta WhatsApp Cloud API columns
ALTER TABLE notification_config 
ADD COLUMN IF NOT EXISTS meta_phone_number_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS meta_access_token TEXT,
ADD COLUMN IF NOT EXISTS meta_verify_token VARCHAR(255);

-- Drop old Twilio column (only if exists and no data needs migration)
-- ALTER TABLE notification_config DROP COLUMN IF EXISTS twilio_phone_number;
-- Note: Comment out above line if you want to preserve Twilio data temporarily

COMMENT ON COLUMN notification_config.meta_phone_number_id IS 'Meta WhatsApp Phone Number ID from Business Manager';
COMMENT ON COLUMN notification_config.meta_access_token IS 'Meta WhatsApp permanent access token';
COMMENT ON COLUMN notification_config.meta_verify_token IS 'Webhook verification token (required for security)';
