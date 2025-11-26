-- Migration Script: Add missing columns to expense_vouchers table
-- Date: 2025-11-26
-- Description: Adds bank_name, cheque_number, and transaction_reference columns
--              required for the Cash Register import feature

-- Add bank_name column for bank transfer payments
ALTER TABLE expense_vouchers ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100);

-- Add cheque_number column for cheque payments
ALTER TABLE expense_vouchers ADD COLUMN IF NOT EXISTS cheque_number VARCHAR(50);

-- Add transaction_reference column for UPI/bank transfer references
ALTER TABLE expense_vouchers ADD COLUMN IF NOT EXISTS transaction_reference VARCHAR(100);

-- Verify columns were added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'expense_vouchers' 
  AND column_name IN ('bank_name', 'cheque_number', 'transaction_reference')
ORDER BY column_name;
