-- Monthly leave limit per leave type
ALTER TABLE hr_leave_types ADD COLUMN IF NOT EXISTS max_per_month INTEGER NOT NULL DEFAULT 0;
-- 0 = no monthly cap (EL/PL); 1+ = max days per month (SL/CL typically 1)

-- OT type per attendance entry: 'paid' (cash via payroll) or 'comp' (compensatory off)
ALTER TABLE hr_attendance ADD COLUMN IF NOT EXISTS ot_type VARCHAR(20) NOT NULL DEFAULT 'paid';
-- Add leave_type_id to hr_attendance for direct OL marking with leave type tracking
ALTER TABLE hr_attendance ADD COLUMN IF NOT EXISTS leave_type_id INTEGER REFERENCES hr_leave_types(id);
