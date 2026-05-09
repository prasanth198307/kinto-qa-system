-- Add credit_limit to jw_ecom_customers for wholesale B2B credit checks
ALTER TABLE jw_ecom_customers ADD COLUMN IF NOT EXISTS credit_limit NUMERIC(14,2) DEFAULT 0;
-- Seed Priya Jewellers for gold-erp-demo tenant (id=13)
INSERT INTO jw_ecom_customers (tenant_id, customer_name, phone, credit_limit)
VALUES (13, 'Priya Jewellers', '9900110022', 500000)
ON CONFLICT (tenant_id, phone) DO UPDATE SET credit_limit=500000, customer_name='Priya Jewellers';
