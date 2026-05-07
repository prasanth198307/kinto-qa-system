-- ============================================================
--  Gold ERP Demo Tenant — Full Setup Script (OCI-Safe)
--  All IDs are resolved dynamically by slug/name.
--  Safe to re-run: uses ON CONFLICT DO UPDATE / DO NOTHING.
--
--  Step 1: psql $DATABASE_URL -f db_scripts/2026-05-07_seed_gold_erp_tenant_oci.sql
--  Step 2: npx tsx db_scripts/seed_gold_erp_tenant.ts
--           (hashes the admin password — cannot be done in pure SQL)
--
--  Login after both steps:
--    Company ID : gold-erp-demo
--    Username   : goldadmin
--    Password   : Gold@1234
-- ============================================================

BEGIN;

-- ── 1. Ensure the gold_erp_plan subscription plan exists ────────────────────
INSERT INTO subscription_plans (
  name, slug, tagline, description,
  price_monthly, price_yearly, max_users,
  modules, features, is_active, display_order
)
VALUES (
  'Gold ERP',
  'gold_erp_plan',
  'The Complete ERP for Gold, Jewellery & Bullion Businesses',
  'Full-featured Gold & Jewellery ERP with 108 screens across 11 sub-modules',
  0, 0, 200,
  '["gold_erp","invoicing","purchase_orders","basic_inventory","gatepasses",
    "sales_orders","production","quality_returns","accounting","mis","expenses",
    "documents","whatsapp","maintenance","hr_payroll","crm","api_hub",
    "recurring_invoices","warehouses","projects","fixed_assets","multi_currency","pos"]'::jsonb,
  '[
    "Gold & Jewellery ERP — 108 screens across 11 sub-modules",
    "14-Stage Production Flow: Sketch → CAD → CAM → Casting → Ghat → Filing → Polish → QC → Finalize",
    "Karigar Management, Jobwork Register & Ghat Settlement",
    "Master Design Library with CAD/CAM file attachments",
    "BIS HUID Hallmarking Integration & Barcode/RFID Tagging",
    "Gold Chit Schemes — Setup, Enrollment, Collection, Maturity, Redemption",
    "Bullion Trade — Booking, Inward, Rate Cuts, Vault Physical Audit",
    "E-Catalog with Secure Sharing, 360° View & Content Protection",
    "OMS — Customer Order Portal with Live Availability & Tracking",
    "E-Commerce Store with Live MCX / IBJA Gold Rate Pricing",
    "Metal-Based Parallel Accounting (gm + ₹ ledger alongside regular ₹ books)",
    "Multi-Branch Gold Stock Consolidation & Inter-Branch Transfers",
    "Physical Inventory Audit & Anti-Theft RFID Security Alerts",
    "Loyalty & Rewards Program, Customer Buy-back Management",
    "Making Charge & Wastage Trend Analytics, Weight / Purity Loss P&L",
    "Estimation (Counter Quotation) with Live Gold Rate Auto-Pricing",
    "─── Standard SwachERP Modules Included ───",
    "GST-Compliant Invoicing — B2B, B2C, Bullion (3% GST), E-Invoice",
    "Purchase Orders, GRN & Three-Way Matching",
    "Multi-Warehouse Inventory with UOM Conversions & Serial/Lot Tracking",
    "Double-Entry Accounting — Chart of Accounts, Journals, P&L, Balance Sheet",
    "HR & Payroll — Employee Master, Payslips, PF/ESI/TDS",
    "CRM & Customer 360° — Contacts, Leads, Follow-ups",
    "WhatsApp & SMS — Order Alerts, Scheme Reminders, Catalogue Sharing",
    "Point of Sale (POS) for Retail Jewellery Counter",
    "Approval Workflows — Design Approvals, Purchase Approvals",
    "Sales Orders, Gatepasses & Dispatch Management",
    "Expense Claims, Recurring Invoices & Fixed Assets",
    "Project Management — BOQ, Milestones, Timesheets",
    "Business Analytics / MIS Dashboard",
    "Razorpay / PayU Payment Gateway Integration",
    "Up to 200 users (5 included, +₹25/extra user/month)",
    "Priority Onboarding, Training & Dedicated Support"
  ]'::jsonb,
  true,
  6
)
ON CONFLICT (slug) DO UPDATE SET
  modules       = EXCLUDED.modules,
  features      = EXCLUDED.features,
  tagline       = EXCLUDED.tagline,
  max_users     = EXCLUDED.max_users,
  is_active     = true;

-- ── 2. Create the demo tenant ───────────────────────────────────────────────
INSERT INTO tenants (name, slug, plan, status, industry, contact_name, contact_phone, billing_email, max_users)
VALUES (
  'Shree Jewellers Demo',
  'gold-erp-demo',
  'gold_erp_plan',
  'active',
  'jewellery',
  'Gold Admin',
  '9999999999',
  'golderp@swacherp.demo',
  200
)
ON CONFLICT (slug) DO UPDATE SET
  plan      = 'gold_erp_plan',
  status    = 'active',
  max_users = 200;

-- ── 3. Create subscription linked dynamically to gold_erp_plan ──────────────
INSERT INTO subscriptions (
  tenant_id, plan_id, plan_slug, billing_cycle, status,
  started_at, current_period_start, current_period_end,
  selected_modules, monthly_amount
)
SELECT
  t.id,
  p.id,
  'gold_erp_plan',
  'monthly',
  'active',
  NOW(),
  NOW(),
  NOW() + INTERVAL '10 years',
  '["gold_erp","invoicing","purchase_orders","basic_inventory","gatepasses",
    "sales_orders","production","quality_returns","accounting","mis","expenses",
    "documents","whatsapp","maintenance","hr_payroll","crm","api_hub",
    "recurring_invoices","warehouses","projects","fixed_assets","multi_currency","pos"]'::jsonb,
  0
