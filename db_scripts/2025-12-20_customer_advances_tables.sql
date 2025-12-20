-- Customer Advances and Advance Applications Tables
-- Created: 2025-12-20
-- Purpose: Track advance payments from customers before invoicing and their application to invoices

-- Customer Advances table - Track advance payments received
CREATE TABLE IF NOT EXISTS customer_advances (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  advance_number VARCHAR(100) UNIQUE NOT NULL,
  
  -- Customer reference (vendor = customer in this context)
  vendor_id VARCHAR REFERENCES vendors(id) NOT NULL,
  
  -- Receipt details
  receipt_date DATE NOT NULL,
  amount INTEGER NOT NULL, -- Amount received (in paise)
  used_amount INTEGER DEFAULT 0 NOT NULL, -- Amount applied to invoices (in paise)
  
  -- Payment details
  payment_method VARCHAR(50) NOT NULL, -- Cash, Cheque, NEFT, UPI, etc.
  reference_number VARCHAR(100), -- Transaction ID, Cheque number, etc.
  bank_name VARCHAR(255), -- Bank name for cheque/transfer
  
  -- Status tracking
  status VARCHAR(50) DEFAULT 'active' NOT NULL, -- active, fully_used, cancelled
  
  -- Metadata
  purpose TEXT, -- What the advance is for
  remarks TEXT,
  received_by VARCHAR REFERENCES users(id),
  
  -- Cancellation fields
  cancelled_at TIMESTAMP,
  cancellation_remarks TEXT,
  cancelled_by VARCHAR REFERENCES users(id),
  
  record_status INTEGER DEFAULT 1 NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for customer_advances
CREATE INDEX IF NOT EXISTS customer_advances_vendor_idx ON customer_advances(vendor_id);
CREATE INDEX IF NOT EXISTS customer_advances_status_idx ON customer_advances(status);

-- Advance Applications table - Track how advances are applied to invoices
CREATE TABLE IF NOT EXISTS advance_applications (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  advance_id VARCHAR REFERENCES customer_advances(id) NOT NULL,
  invoice_id VARCHAR REFERENCES invoices(id) NOT NULL,
  invoice_payment_id VARCHAR REFERENCES invoice_payments(id), -- Link to the payment record created
  
  -- Application details
  applied_amount INTEGER NOT NULL, -- Amount applied (in paise)
  application_date DATE NOT NULL,
  
  -- Metadata
  applied_by VARCHAR REFERENCES users(id),
  remarks TEXT,
  
  -- Reversal tracking
  reversed_at TIMESTAMP,
  reversal_remarks TEXT,
  reversed_by VARCHAR REFERENCES users(id),
  
  record_status INTEGER DEFAULT 1 NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for advance_applications
CREATE INDEX IF NOT EXISTS advance_applications_advance_idx ON advance_applications(advance_id);
CREATE INDEX IF NOT EXISTS advance_applications_invoice_idx ON advance_applications(invoice_id);

-- Comments for documentation
COMMENT ON TABLE customer_advances IS 'Tracks advance payments received from customers before invoice issuance';
COMMENT ON COLUMN customer_advances.amount IS 'Total advance amount received in paise';
COMMENT ON COLUMN customer_advances.used_amount IS 'Amount already applied to invoices in paise';
COMMENT ON COLUMN customer_advances.status IS 'active = has available balance, fully_used = completely applied, cancelled = voided';

COMMENT ON TABLE advance_applications IS 'Records each application of an advance payment to an invoice';
COMMENT ON COLUMN advance_applications.applied_amount IS 'Amount applied from this advance to this invoice in paise';
COMMENT ON COLUMN advance_applications.invoice_payment_id IS 'Links to the invoice_payments record created when applying advance';
