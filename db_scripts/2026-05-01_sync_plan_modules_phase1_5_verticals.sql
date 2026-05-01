-- Sync subscription_plans.modules to include all new Phase 1–5 + Industry Vertical module keys
-- Run date: 2026-05-01
-- The DB is the single source of truth for plan module lists.
-- These arrays must match the constants in server/plan-features.ts.

UPDATE subscription_plans SET modules = '["invoicing","purchase_orders","basic_inventory","gatepasses","sales_orders","production","quality_returns","accounting","mis","expenses","documents","crm","whatsapp","maintenance","hr_payroll","recurring_invoices","warehouses","projects","fixed_assets","multi_currency","healthcare","education","logistics_transport","real_estate","pos","agriculture"]'::jsonb
WHERE name = 'Trial';

UPDATE subscription_plans SET modules = '["invoicing","purchase_orders","basic_inventory","gatepasses","sales_orders","expenses","documents"]'::jsonb
WHERE name = 'Basic';

UPDATE subscription_plans SET modules = '["invoicing","purchase_orders","basic_inventory","gatepasses","sales_orders","production","quality_returns","accounting","mis","expenses","documents","whatsapp","maintenance","crm","api_hub","recurring_invoices","warehouses"]'::jsonb
WHERE name = 'Professional';

UPDATE subscription_plans SET modules = '["invoicing","purchase_orders","basic_inventory","gatepasses","sales_orders","production","quality_returns","accounting","mis","expenses","documents","whatsapp","maintenance","hr_payroll","crm","api_hub","recurring_invoices","warehouses","projects","fixed_assets","multi_currency","healthcare","education","logistics_transport","real_estate","pos","agriculture"]'::jsonb
WHERE name = 'Enterprise';