FROM tenants t
CROSS JOIN subscription_plans p
WHERE t.slug = 'gold-erp-demo'
  AND p.slug = 'gold_erp_plan'
ON CONFLICT (tenant_id) DO UPDATE SET
  plan_id            = EXCLUDED.plan_id,
  plan_slug          = 'gold_erp_plan',
  status             = 'active',
  current_period_end = NOW() + INTERVAL '10 years',
  selected_modules   = EXCLUDED.selected_modules,
  monthly_amount     = 0;

-- ── 4. Create Admin role (dynamic tenant lookup) ─────────────────────────────
INSERT INTO roles (name, description, tenant_id)
SELECT 'Admin', 'Full access administrator', t.id
FROM tenants t
WHERE t.slug = 'gold-erp-demo'
ON CONFLICT (name, tenant_id) DO UPDATE SET description = 'Full access administrator';

-- ── 5. Seed ALL role_permissions for Admin — full access ────────────────────
INSERT INTO role_permissions (role_id, screen_key, can_view, can_create, can_edit, can_delete)
SELECT
  r.id,
  sk,
  1, 1, 1, 1
FROM roles r
JOIN tenants t ON t.id = r.tenant_id
CROSS JOIN unnest(ARRAY[
  -- Core admin / always-visible
  'overview','users','role-permissions','company-settings','notification-settings',
  -- Standard ERP modules
  'invoicing','purchase_orders','basic_inventory','gatepasses','sales_orders',
  'production','quality_returns','accounting','mis','expenses','documents',
  'whatsapp','maintenance','hr_payroll','crm','api_hub','recurring_invoices',
  'warehouses','projects','fixed_assets','multi_currency','pos',
  -- Accounting screens
  'chart_of_accounts','journal_entries','manual_journal_entry','ledger_view',
  'trial_balance','balance_sheet','profit_loss','cash_flow_statement',
  'day_book','group_summary','account_subtypes','budget_variance',
  'aging_report','cash_register','cash_register_report',
  -- MIS / reports
  'mis_dashboard','mis_sales','mis_inventory','mis_production','mis_delivery',
  'sales_dashboard','vendor_analytics','vendor_debit_notes',
  'customer_advances','bank_transactions','payment_writeoff','tds_management',
  'report_finished_goods','report_gst','purchase_returns',
  'scrap_inventory','dispatch_masters','dispatch_tracking',
  'template_management','machine_startup_reminders',
  -- Gold ERP legacy screen keys
  'gold_erp','gold_erp_production','gold_erp_karigars','gold_erp_items',
  'gold_erp_estimates','gold_erp_hallmarking','gold_erp_bullion',
  'gold_erp_repairs','gold_erp_metal_ledger','gold_erp_analytics',
  -- Gold ERP sidebar nav keys (all 41 sub-module items)
  'gold-erp-overview','gold-erp-rates','gold-erp-karigar','gold-erp-items',
  'gold-erp-estimates','gold-erp-metal-ledger','gold-erp-analytics',
  'gold-erp-production','gold-erp-jobwork','gold-erp-sketch','gold-erp-cad',
  'gold-erp-ghat','gold-erp-settlement','gold-erp-finalize',
  'gold-erp-karigar-ledger','gold-erp-repairs',
  'gold-erp-wholesale-jobwork','gold-erp-hallmarking-batches',
  'gold-erp-counter-bookings','gold-erp-customer-approvals','gold-erp-buyback',
  'gold-erp-physical-audit','gold-erp-loyalty','gold-erp-promotions',
  'gold-erp-refining','gold-erp-pos-old-gold','gold-erp-hallmarking',
  'gold-erp-bullion','gold-erp-bullion-bookings','gold-erp-vault-audit',
  'gold-erp-chit','gold-erp-chit-maturity','gold-erp-chit-defaulters',
  'gold-erp-chit-redemptions',
  'gold-erp-ecatalog','gold-erp-oms-orders','gold-erp-oms-notify',
  'gold-erp-ecommerce','gold-erp-rfid',
  'gold-erp-metal-finance','gold-erp-integrations-config'
]) AS t2(sk)
WHERE r.name = 'Admin'
  AND t.slug  = 'gold-erp-demo'
ON CONFLICT (role_id, screen_key) DO UPDATE SET
  can_view   = 1,
  can_create = 1,
  can_edit   = 1,
  can_delete = 1;

COMMIT;

-- ── Verification query ────────────────────────────────────────────────────────
SELECT
  t.id                                                           AS tenant_id,
  t.slug                                                         AS tenant_slug,
  t.plan                                                         AS tenant_plan,
  p.slug                                                         AS plan_slug,
  s.status                                                       AS sub_status,
  jsonb_array_length(s.selected_modules)                        AS module_count,
  (SELECT COUNT(*) FROM roles r2 WHERE r2.tenant_id = t.id)    AS roles_count,
  (SELECT COUNT(*) FROM role_permissions rp
   JOIN roles r2 ON r2.id = rp.role_id
   WHERE r2.tenant_id = t.id)                                   AS permissions_count
FROM tenants t
JOIN subscriptions s ON s.tenant_id = t.id
JOIN subscription_plans p ON p.id = s.plan_id
WHERE t.slug = 'gold-erp-demo';
