-- Add advance_type column to customer_advances table
-- 'security_deposit' = existing Customer Advances (security deposits)
-- 'prepayment' = Advance Payments recorded in Payment Management (reduces future invoice outstanding)
ALTER TABLE customer_advances ADD COLUMN IF NOT EXISTS advance_type varchar(50) NOT NULL DEFAULT 'security_deposit';
