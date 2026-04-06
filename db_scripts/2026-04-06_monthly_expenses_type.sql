-- Add expense_type and base_amount columns to monthly_expenses
ALTER TABLE monthly_expenses 
  ADD COLUMN IF NOT EXISTS expense_type VARCHAR(20) NOT NULL DEFAULT 'fixed',
  ADD COLUMN IF NOT EXISTS base_amount INTEGER;

-- Comment: expense_type: 'fixed' | 'recurring'
-- base_amount: standard monthly amount (paise) for recurring expenses; null for fixed
