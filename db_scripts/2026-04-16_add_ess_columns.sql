-- Add ESS (Employee Self-Service) columns to hr_employees
ALTER TABLE hr_employees
  ADD COLUMN IF NOT EXISTS ess_password TEXT,
  ADD COLUMN IF NOT EXISTS ess_enabled BOOLEAN NOT NULL DEFAULT FALSE;
