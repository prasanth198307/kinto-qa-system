-- Payment transaction log for monthly expenses
-- Supports multiple partial payments per expense, each with date, source, and payer tracking

CREATE TABLE IF NOT EXISTS monthly_expense_payments (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id varchar NOT NULL REFERENCES monthly_expenses(id),
  amount integer NOT NULL DEFAULT 0,          -- stored in paise
  payment_date varchar(10) NOT NULL,           -- YYYY-MM-DD
  payment_mode varchar(50),                    -- Cash/NEFT/UPI etc.
  paid_by varchar(150),                        -- Person name or "Company"
  payment_source varchar(30) NOT NULL DEFAULT 'company',  -- 'company' | 'personal' | 'personal_nonreimb' | 'other'
  reference_number varchar(100),
  notes varchar(500),
  record_status integer NOT NULL DEFAULT 1,
  created_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mep_expense_idx ON monthly_expense_payments(expense_id);

-- Adding paid_amount column to monthly_expenses (if not already done)
ALTER TABLE monthly_expenses ADD COLUMN IF NOT EXISTS paid_amount integer NOT NULL DEFAULT 0;
