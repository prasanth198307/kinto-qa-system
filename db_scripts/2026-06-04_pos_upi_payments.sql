-- UPI QR payment tracking table for POS
CREATE TABLE IF NOT EXISTS pos_upi_payments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  session_id TEXT,
  qr_id TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  amount_paise INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',   -- pending | paid | expired | failed
  razorpay_payment_id TEXT,
  customer_vpa TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS pos_upi_payments_qr_idx ON pos_upi_payments(qr_id);
CREATE INDEX IF NOT EXISTS pos_upi_payments_tenant_idx ON pos_upi_payments(tenant_id);
