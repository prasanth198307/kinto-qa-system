-- Finance integration columns for staff_schedules
ALTER TABLE staff_schedules ADD COLUMN IF NOT EXISTS journal_entry_id INTEGER;
ALTER TABLE staff_schedules ADD COLUMN IF NOT EXISTS expense_id INTEGER;
ALTER TABLE staff_schedules ADD COLUMN IF NOT EXISTS employee_id INTEGER;
ALTER TABLE staff_schedules ADD COLUMN IF NOT EXISTS outlet_id INTEGER;
ALTER TABLE staff_schedules ADD COLUMN IF NOT EXISTS opening_cash DECIMAL(10,2) DEFAULT 0;
ALTER TABLE staff_schedules ADD COLUMN IF NOT EXISTS closing_cash DECIMAL(10,2) DEFAULT 0;
ALTER TABLE staff_schedules ADD COLUMN IF NOT EXISTS actual_cash DECIMAL(10,2) DEFAULT 0;
ALTER TABLE staff_schedules ADD COLUMN IF NOT EXISTS cash_variance DECIMAL(10,2) DEFAULT 0;
ALTER TABLE staff_schedules ADD COLUMN IF NOT EXISTS tips_collected DECIMAL(10,2) DEFAULT 0;
ALTER TABLE staff_schedules ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'open';
ALTER TABLE staff_schedules ADD COLUMN IF NOT EXISTS start_time TIMESTAMP;
ALTER TABLE staff_schedules ADD COLUMN IF NOT EXISTS end_time TIMESTAMP;
ALTER TABLE staff_schedules ADD COLUMN IF NOT EXISTS shift_type VARCHAR(20) DEFAULT 'morning';

-- Journal entry tables (shared accounting module)
CREATE TABLE IF NOT EXISTS journal_entries (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  entry_date DATE NOT NULL,
  narration TEXT,
  reference_no VARCHAR(100),
  status VARCHAR(20) DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS journal_entry_lines (
  id SERIAL PRIMARY KEY,
  journal_entry_id INTEGER NOT NULL,
  tenant_id INTEGER NOT NULL,
  account_name VARCHAR(200),
  debit DECIMAL(12,2) DEFAULT 0,
  credit DECIMAL(12,2) DEFAULT 0
);

-- HR attendance (if not exist)
CREATE TABLE IF NOT EXISTS hr_attendance (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  employee_id INTEGER NOT NULL,
  attendance_date DATE NOT NULL,
  check_in TIMESTAMP,
  check_out TIMESTAMP,
  status VARCHAR(20) DEFAULT 'present',
  hours_worked DECIMAL(5,2),
  remarks TEXT,
  UNIQUE(tenant_id, employee_id, attendance_date)
);
