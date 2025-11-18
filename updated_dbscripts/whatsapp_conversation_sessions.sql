-- WhatsApp Interactive Conversation Sessions Table
-- Run this on your production database (colloki.micapps.com)
-- Date: 2025-11-18
-- Description: Stores active WhatsApp conversation state for interactive checklist completion

CREATE TABLE IF NOT EXISTS whatsapp_conversation_sessions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number VARCHAR(20) NOT NULL,
  assignment_id VARCHAR REFERENCES checklist_assignments(id) ON DELETE CASCADE,
  submission_id VARCHAR REFERENCES checklist_submissions(id),
  template_id VARCHAR REFERENCES checklist_templates(id),
  machine_id VARCHAR REFERENCES machines(id),
  operator_id VARCHAR REFERENCES users(id),
  status VARCHAR(50) DEFAULT 'active',
  current_task_index INTEGER DEFAULT 0,
  total_tasks INTEGER NOT NULL,
  answers JSONB DEFAULT '[]',
  pending_photo_url TEXT,  -- Stores photo received before text answer (photo-first scenario)
  last_message_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  expires_at TIMESTAMP NOT NULL
);

-- Index for fast lookups by phone number
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_phone 
ON whatsapp_conversation_sessions(phone_number);

-- Index for active sessions
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_status 
ON whatsapp_conversation_sessions(status);

-- Index for expired session cleanup
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_expires 
ON whatsapp_conversation_sessions(expires_at);

-- Index for assignment lookup
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_assignment 
ON whatsapp_conversation_sessions(assignment_id);

-- Comments for documentation
COMMENT ON TABLE whatsapp_conversation_sessions IS 'Manages stateful WhatsApp conversations for interactive checklist completion';
COMMENT ON COLUMN whatsapp_conversation_sessions.phone_number IS 'Operator WhatsApp phone number in E.164 format';
COMMENT ON COLUMN whatsapp_conversation_sessions.assignment_id IS 'Links conversation to checklist assignment';
COMMENT ON COLUMN whatsapp_conversation_sessions.current_task_index IS 'Current question index (0-based)';
COMMENT ON COLUMN whatsapp_conversation_sessions.answers IS 'JSON array of {question, answer, photoUrl}';
COMMENT ON COLUMN whatsapp_conversation_sessions.pending_photo_url IS 'Photo URL when photo arrives before text answer';
COMMENT ON COLUMN whatsapp_conversation_sessions.expires_at IS 'Session expiry (24 hours from start)';

-- Verify table creation
SELECT 'WhatsApp conversation sessions table created successfully!' as status;
