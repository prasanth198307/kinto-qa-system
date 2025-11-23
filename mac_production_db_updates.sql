-- Mac Production Database Updates
-- Run these commands in your Mac PostgreSQL database to add missing columns

-- 1. Add cancellation fields to invoice_payments table
ALTER TABLE invoice_payments 
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS cancellation_remarks TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_by VARCHAR;

-- 2. Add rejected_quantity to production_entries table (if not already present)
ALTER TABLE production_entries 
  ADD COLUMN IF NOT EXISTS rejected_quantity INTEGER DEFAULT 0;

-- 3. Add produced_cases to production_reconciliations table (if not already present)
ALTER TABLE production_reconciliations 
  ADD COLUMN IF NOT EXISTS produced_cases INTEGER DEFAULT 0;

-- 4. Add gatepass_id to sales_returns table (if not already present)
ALTER TABLE sales_returns 
  ADD COLUMN IF NOT EXISTS gatepass_id VARCHAR REFERENCES gatepasses(id);

-- 5. Add return_type to sales_returns table (if not already present)
ALTER TABLE sales_returns 
  ADD COLUMN IF NOT EXISTS return_type VARCHAR(20) NOT NULL DEFAULT 'partial';

-- Verify the updates
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'invoice_payments' 
  AND column_name IN ('cancelled_at', 'cancellation_remarks', 'cancelled_by')
ORDER BY column_name;

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'sales_returns' 
  AND column_name IN ('gatepass_id', 'return_type')
ORDER BY column_name;
