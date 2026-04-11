-- Update trial plan to have full access to all modules
-- This matches the landing page promise: "14-day free trial, full access to all features"
UPDATE subscription_plans 
SET modules = '["invoicing", "purchase_orders", "basic_inventory", "gatepasses", "sales_orders", "production", "quality_returns", "accounting", "mis", "expenses", "documents", "crm", "whatsapp", "maintenance", "hr_payroll"]'::jsonb
WHERE slug = 'trial';
