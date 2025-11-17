-- WhatsApp Interactive Conversation Sessions Table
-- Run this on your Mac production database

CREATE TABLE IF NOT EXISTS whatsapp_conversation_sessions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number VARCHAR(20) NOT NULL,
  submission_id VARCHAR REFERENCES checklist_submissions(id),
  template_id VARCHAR REFERENCES checklist_templates(id),
  machine_id VARCHAR REFERENCES machines(id),
  operator_id VARCHAR REFERENCES users(id),
  status VARCHAR(50) DEFAULT 'active',
  current_task_index INTEGER DEFAULT 0,
  total_tasks INTEGER NOT NULL,
  answers JSONB DEFAULT '[]',
  last_message_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  expires_at TIMESTAMP NOT NULL
);

-- Index for fast lookups by phone number
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_phone ON whatsapp_conversation_sessions(phone_number);

-- Index for active sessions
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_status ON whatsapp_conversation_sessions(status);

-- Index for expired session cleanup
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_expires ON whatsapp_conversation_sessions(expires_at);

-- Verify table creation
SELECT 'WhatsApp conversation sessions table created successfully!' as status;
