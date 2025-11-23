-- Add payment cancellation fields to invoice_payments table
ALTER TABLE invoice_payments 
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS cancellation_remarks TEXT,
ADD COLUMN IF NOT EXISTS cancelled_by VARCHAR REFERENCES users(id);

-- Create index for faster cancelled payment queries
CREATE INDEX IF NOT EXISTS idx_invoice_payments_cancelled 
ON invoice_payments(cancelled_at) WHERE cancelled_at IS NOT NULL;
