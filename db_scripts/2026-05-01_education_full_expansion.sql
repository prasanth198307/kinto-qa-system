-- Education Module Full Expansion
-- Run: psql $DATABASE_URL -f db_scripts/2026-05-01_education_full_expansion.sql

ALTER TABLE students ADD COLUMN IF NOT EXISTS blood_group VARCHAR(10);
ALTER TABLE students ADD COLUMN IF NOT EXISTS section VARCHAR(50);
ALTER TABLE students ADD COLUMN IF NOT EXISTS roll_number VARCHAR(20);
ALTER TABLE students ADD COLUMN IF NOT EXISTS transport_required INTEGER DEFAULT 0;
ALTER TABLE students ADD COLUMN IF NOT EXISTS hostel_required INTEGER DEFAULT 0;
ALTER TABLE students ADD COLUMN IF NOT EXISTS admission_no VARCHAR(50);
ALTER TABLE students ADD COLUMN IF NOT EXISTS academic_year VARCHAR(20);
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS department VARCHAR(100);
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS designation VARCHAR(100);
-- (plus all CREATE TABLE statements from the main migration above)
