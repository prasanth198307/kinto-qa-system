-- Fix education and healthcare schema issues
-- Run date: 2026-05-01

-- Fix 1: Add doctor_id to appointments table (was missing, causing 500 on GET/POST/PUT)
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS doctor_id integer;

-- Fix 2: Make appointments.doctor_name nullable (it's now optional since doctor_id is used)
ALTER TABLE appointments ALTER COLUMN doctor_name DROP NOT NULL;

-- Fix 3: Add unique index on student_attendance(tenant_id, student_id, attendance_date)
--   Required for ON CONFLICT clause in bulk attendance insert to work
CREATE UNIQUE INDEX IF NOT EXISTS sa_tenant_student_date_uidx
  ON student_attendance(tenant_id, student_id, attendance_date);
