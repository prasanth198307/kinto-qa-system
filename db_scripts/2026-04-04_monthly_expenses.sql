-- Monthly Expenses table
-- Tracks recurring/monthly bills with payment status and carry-forward support

CREATE TABLE IF NOT EXISTS monthly_expenses (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(255) NOT NULL,
  category varchar(100),
  amount integer NOT NULL DEFAULT 0,          -- stored in paise
  expense_month varchar(7) NOT NULL,          -- YYYY-MM
  due_date varchar(10),                       -- YYYY-MM-DD
  status varchar(20) NOT NULL DEFAULT 'pending',  -- 'paid' | 'pending'
  payment_date varchar(10),                   -- YYYY-MM-DD
  payment_mode varchar(50),
  reference_number varchar(100),
  carry_to_next_month integer NOT NULL DEFAULT 0,  -- 0 | 1
  notes varchar(500),
  record_status integer NOT NULL DEFAULT 1,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS me_month_idx ON monthly_expenses(expense_month);
CREATE INDEX IF NOT EXISTS me_status_idx ON monthly_expenses(status);
