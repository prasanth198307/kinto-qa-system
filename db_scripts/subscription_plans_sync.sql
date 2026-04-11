-- Ensure subscription_plans DB modules match code definitions
-- DB is the authoritative source; middleware now always reads from DB first.

-- Basic: invoicing + purchase orders + inventory + gatepasses + sales + expenses + documents
UPDATE subscription_plans SET modules = '["invoicing","purchase_orders","basic_inventory","gatepasses","sales_orders","expenses","documents"]'::jsonb WHERE slug = 'basic';

-- Professional: basic + production + accounting + MIS + CRM + whatsapp + maintenance
UPDATE subscription_plans SET modules = '["invoicing","purchase_orders","basic_inventory","gatepasses","sales_orders","production","quality_returns","accounting","mis","expenses","documents","whatsapp","maintenance","crm"]'::jsonb WHERE slug = 'professional';

-- Enterprise: professional + hr_payroll (all modules)
UPDATE subscription_plans SET modules = '["invoicing","purchase_orders","basic_inventory","gatepasses","sales_orders","production","quality_returns","accounting","mis","expenses","documents","whatsapp","maintenance","hr_payroll","crm"]'::jsonb WHERE slug = 'enterprise';

-- Trial: full enterprise access (14-day full-access trial)
UPDATE subscription_plans SET modules = '["invoicing","purchase_orders","basic_inventory","gatepasses","sales_orders","production","quality_returns","accounting","mis","expenses","documents","crm","whatsapp","maintenance","hr_payroll"]'::jsonb WHERE slug = 'trial';
