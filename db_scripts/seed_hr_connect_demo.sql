-- HR Connect plan + demo tenant (run once)
-- Plan: hr_payroll + api_hub only
INSERT INTO subscription_plans (name, slug, tagline, price_monthly, price_yearly, max_users, modules, is_active, display_order)
VALUES ('HR Connect','hr_connect','HR & Payroll with open API access',4999,49999,10,'["hr_payroll","api_hub"]',true,5)
ON CONFLICT (slug) DO UPDATE SET modules='["hr_payroll","api_hub"]';

-- Demo tenant
INSERT INTO tenants (name, slug, plan, status, max_users, billing_email, contact_name)
VALUES ('HR Connect Demo','hr-connect-demo','hr_connect','active',10,'demo@hrconnect.com','Demo Admin')
ON CONFLICT (slug) DO NOTHING;

-- Admin user (password: hrconnect123)
-- Re-generate hash using node hashPassword() if needed
