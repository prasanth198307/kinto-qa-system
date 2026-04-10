-- Add employee_type column to hr_employees
ALTER TABLE hr_employees ADD COLUMN IF NOT EXISTS employee_type VARCHAR(20) NOT NULL DEFAULT 'permanent';
