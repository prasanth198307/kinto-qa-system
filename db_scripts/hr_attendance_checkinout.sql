-- Add check-in / check-out time and working hours to attendance
ALTER TABLE hr_attendance
  ADD COLUMN IF NOT EXISTS check_in_time TIME,
  ADD COLUMN IF NOT EXISTS check_out_time TIME,
  ADD COLUMN IF NOT EXISTS working_hours NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS marked_by VARCHAR(20) DEFAULT 'admin';
