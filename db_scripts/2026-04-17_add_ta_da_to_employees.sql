-- Add Travel Allowance and Dearness Allowance columns to hr_employees
ALTER TABLE hr_employees ADD COLUMN IF NOT EXISTS ta_amount numeric(10,2) DEFAULT 0;
ALTER TABLE hr_employees ADD COLUMN IF NOT EXISTS da_amount numeric(10,2) DEFAULT 0;
