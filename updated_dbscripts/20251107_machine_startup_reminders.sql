-- =====================================================
-- Machine Startup Reminder System
-- Created: November 7, 2025
-- Purpose: Enable managers to assign machine startup tasks to operators
--          with WhatsApp and Email reminder notifications
-- =====================================================

-- Create machine_startup_tasks table
CREATE TABLE IF NOT EXISTS machine_startup_tasks (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id VARCHAR NOT NULL REFERENCES machines(id),
  assigned_user_id VARCHAR NOT NULL REFERENCES users(id),
  scheduled_start_time TIMESTAMP NOT NULL,
  reminder_before_minutes INTEGER NOT NULL DEFAULT 30,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  notification_sent_at TIMESTAMP,
  machine_started_at TIMESTAMP,
  whatsapp_enabled INTEGER NOT NULL DEFAULT 1,
  email_enabled INTEGER NOT NULL DEFAULT 1,
  whatsapp_sent INTEGER NOT NULL DEFAULT 0,
  email_sent INTEGER NOT NULL DEFAULT 0,
  production_date DATE NOT NULL,
  shift VARCHAR(50),
  notes TEXT,
  created_by VARCHAR REFERENCES users(id),
  record_status INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_machine_startup_tasks_machine ON machine_startup_tasks(machine_id);
CREATE INDEX IF NOT EXISTS idx_machine_startup_tasks_user ON machine_startup_tasks(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_machine_startup_tasks_date ON machine_startup_tasks(production_date);
CREATE INDEX IF NOT EXISTS idx_machine_startup_tasks_status ON machine_startup_tasks(status);
CREATE INDEX IF NOT EXISTS idx_machine_startup_tasks_record_status ON machine_startup_tasks(record_status);

-- Comments for documentation
COMMENT ON TABLE machine_startup_tasks IS 'Tracks machine startup reminders for operators before production. Sends WhatsApp and Email notifications.';
COMMENT ON COLUMN machine_startup_tasks.scheduled_start_time IS 'When the machine should be started';
COMMENT ON COLUMN machine_startup_tasks.reminder_before_minutes IS 'How many minutes before scheduled time to send reminder';
COMMENT ON COLUMN machine_startup_tasks.status IS 'pending | notified | completed | cancelled';
COMMENT ON COLUMN machine_startup_tasks.whatsapp_enabled IS '1 = send WhatsApp, 0 = disabled';
COMMENT ON COLUMN machine_startup_tasks.email_enabled IS '1 = send Email, 0 = disabled';
COMMENT ON COLUMN machine_startup_tasks.whatsapp_sent IS '0 = not sent, 1 = sent successfully';
COMMENT ON COLUMN machine_startup_tasks.email_sent IS '0 = not sent, 1 = sent successfully';

-- Example: Insert sample startup task
-- This creates a reminder for an operator to start a machine 30 minutes before production
/*
INSERT INTO machine_startup_tasks (
  machine_id,
  assigned_user_id,
  scheduled_start_time,
  reminder_before_minutes,
  production_date,
  shift,
  notes,
  created_by
) VALUES (
  (SELECT id FROM machines WHERE name = 'CNC Machine 1' LIMIT 1),
  (SELECT id FROM users WHERE role = 'operator' LIMIT 1),
  '2025-11-08 08:00:00'::timestamp,
  30,
  '2025-11-08'::date,
  'Morning',
  'Production run for Client XYZ',
  (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
);
*/

-- =====================================================
-- DEPLOYMENT NOTES
-- =====================================================
-- 1. This table enables automated reminder system
-- 2. Notifications currently log to console (like password reset)
-- 3. To enable real WhatsApp: Set up Twilio integration
-- 4. To enable real Email: Set up SendGrid/Resend integration
-- 5. Reminder system checks every 60 seconds automatically
-- =====================================================
