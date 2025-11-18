-- Migration: Add WhatsApp integration columns to checklist_assignments table
-- Date: 2025-11-18
-- Description: Adds columns for WhatsApp conversation tracking and operator response management

-- Add task_reference_id for WhatsApp task tracking
ALTER TABLE checklist_assignments 
ADD COLUMN IF NOT EXISTS task_reference_id VARCHAR(50);

-- Add whatsapp_enabled flag
ALTER TABLE checklist_assignments 
ADD COLUMN IF NOT EXISTS whatsapp_enabled INTEGER DEFAULT 0 NOT NULL;

-- Add whatsapp_notification_sent flag
ALTER TABLE checklist_assignments 
ADD COLUMN IF NOT EXISTS whatsapp_notification_sent INTEGER DEFAULT 0 NOT NULL;

-- Add whatsapp_notification_sent_at timestamp
ALTER TABLE checklist_assignments 
ADD COLUMN IF NOT EXISTS whatsapp_notification_sent_at TIMESTAMP;

-- Add operator_response text
ALTER TABLE checklist_assignments 
ADD COLUMN IF NOT EXISTS operator_response TEXT;

-- Add operator_response_time timestamp
ALTER TABLE checklist_assignments 
ADD COLUMN IF NOT EXISTS operator_response_time TIMESTAMP;

-- Create index on task_reference_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_checklist_assignments_task_ref 
ON checklist_assignments(task_reference_id) WHERE task_reference_id IS NOT NULL;

-- Create index on whatsapp_enabled for filtering
CREATE INDEX IF NOT EXISTS idx_checklist_assignments_whatsapp_enabled 
ON checklist_assignments(whatsapp_enabled) WHERE whatsapp_enabled = 1;

-- Comments for documentation
COMMENT ON COLUMN checklist_assignments.task_reference_id IS 'Unique reference ID for WhatsApp task tracking';
COMMENT ON COLUMN checklist_assignments.whatsapp_enabled IS 'Flag: 1 = send WhatsApp notification, 0 = manual assignment only';
COMMENT ON COLUMN checklist_assignments.whatsapp_notification_sent IS 'Flag: 1 = WhatsApp message sent successfully';
COMMENT ON COLUMN checklist_assignments.whatsapp_notification_sent_at IS 'Timestamp when WhatsApp notification was sent';
COMMENT ON COLUMN checklist_assignments.operator_response IS 'Operator response/remarks from WhatsApp conversation';
COMMENT ON COLUMN checklist_assignments.operator_response_time IS 'Timestamp when operator completed WhatsApp conversation';

-- Verify migration
SELECT 'Checklist assignments WhatsApp columns added successfully!' as status;
