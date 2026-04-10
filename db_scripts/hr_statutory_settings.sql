CREATE TABLE IF NOT EXISTS hr_statutory_settings (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  pf_employee_rate NUMERIC(6,4) NOT NULL DEFAULT 0.12,
  pf_employer_rate NUMERIC(6,4) NOT NULL DEFAULT 0.12,
  pf_ceiling_basic INTEGER NOT NULL DEFAULT 15000,
  esi_employee_rate NUMERIC(6,4) NOT NULL DEFAULT 0.0075,
  esi_employer_rate NUMERIC(6,4) NOT NULL DEFAULT 0.0325,
  esi_gross_ceiling INTEGER NOT NULL DEFAULT 21000,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (tenant_id)
);
