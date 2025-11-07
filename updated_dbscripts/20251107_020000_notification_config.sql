-- =====================================================
-- Notification Configuration System
-- Created: November 7, 2025
-- Purpose: Create centralized notification configuration for SendGrid (Email) and Twilio (WhatsApp)
-- Dependencies: None (can be run independently)
-- =====================================================

-- Create notification_config table for centralized notification settings
CREATE TABLE IF NOT EXISTS notification_config (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Email Settings (SendGrid)
  email_enabled INTEGER NOT NULL DEFAULT 0,           -- 1 = enabled, 0 = disabled
  sender_email VARCHAR(255),                           -- Verified sender email in SendGrid (e.g., qa@kinto.com)
  sender_name VARCHAR(255),                            -- Sender name for emails (e.g., KINTO QA)
  
  -- WhatsApp Settings (Twilio)
  whatsapp_enabled INTEGER NOT NULL DEFAULT 0,        -- 1 = enabled, 0 = disabled
  twilio_phone_number VARCHAR(50),                     -- Twilio WhatsApp number (e.g., whatsapp:+14155238886)
  
  -- General Settings
  test_mode INTEGER NOT NULL DEFAULT 1,                -- 1 = console logging only, 0 = real sending
  
  -- Standard Tracking Fields
  record_status INTEGER NOT NULL DEFAULT 1,            -- 1 = active, 0 = deleted
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE notification_config IS 'Centralized notification configuration for email (SendGrid) and WhatsApp (Twilio)';
COMMENT ON COLUMN notification_config.email_enabled IS 'Enable/disable email notifications: 1 = enabled, 0 = disabled';
COMMENT ON COLUMN notification_config.sender_email IS 'Verified sender email address in SendGrid';
COMMENT ON COLUMN notification_config.sender_name IS 'Display name for outgoing notifications';
COMMENT ON COLUMN notification_config.whatsapp_enabled IS 'Enable/disable WhatsApp notifications: 1 = enabled, 0 = disabled';
COMMENT ON COLUMN notification_config.twilio_phone_number IS 'Twilio WhatsApp-enabled phone number (format: whatsapp:+14155238886)';
COMMENT ON COLUMN notification_config.test_mode IS 'Test mode: 1 = console logging only, 0 = real notifications sent';
COMMENT ON COLUMN notification_config.record_status IS '1 = active, 0 = deleted';

-- Insert default configuration (Test mode enabled for safety)
INSERT INTO notification_config (
  id, 
  email_enabled, 
  whatsapp_enabled, 
  test_mode, 
  sender_email, 
  sender_name, 
  twilio_phone_number, 
  record_status
)
VALUES (
  '1', 
  1, 
  1, 
  1, 
  'qa@kinto.com', 
  'KINTO QA', 
  'whatsapp:+14155238886', 
  1
)
ON CONFLICT (id) DO NOTHING;

-- Verification query
SELECT * FROM notification_config;

-- =====================================================
-- USAGE NOTES
-- =====================================================

/*
ENVIRONMENT VARIABLES REQUIRED FOR PRODUCTION:

Email (SendGrid):
- SENDGRID_API_KEY

WhatsApp (Twilio):
- TWILIO_ACCOUNT_SID
- TWILIO_AUTH_TOKEN

NOTIFICATION MODES:

Test Mode (test_mode = 1):
- All notifications are logged to console only
- No real emails or WhatsApp messages are sent
- Safe for testing and development

Production Mode (test_mode = 0):
- Real notifications are sent via SendGrid and Twilio
- Requires valid environment variables
- Only enable after testing

SWITCHING TO PRODUCTION MODE:

UPDATE notification_config 
SET test_mode = 0, updated_at = NOW() 
WHERE id = '1';

CONFIGURING NOTIFICATION CHANNELS:

-- Enable/Disable Email
UPDATE notification_config 
SET email_enabled = 1, updated_at = NOW() 
WHERE id = '1';

-- Enable/Disable WhatsApp
UPDATE notification_config 
SET whatsapp_enabled = 1, updated_at = NOW() 
WHERE id = '1';

-- Update Sender Email (must be verified in SendGrid)
UPDATE notification_config 
SET sender_email = 'your-verified-email@company.com', 
    sender_name = 'Your Company Name',
    updated_at = NOW() 
WHERE id = '1';

-- Update Twilio WhatsApp Number
UPDATE notification_config 
SET twilio_phone_number = 'whatsapp:+1234567890', 
    updated_at = NOW() 
WHERE id = '1';

FEATURES USING THIS TABLE:
1. Machine Startup Reminders - Sends WhatsApp/Email reminders before scheduled production
2. Missed Checklist Notifications - Alerts when checklists pass due date without completion

MONITORING:
-- Check current configuration
SELECT * FROM notification_config WHERE record_status = 1;

-- View notification status
SELECT 
  CASE WHEN email_enabled = 1 THEN 'Enabled' ELSE 'Disabled' END as email_status,
  CASE WHEN whatsapp_enabled = 1 THEN 'Enabled' ELSE 'Disabled' END as whatsapp_status,
  CASE WHEN test_mode = 1 THEN 'Test Mode (Console Only)' ELSE 'Production Mode (Real Sending)' END as mode,
  sender_email,
  sender_name,
  twilio_phone_number
FROM notification_config 
WHERE record_status = 1;
*/
