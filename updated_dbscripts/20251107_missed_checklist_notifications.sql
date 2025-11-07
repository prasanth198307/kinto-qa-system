-- Migration: Missed Checklist Notification System
-- Date: 2025-11-07
-- Description: Add deadline tracking and notification features for missed checklists
-- Author: System
-- Purpose: Enable automatic WhatsApp notifications when operators miss checklist deadlines

-- ============================================================================
-- PART 1: Update checklist_assignments table for deadline tracking
-- ============================================================================

-- Add due_date_time column to track when checklist is due
ALTER TABLE checklist_assignments 
ADD COLUMN IF NOT EXISTS due_date_time TIMESTAMP;

-- Add missed_notification_sent flag to prevent duplicate notifications
ALTER TABLE checklist_assignments 
ADD COLUMN IF NOT EXISTS missed_notification_sent INTEGER DEFAULT 0 NOT NULL;

-- Add timestamp for when notification was sent
ALTER TABLE checklist_assignments 
ADD COLUMN IF NOT EXISTS missed_notification_sent_at TIMESTAMP;

-- Add index for efficient querying of missed checklists
CREATE INDEX IF NOT EXISTS idx_checklist_assignments_missed 
ON checklist_assignments(status, missed_notification_sent, due_date_time) 
WHERE record_status = 1;

COMMENT ON COLUMN checklist_assignments.due_date_time IS 'Deadline for checklist completion';
COMMENT ON COLUMN checklist_assignments.missed_notification_sent IS 'Flag: 0 = not sent, 1 = sent';
COMMENT ON COLUMN checklist_assignments.missed_notification_sent_at IS 'Timestamp when missed notification was sent';

-- ============================================================================
-- PART 2: Update notification_config table for additional fields
-- ============================================================================

-- Add sender_name column for display purposes
ALTER TABLE notification_config 
ADD COLUMN IF NOT EXISTS sender_name VARCHAR(255);

-- Add standard tracking columns if not exists
ALTER TABLE notification_config 
ADD COLUMN IF NOT EXISTS record_status INTEGER DEFAULT 1;

ALTER TABLE notification_config 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE notification_config 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

COMMENT ON COLUMN notification_config.sender_name IS 'Display name for notifications (e.g., KINTO QA)';

-- ============================================================================
-- PART 3: Create or update notification configuration
-- ============================================================================

-- Ensure notification config exists with test mode enabled by default
INSERT INTO notification_config (id, whatsapp_enabled, email_enabled, test_mode, sender_email, sender_name, twilio_phone_number, record_status)
VALUES (1, 1, 1, 1, 'qa@kinto.com', 'KINTO QA', 'whatsapp:+14155238886', 1)
ON CONFLICT (id) DO UPDATE 
SET 
    test_mode = 1,
    sender_name = COALESCE(notification_config.sender_name, EXCLUDED.sender_name),
    updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify checklist_assignments columns
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'checklist_assignments' 
AND column_name IN ('due_date_time', 'missed_notification_sent', 'missed_notification_sent_at')
ORDER BY column_name;

-- Verify notification_config columns
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'notification_config' 
AND column_name IN ('sender_name', 'record_status', 'created_at', 'updated_at')
ORDER BY column_name;

-- ============================================================================
-- USAGE NOTES
-- ============================================================================

/*
AUTOMATED DETECTION:
- The system automatically checks for missed checklists every 5 minutes
- Detects assignments where:
  * status = 'pending'
  * due_date_time < NOW()
  * missed_notification_sent = 0
  * record_status = 1

NOTIFICATION RECIPIENTS:
- Operator (assigned to complete the checklist)
- Reviewer (if assigned)
- Manager (who created the assignment via assigned_by)
- All Admin users

NOTIFICATION MODES:
- Test Mode (test_mode = 1): Notifications logged to console only
- Production Mode (test_mode = 0): Real WhatsApp messages sent via Twilio API

ENVIRONMENT VARIABLES REQUIRED FOR PRODUCTION:
- TWILIO_ACCOUNT_SID
- TWILIO_AUTH_TOKEN

MANUAL TRIGGER FOR TESTING:
- POST /api/cron/missed-checklists

EXAMPLE: Setting a checklist due date when creating an assignment:
INSERT INTO checklist_assignments (
    template_id, machine_id, operator_id, reviewer_id, 
    assigned_date, due_date_time, status, assigned_by, record_status
) VALUES (
    'template-uuid', 'machine-uuid', 'operator-uuid', 'reviewer-uuid',
    CURRENT_DATE, CURRENT_TIMESTAMP + INTERVAL '8 hours', 'pending', 'manager-uuid', 1
);

MONITORING:
- Check missed notifications: 
  SELECT * FROM checklist_assignments 
  WHERE missed_notification_sent = 1 
  ORDER BY missed_notification_sent_at DESC;

- Find pending missed checklists:
  SELECT * FROM checklist_assignments 
  WHERE status = 'pending' 
  AND due_date_time < NOW() 
  AND missed_notification_sent = 0 
  AND record_status = 1;
*/
