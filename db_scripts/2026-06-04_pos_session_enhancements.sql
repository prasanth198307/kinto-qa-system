-- POS Session Enhancements: UPI float, manager approval, shift type
ALTER TABLE pos_sessions ADD COLUMN IF NOT EXISTS opening_upi_float NUMERIC(12,2) DEFAULT 0;
ALTER TABLE pos_sessions ADD COLUMN IF NOT EXISTS approved_by TEXT;
ALTER TABLE pos_sessions ADD COLUMN IF NOT EXISTS approval_note TEXT;
ALTER TABLE pos_sessions ADD COLUMN IF NOT EXISTS shift_type TEXT DEFAULT 'new';
