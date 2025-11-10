-- WhatsApp Integration: Add response tracking columns to machine_startup_tasks
-- Created: 2025-11-10
-- Purpose: Enable two-way WhatsApp communication for machine startup reminders

ALTER TABLE machine_startup_tasks 
ADD COLUMN IF NOT EXISTS task_reference_id VARCHAR(50) UNIQUE,
ADD COLUMN IF NOT EXISTS operator_response TEXT,
ADD COLUMN IF NOT EXISTS operator_response_time TIMESTAMP,
ADD COLUMN IF NOT EXISTS response_status VARCHAR(20) DEFAULT 'no_response';

COMMENT ON COLUMN machine_startup_tasks.task_reference_id IS 'Unique task reference for WhatsApp replies (e.g., MST-12345)';
COMMENT ON COLUMN machine_startup_tasks.operator_response IS 'WhatsApp message reply from operator';
COMMENT ON COLUMN machine_startup_tasks.operator_response_time IS 'Timestamp when operator replied via WhatsApp';
COMMENT ON COLUMN machine_startup_tasks.response_status IS 'Response timing: on_time, late, early, no_response';

-- Create index for faster lookups by task reference
CREATE INDEX IF NOT EXISTS idx_machine_startup_tasks_task_ref 
ON machine_startup_tasks(task_reference_id) 
WHERE task_reference_id IS NOT NULL;
