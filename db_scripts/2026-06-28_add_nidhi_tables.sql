-- Nidhi Company / NBFC ERP tables
-- Created: 2026-06-28

CREATE TABLE IF NOT EXISTS nidhi_members (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL DEFAULT 1,
  member_number VARCHAR(20) NOT NULL,
  name VARCHAR(200) NOT NULL,
  father_name VARCHAR(200),
  date_of_birth DATE,
  gender VARCHAR(10),
  phone VARCHAR(20),
  alternate_phone VARCHAR(20),
  email VARCHAR(200),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(10),
  aadhar_number VARCHAR(12),
  pan_number VARCHAR(10),
  kyc_status VARCHAR(20) DEFAULT 'pending',
  nominee_name VARCHAR(200),
  nominee_relation VARCHAR(100),
  membership_date DATE DEFAULT CURRENT_DATE,
  shares_held INTEGER DEFAULT 1,
  share_value NUMERIC(10,2) DEFAULT 10,
  total_share_amount NUMERIC(12,2) DEFAULT 10,
  status VARCHAR(20) DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, member_number)
);

CREATE TABLE IF NOT EXISTS nidhi_deposits (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL DEFAULT 1,
  member_id INTEGER NOT NULL REFERENCES nidhi_members(id),
  account_number VARCHAR(30) NOT NULL,
  deposit_type VARCHAR(20) NOT NULL,
  principal_amount NUMERIC(14,2) NOT NULL,
  interest_rate NUMERIC(6,2) NOT NULL,
  tenure_months INTEGER,
  opening_date DATE DEFAULT CURRENT_DATE,
  maturity_date DATE,
  maturity_amount NUMERIC(14,2),
  current_balance NUMERIC(14,2),
  interest_payout VARCHAR(20) DEFAULT 'on_maturity',
  nominee_name VARCHAR(200),
  status VARCHAR(30) DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, account_number)
);

CREATE TABLE IF NOT EXISTS nidhi_deposit_transactions (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL DEFAULT 1,
  deposit_id INTEGER NOT NULL REFERENCES nidhi_deposits(id),
  transaction_type VARCHAR(30) NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  interest_amount NUMERIC(14,2) DEFAULT 0,
  balance_after NUMERIC(14,2),
  payment_mode VARCHAR(20),
  reference_number VARCHAR(100),
  transaction_date DATE DEFAULT CURRENT_DATE,
  narration TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nidhi_loans (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL DEFAULT 1,
  member_id INTEGER NOT NULL REFERENCES nidhi_members(id),
  loan_number VARCHAR(30) NOT NULL,
  loan_type VARCHAR(30) NOT NULL,
  principal_amount NUMERIC(14,2) NOT NULL,
  interest_rate NUMERIC(6,2) NOT NULL,
  tenure_months INTEGER NOT NULL,
  emi_amount NUMERIC(12,2),
  disbursement_date DATE DEFAULT CURRENT_DATE,
  first_emi_date DATE,
  outstanding_principal NUMERIC(14,2),
  total_interest_paid NUMERIC(14,2) DEFAULT 0,
  emis_paid INTEGER DEFAULT 0,
  total_emis INTEGER,
  security_type VARCHAR(30),
  security_value NUMERIC(14,2),
  security_description TEXT,
  status VARCHAR(20) DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, loan_number)
);

CREATE TABLE IF NOT EXISTS nidhi_loan_transactions (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL DEFAULT 1,
  loan_id INTEGER NOT NULL REFERENCES nidhi_loans(id),
  transaction_type VARCHAR(30) NOT NULL,
  emi_number INTEGER,
  principal_component NUMERIC(12,2) DEFAULT 0,
  interest_component NUMERIC(12,2) DEFAULT 0,
  penalty_amount NUMERIC(12,2) DEFAULT 0,
  total_amount NUMERIC(12,2) NOT NULL,
  outstanding_after NUMERIC(14,2),
  payment_mode VARCHAR(20),
  reference_number VARCHAR(100),
  payment_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nidhi_share_transactions (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL DEFAULT 1,
  member_id INTEGER NOT NULL REFERENCES nidhi_members(id),
  transaction_type VARCHAR(20) NOT NULL,
  shares_count INTEGER NOT NULL,
  share_value NUMERIC(10,2) NOT NULL,
  total_amount NUMERIC(12,2) NOT NULL,
  certificate_number VARCHAR(50),
  payment_mode VARCHAR(20),
  transaction_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nidhi_interest_rates (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL DEFAULT 1,
  deposit_type VARCHAR(20) NOT NULL,
  min_tenure_months INTEGER,
  max_tenure_months INTEGER,
  interest_rate NUMERIC(6,2) NOT NULL,
  effective_from DATE DEFAULT CURRENT_DATE,
  is_active INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nidhi_compliance_reports (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL DEFAULT 1,
  report_type VARCHAR(20) NOT NULL,
  financial_year VARCHAR(10),
  period_from DATE,
  period_to DATE,
  total_members INTEGER,
  total_deposits NUMERIC(16,2),
  total_loans NUMERIC(16,2),
  net_owned_funds NUMERIC(16,2),
  deposit_to_nof_ratio NUMERIC(8,2),
  is_compliant INTEGER DEFAULT 1,
  report_data JSONB,
  generated_at TIMESTAMP DEFAULT NOW()
);
