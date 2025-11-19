-- Add AI session ID column to whatsapp_conversation_sessions table
-- This stores the Colloki Flow AI session ID for maintaining conversation context

ALTER TABLE whatsapp_conversation_sessions
ADD COLUMN IF NOT EXISTS ai_session_id VARCHAR(255);

COMMENT ON COLUMN whatsapp_conversation_sessions.ai_session_id IS 'Colloki Flow AI session ID for maintaining conversation context across messages';
