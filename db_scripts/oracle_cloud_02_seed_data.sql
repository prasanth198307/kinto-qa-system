-- ============================================================
-- KINTO SMART OPS — ESSENTIAL SEED DATA
-- Run this AFTER oracle_cloud_01_schema.sql
--
-- What this seeds:
--   1. Subscription plan catalog (Trial / Basic / Professional / Enterprise)
--   2. Super-admin tenant
--   3. Super-admin user account
--
-- Default super-admin credentials:
--   Username : superadmin
--   Password : superadmin123
--   Email    : admin@kintosmartops.com
--
-- IMPORTANT: Change the password after first login.
-- ============================================================

-- ── 1. Subscription Plans ────────────────────────────────────
INSERT INTO subscription_plans
    (name, slug, tagline, description, price_monthly, price_yearly, max_users, modules, features, is_active, is_featured, display_order, trial_days)
VALUES
(
    'Trial', 'trial',
    'Try before you buy',
    'Full access to core features for 14 days. No credit card required.',
    0, 0, 5,
    '["invoicing", "purchase_orders", "basic_inventory"]'::jsonb,
    '["Up to 5 users", "GST Invoicing", "Purchase Orders", "Inventory Management", "14-day free trial", "Email support"]'::jsonb,
    true, false, 1, 14
),
(
    'Basic', 'basic',
    'Perfect for small businesses',
    'Everything in Trial plus Gatepasses, Dispatch Tracking and Sales Orders.',
    29900, 299000, 10,
    '["invoicing", "purchase_orders", "basic_inventory", "gatepasses", "sales_orders"]'::jsonb,
    '["Up to 10 users", "GST Invoicing & Credit Notes", "Purchase Orders & Vendor Management", "Inventory Management", "Gatepasses & Dispatch Tracking", "Sales Orders", "Email + Phone support"]'::jsonb,
    true, false, 2, 0
),
(
    'Professional', 'professional',
    'For growing manufacturers',
    'Full production management, accounting, MIS analytics, and document management.',
    69900, 699000, 25,
    '["invoicing", "purchase_orders", "basic_inventory", "gatepasses", "sales_orders", "production", "quality_returns", "accounting", "mis", "expenses", "documents"]'::jsonb,
    '["Up to 25 users", "Everything in Basic", "Production & BOM Management", "Quality Control & Returns", "Double-Entry Accounting & Ledger", "MIS Analytics Dashboard", "Expense & Cash Register", "Document Management", "Priority support"]'::jsonb,
    true, true, 3, 0
),
(
    'Enterprise', 'enterprise',
    'For large-scale operations',
    'All features including WhatsApp integration and Preventive Maintenance.',
    149900, 1499000, 100,
    '["invoicing", "purchase_orders", "basic_inventory", "gatepasses", "sales_orders", "production", "quality_returns", "accounting", "mis", "expenses", "documents", "whatsapp", "maintenance"]'::jsonb,
    '["Unlimited users (up to 100)", "Everything in Professional", "WhatsApp Checklist Integration", "Machine Startup Reminders", "Preventive Maintenance (PM)", "Custom branding & white-labeling", "Dedicated account manager", "SLA-backed support"]'::jsonb,
    true, false, 4, 0
)
ON CONFLICT (slug) DO NOTHING;

-- ── 2. Super-Admin Tenant ────────────────────────────────────
INSERT INTO tenants (name, slug, plan, status, is_super_admin, max_users)
VALUES ('Kinto Admin', 'kinto-admin', 'enterprise', 'active', TRUE, 999)
ON CONFLICT (slug) DO NOTHING;

-- ── 3. Super-Admin User ──────────────────────────────────────
-- Password: superadmin123  (scrypt hash — change after first login)
-- Hash format: salt:derivedKey (scrypt N=32768, r=8, p=1, keylen=64)
INSERT INTO users (username, email, password, role, first_name, last_name, tenant_id, record_status)
SELECT
    'superadmin',
    'admin@kintosmartops.com',
    '26c945ee2d3a4d178e8822b4698d103b:1a56c4e163762550e730aaff77c60e8c07b0ded1f3d822d1959394fbf302b3cea67d6811ce1c6baee895699b62d3e6b7bc35195a01bd7a954d33b0b503a78a4c',
    'admin',
    'Kinto',
    'Super Admin',
    t.id,
    1
FROM tenants t
WHERE t.slug = 'kinto-admin'
ON CONFLICT DO NOTHING;

-- ── 4. Default Notification Config for super-admin tenant ────
INSERT INTO notification_config (id, tenant_id, whatsapp_enabled, email_enabled, test_mode)
SELECT 1, t.id, 0, 0, 1
FROM tenants t
WHERE t.slug = 'kinto-admin'
ON CONFLICT (id) DO NOTHING;

-- ── Verify ───────────────────────────────────────────────────
SELECT 'Subscription plans:'  AS check, COUNT(*) AS count FROM subscription_plans
UNION ALL
SELECT 'Tenants:',             COUNT(*) FROM tenants
UNION ALL
SELECT 'Super-admin users:',   COUNT(*) FROM users u
    JOIN tenants t ON t.id = u.tenant_id
    WHERE t.is_super_admin = TRUE;
