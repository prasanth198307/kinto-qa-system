-- HR Loan / Advance tracking system
CREATE TABLE IF NOT EXISTS hr_loans (
  id serial PRIMARY KEY,
  tenant_id integer NOT NULL,
  employee_id integer NOT NULL,
  loan_type character varying(20) NOT NULL DEFAULT 'loan',
  purpose text,
  sanctioned_amount integer NOT NULL DEFAULT 0,
  outstanding integer NOT NULL DEFAULT 0,
  emi integer NOT NULL DEFAULT 0,
  disbursed_date date,
  start_month integer NOT NULL,
  start_year integer NOT NULL,
  end_month integer,
  end_year integer,
  status character varying(20) NOT NULL DEFAULT 'active',
  notes text,
  record_status integer NOT NULL DEFAULT 1,
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hr_loan_ledger (
  id serial PRIMARY KEY,
  loan_id integer NOT NULL REFERENCES hr_loans(id),
  tenant_id integer NOT NULL,
  payroll_run_id integer,
  month integer NOT NULL,
  year integer NOT NULL,
  deducted_amount integer NOT NULL DEFAULT 0,
  balance_after integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamp DEFAULT now()
);

-- Payslip display settings per tenant
CREATE TABLE IF NOT EXISTS hr_payslip_settings (
  id serial PRIMARY KEY,
  tenant_id integer UNIQUE NOT NULL,
  signatory_name character varying(200),
  signatory_designation character varying(200),
  show_employer_contributions boolean DEFAULT true,
  show_loan_deductions boolean DEFAULT true,
  footer_note text,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);
