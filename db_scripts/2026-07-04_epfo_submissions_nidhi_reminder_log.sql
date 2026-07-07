-- Migration: EPFO submissions table + Nidhi reminder log

CREATE TABLE IF NOT EXISTS hr_epfo_submissions (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  period_month INTEGER NOT NULL,
  period_year INTEGER NOT NULL,
  total_employees INTEGER DEFAULT 0,
  total_epf_wages NUMERIC(15,2) DEFAULT 0,
  total_eps_wages NUMERIC(15,2) DEFAULT 0,
  employee_share NUMERIC(15,2) DEFAULT 0,
  employer_share NUMERIC(15,2) DEFAULT 0,
  status VARCHAR(30) DEFAULT 'generated',
  ecr_data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nidhi_reminder_log (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  member_id INTEGER,
  message TEXT,
  sent_at TIMESTAMP DEFAULT NOW(),
  status VARCHAR(30) DEFAULT 'sent'
);
