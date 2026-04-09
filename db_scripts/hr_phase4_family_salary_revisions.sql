-- HR Phase 4: Add family details + salary revisions table
-- Date: 2026-04-09

-- Add family detail columns to hr_employees
ALTER TABLE hr_employees
  ADD COLUMN IF NOT EXISTS exit_reason text,
  ADD COLUMN IF NOT EXISTS resignation_date date,
  ADD COLUMN IF NOT EXISTS alternate_phone varchar(20),
  ADD COLUMN IF NOT EXISTS city varchar(100),
  ADD COLUMN IF NOT EXISTS state varchar(100),
  ADD COLUMN IF NOT EXISTS pincode varchar(10),
  ADD COLUMN IF NOT EXISTS emergency_contact_name varchar(100),
  ADD COLUMN IF NOT EXISTS emergency_contact_relation varchar(50),
  ADD COLUMN IF NOT EXISTS marital_status varchar(20),
  ADD COLUMN IF NOT EXISTS spouse_name varchar(100),
  ADD COLUMN IF NOT EXISTS spouse_dob date,
  ADD COLUMN IF NOT EXISTS spouse_aadhaar varchar(20),
  ADD COLUMN IF NOT EXISTS father_name varchar(100),
  ADD COLUMN IF NOT EXISTS father_dob date,
  ADD COLUMN IF NOT EXISTS father_aadhaar varchar(20),
  ADD COLUMN IF NOT EXISTS mother_name varchar(100),
  ADD COLUMN IF NOT EXISTS mother_dob date,
  ADD COLUMN IF NOT EXISTS mother_aadhaar varchar(20),
  ADD COLUMN IF NOT EXISTS number_of_children integer DEFAULT 0;

-- Create salary revisions table
CREATE TABLE IF NOT EXISTS hr_salary_revisions (
  id serial PRIMARY KEY,
  tenant_id integer NOT NULL,
  employee_id integer NOT NULL,
  effective_date date NOT NULL,
  old_basic integer DEFAULT 0,
  new_basic integer NOT NULL,
  old_ctc integer DEFAULT 0,
  new_ctc integer NOT NULL,
  revision_type varchar(50) DEFAULT 'increment',
  reason text,
  approved_by varchar(100),
  record_status integer NOT NULL DEFAULT 1,
  created_at timestamp DEFAULT now()
);
