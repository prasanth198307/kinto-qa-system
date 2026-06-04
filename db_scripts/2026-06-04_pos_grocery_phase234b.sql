-- Shift name column for POS sessions (Morning / Evening / Night)
ALTER TABLE pos_sessions ADD COLUMN IF NOT EXISTS shift_name text DEFAULT 'Morning';
