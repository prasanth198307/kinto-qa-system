-- Add payslip template builder columns to hr_payslip_settings
ALTER TABLE hr_payslip_settings 
  ADD COLUMN IF NOT EXISTS company_name VARCHAR(200),
  ADD COLUMN IF NOT EXISTS company_address TEXT,
  ADD COLUMN IF NOT EXISTS company_city VARCHAR(100),
  ADD COLUMN IF NOT EXISTS company_state VARCHAR(100),
  ADD COLUMN IF NOT EXISTS company_pin VARCHAR(10),
  ADD COLUMN IF NOT EXISTS company_phone VARCHAR(20),
  ADD COLUMN IF NOT EXISTS company_email VARCHAR(100),
  ADD COLUMN IF NOT EXISTS company_gstin VARCHAR(20),
  ADD COLUMN IF NOT EXISTS company_cin VARCHAR(30),
  ADD COLUMN IF NOT EXISTS logo_path TEXT,
  ADD COLUMN IF NOT EXISTS template_style VARCHAR(20) DEFAULT 'classic';
