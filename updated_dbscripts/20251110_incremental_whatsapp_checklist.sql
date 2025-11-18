-- Migration: Add partial_task_answers table for incremental WhatsApp checklist completion
-- Date: 2025-11-10 (Updated: 2025-11-18)
-- Description: Allows operators to submit checklist tasks one-by-one via WhatsApp
-- Progress is tracked until all tasks are completed, then auto-submitted

CREATE TABLE IF NOT EXISTS partial_task_answers (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id VARCHAR NOT NULL REFERENCES checklist_assignments(id) ON DELETE CASCADE,
  task_order INTEGER NOT NULL,
  task_name VARCHAR(255) NOT NULL,
  status VARCHAR(10) NOT NULL CHECK (status IN ('OK', 'NOK', 'NA')),
  remarks TEXT,
  photo_url VARCHAR(500),  -- Photo URL for NOK tasks or documentation
  spare_part_id VARCHAR REFERENCES spare_parts_catalog(id),  -- Linked spare part request
  spare_part_request_text TEXT,  -- Operator's raw spare part request text
  waiting_for_photo INTEGER DEFAULT 0,  -- 1 = waiting for photo upload
  waiting_for_spare_part INTEGER DEFAULT 0,  -- 1 = waiting for spare part response
  answered_at TIMESTAMP NOT NULL DEFAULT NOW(),
  answered_by VARCHAR NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(assignment_id, task_order)
);

-- Index for faster lookups by assignment
CREATE INDEX IF NOT EXISTS idx_partial_task_answers_assignment_id 
ON partial_task_answers(assignment_id);

-- Index for tracking answer timestamps
CREATE INDEX IF NOT EXISTS idx_partial_task_answers_answered_at 
ON partial_task_answers(answered_at);

-- Index for spare part requests
CREATE INDEX IF NOT EXISTS idx_partial_task_answers_spare_part 
ON partial_task_answers(spare_part_id) WHERE spare_part_id IS NOT NULL;

-- Comments for documentation
COMMENT ON TABLE partial_task_answers IS 'Stores incremental task submissions from WhatsApp before full checklist completion';
COMMENT ON COLUMN partial_task_answers.assignment_id IS 'FK to checklist_assignments - links partial answers to assignment';
COMMENT ON COLUMN partial_task_answers.task_order IS 'Task number (1, 2, 3...) from WhatsApp message';
COMMENT ON COLUMN partial_task_answers.status IS 'Task status: OK, NOK, or NA (normalized to uppercase)';
COMMENT ON COLUMN partial_task_answers.remarks IS 'Optional operator remarks for the task';
COMMENT ON COLUMN partial_task_answers.photo_url IS 'URL to uploaded photo for documentation or NOK evidence';
COMMENT ON COLUMN partial_task_answers.spare_part_id IS 'FK to spare_parts_catalog if operator requested a spare part';
COMMENT ON COLUMN partial_task_answers.spare_part_request_text IS 'Raw text of operator spare part request';
COMMENT ON COLUMN partial_task_answers.waiting_for_photo IS 'Flag: 1 if waiting for operator to upload photo';
COMMENT ON COLUMN partial_task_answers.waiting_for_spare_part IS 'Flag: 1 if waiting for spare part allocation';
COMMENT ON COLUMN partial_task_answers.answered_by IS 'Operator user ID who submitted the answer';

-- Verify table creation
SELECT 'Partial task answers table created/updated successfully!' as status;
