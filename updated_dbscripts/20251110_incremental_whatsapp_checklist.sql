-- Migration: Add partial_task_answers table for incremental WhatsApp checklist completion
-- Date: 2025-11-10
-- Description: Allows operators to submit checklist tasks one-by-one via WhatsApp
-- Progress is tracked until all tasks are completed, then auto-submitted

CREATE TABLE IF NOT EXISTS partial_task_answers (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id VARCHAR NOT NULL REFERENCES checklist_assignments(id) ON DELETE CASCADE,
  task_order INTEGER NOT NULL,
  task_name VARCHAR NOT NULL,
  status VARCHAR NOT NULL CHECK (status IN ('OK', 'NOK', 'NA')),
  remarks TEXT,
  answered_at TIMESTAMP NOT NULL DEFAULT NOW(),
  answered_by VARCHAR NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(assignment_id, task_order)
);

-- Index for faster lookups by assignment
CREATE INDEX IF NOT EXISTS idx_partial_task_answers_assignment_id 
ON partial_task_answers(assignment_id);

-- Index for tracking answer timestamps
CREATE INDEX IF NOT EXISTS idx_partial_task_answers_answered_at 
ON partial_task_answers(answered_at);

COMMENT ON TABLE partial_task_answers IS 'Stores incremental task submissions from WhatsApp before full checklist completion';
COMMENT ON COLUMN partial_task_answers.assignment_id IS 'FK to checklist_assignments - links partial answers to assignment';
COMMENT ON COLUMN partial_task_answers.task_order IS 'Task number (1, 2, 3...) from WhatsApp message';
COMMENT ON COLUMN partial_task_answers.status IS 'Task status: OK, NOK, or NA (normalized to uppercase)';
COMMENT ON COLUMN partial_task_answers.remarks IS 'Optional operator remarks for the task';
COMMENT ON COLUMN partial_task_answers.answered_by IS 'Operator phone number who submitted the answer';
