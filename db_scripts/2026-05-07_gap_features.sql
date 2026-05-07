-- Gap features: JW Metal Ledger, HR Onboarding, HR Letters, HR Support Tickets, CRM Surveys

CREATE TABLE IF NOT EXISTS jw_metal_ledger (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  metal_type TEXT NOT NULL DEFAULT 'gold',
  purity_name TEXT NOT NULL,
  transaction_type TEXT NOT NULL,
  weight_gm NUMERIC(12,3) NOT NULL,
  rate_per_gram NUMERIC(12,2),
  amount NUMERIC(14,2),
  reference_no TEXT,
  reference_type TEXT,
  balance_gm NUMERIC(12,3) DEFAULT 0,
  txn_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hr_onboarding_checklists (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  employee_id INTEGER,
  employee_name TEXT NOT NULL,
  department TEXT,
  designation TEXT,
  joining_date DATE,
  checklist JSONB DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'pending',
  assigned_to TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hr_letters (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  employee_id INTEGER,
  employee_name TEXT NOT NULL,
  letter_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  issued_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hr_support_tickets (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  ticket_no TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  employee_id INTEGER,
  subject TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  priority TEXT DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  assigned_to TEXT,
  resolution TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm_surveys (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  survey_code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  target_audience TEXT DEFAULT 'all',
  response_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm_survey_questions (
  id SERIAL PRIMARY KEY,
  survey_id INTEGER NOT NULL REFERENCES crm_surveys(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'rating',
  options JSONB DEFAULT '[]',
  is_required BOOLEAN DEFAULT true,
  order_no INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS crm_survey_responses (
  id SERIAL PRIMARY KEY,
  survey_id INTEGER NOT NULL REFERENCES crm_surveys(id) ON DELETE CASCADE,
  respondent_name TEXT,
  respondent_phone TEXT,
  respondent_email TEXT,
  answers JSONB DEFAULT '{}',
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);
