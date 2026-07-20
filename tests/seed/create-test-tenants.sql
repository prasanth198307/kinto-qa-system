-- QA Test Tenant Seed Script
-- Creates 4 tenants: IN, AE, US, EU for cross-module tests
-- Critical section (tenants + roles + users) commits first.
-- Optional sections (vendors, employees, bank accounts) are separate
-- transactions so schema mismatches don't roll back the critical data.

-- ============================================================
-- CRITICAL: TENANTS + ROLES + USERS
-- ============================================================
BEGIN;

INSERT INTO tenants (id, name, slug, plan, country, currency, timezone, tax_regime, default_locale, created_at)
VALUES
  (9001, 'Kinto India Test',    'qa-in',  'restaurant_enterprise',    'India',   'INR', 'Asia/Kolkata',    'gst',       'en', NOW()),
  (9002, 'Kinto UAE Test',      'qa-ae',  'hotel_professional',       'UAE',     'AED', 'Asia/Dubai',      'vat',       'en', NOW()),
  (9003, 'Kinto USA Test',      'qa-us',  'retail_professional',      'USA',     'USD', 'America/New_York','sales_tax', 'en', NOW()),
  (9004, 'Kinto Europe Test',   'qa-eu',  'manufacturing_enterprise', 'Germany', 'EUR', 'Europe/Berlin',   'vat',       'en', NOW()),
  (9005, 'Kinto Logistics Test','qa-log', 'logistics_enterprise',     'India',   'INR', 'Asia/Kolkata',    'gst',       'en', NOW()),
  -- Restaurant plan tier tenants (India) for plan-gate testing
  (9020, 'QA Restaurant Starter',      'qa-rst-s', 'restaurant_starter',      'India',     'INR', 'Asia/Kolkata',     'gst',       'en', NOW()),
  (9021, 'QA Restaurant Professional', 'qa-rst-p', 'restaurant_professional',  'India',     'INR', 'Asia/Kolkata',     'gst',       'en', NOW()),
  -- Restaurant enterprise tenants — one per region for multi-region tests
  (9022, 'QA Restaurant UAE',          'qa-rst-ae','restaurant_enterprise',    'UAE',       'AED', 'Asia/Dubai',       'vat',       'en', NOW()),
  (9023, 'QA Restaurant USA',          'qa-rst-us','restaurant_enterprise',    'USA',       'USD', 'America/New_York', 'sales_tax', 'en', NOW()),
  (9024, 'QA Restaurant Europe',       'qa-rst-eu','restaurant_enterprise',    'Germany',   'EUR', 'Europe/Berlin',    'vat',       'en', NOW()),
  (9025, 'QA Restaurant Singapore',    'qa-rst-sg','restaurant_enterprise',    'Singapore', 'SGD', 'Asia/Singapore',   'gst',       'en', NOW()),
  (9026, 'QA Restaurant Australia',    'qa-rst-au','restaurant_enterprise',    'Australia', 'AUD', 'Australia/Sydney', 'gst',       'en', NOW())
ON CONFLICT (id) DO UPDATE SET
  name           = EXCLUDED.name,
  slug           = EXCLUDED.slug,
  plan           = EXCLUDED.plan,
  country        = EXCLUDED.country,
  currency       = EXCLUDED.currency,
  timezone       = EXCLUDED.timezone,
  tax_regime     = EXCLUDED.tax_regime,
  default_locale = EXCLUDED.default_locale;

INSERT INTO roles (id, name, description, tenant_id, record_status)
VALUES
  -- Enterprise (9001): all modules — restaurant + shared + enterprise-only
  ('qa-role-9001',  'admin',           'Owner — Enterprise',         9001, 1),
  ('qa-role-9001m', 'manager',         'Manager — Enterprise',       9001, 1),
  ('qa-role-9001o', 'operator',        'Cashier — Enterprise',       9001, 1),
  ('qa-role-9001r', 'reviewer',        'Steward/Chef — Enterprise',  9001, 1),
  ('qa-role-9001a', 'accountsmanager', 'Accountant — Enterprise',    9001, 1),
  ('qa-role-9001h', 'manager',         'HR Manager — Enterprise',    9001, 1),
  ('qa-role-9001c', 'operator',        'CRM Executive — Enterprise', 9001, 1),
  ('qa-role-9001s', 'manager',         'Sales Manager — Enterprise', 9001, 1),
  ('qa-role-9001v', 'reviewer',        'MIS Viewer — Enterprise',    9001, 1),
  ('qa-role-9001w', 'manager',         'Warehouse Mgr — Enterprise', 9001, 1),
  ('qa-role-9001d', 'manager',         'Production Sup — Enterprise',9001, 1),
  ('qa-role-9001f', 'manager',         'Assets Mgr — Enterprise',    9001, 1),
  ('qa-role-9001j', 'manager',         'Project Mgr — Enterprise',   9001, 1),
  ('qa-role-9002', 'admin', 'QA Admin Role — UAE',                    9002, 1),
  ('qa-role-9003', 'admin', 'QA Admin Role — USA',                    9003, 1),
  ('qa-role-9004', 'admin', 'QA Admin Role — EU',                     9004, 1),
  ('qa-role-9005', 'admin', 'QA Admin Role — Logistics',              9005, 1),
  -- Starter (9020): restaurant core roles only
  ('qa-role-9020',  'admin',           'Owner — Starter',            9020, 1),
  ('qa-role-9020m', 'manager',         'Manager — Starter',          9020, 1),
  ('qa-role-9020o', 'operator',        'Cashier — Starter',          9020, 1),
  ('qa-role-9020r', 'reviewer',        'Steward/Chef — Starter',     9020, 1),
  ('qa-role-9020b', 'operator',        'Billing Staff — Starter',    9020, 1),
  ('qa-role-9020p', 'manager',         'Purchase Mgr — Starter',     9020, 1),
  -- Regional restaurant enterprise tenants (9022–9026): one admin role each
  ('qa-role-9022', 'admin', 'Owner — Restaurant UAE',       9022, 1),
  ('qa-role-9022m','manager','Manager — Restaurant UAE',    9022, 1),
  ('qa-role-9022o','operator','Cashier — Restaurant UAE',   9022, 1),
  ('qa-role-9022a','accountsmanager','Acct — Restaurant UAE',9022,1),
  ('qa-role-9023', 'admin', 'Owner — Restaurant USA',       9023, 1),
  ('qa-role-9023m','manager','Manager — Restaurant USA',    9023, 1),
  ('qa-role-9023o','operator','Cashier — Restaurant USA',   9023, 1),
  ('qa-role-9023a','accountsmanager','Acct — Restaurant USA',9023,1),
  ('qa-role-9024', 'admin', 'Owner — Restaurant EU',        9024, 1),
  ('qa-role-9024m','manager','Manager — Restaurant EU',     9024, 1),
  ('qa-role-9024o','operator','Cashier — Restaurant EU',    9024, 1),
  ('qa-role-9024a','accountsmanager','Acct — Restaurant EU', 9024,1),
  ('qa-role-9025', 'admin', 'Owner — Restaurant SG',        9025, 1),
  ('qa-role-9025m','manager','Manager — Restaurant SG',     9025, 1),
  ('qa-role-9025o','operator','Cashier — Restaurant SG',    9025, 1),
  ('qa-role-9025a','accountsmanager','Acct — Restaurant SG', 9025,1),
  ('qa-role-9026', 'admin', 'Owner — Restaurant AU',        9026, 1),
  ('qa-role-9026m','manager','Manager — Restaurant AU',     9026, 1),
  ('qa-role-9026o','operator','Cashier — Restaurant AU',    9026, 1),
  ('qa-role-9026a','accountsmanager','Acct — Restaurant AU', 9026,1),
  -- Professional (9021): restaurant + accounting + HR + CRM + sales + MIS + expenses
  ('qa-role-9021',  'admin',           'Owner — Professional',       9021, 1),
  ('qa-role-9021m', 'manager',         'Manager — Professional',     9021, 1),
  ('qa-role-9021o', 'operator',        'Cashier — Professional',     9021, 1),
  ('qa-role-9021r', 'reviewer',        'Steward/Chef — Pro',         9021, 1),
  ('qa-role-9021a', 'accountsmanager', 'Accountant — Pro',           9021, 1),
  ('qa-role-9021h', 'manager',         'HR Manager — Pro',           9021, 1),
  ('qa-role-9021c', 'operator',        'CRM Executive — Pro',        9021, 1),
  ('qa-role-9021s', 'manager',         'Sales Manager — Pro',        9021, 1),
  ('qa-role-9021v', 'reviewer',        'MIS Viewer — Pro',           9021, 1),
  ('qa-role-9021p', 'manager',         'Purchase Mgr — Pro',         9021, 1)
ON CONFLICT (id) DO UPDATE SET
  name      = EXCLUDED.name,
  tenant_id = EXCLUDED.tenant_id;

ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(100);

INSERT INTO users (id, tenant_id, username, password, role, role_id, first_name, last_name, email, record_status)
VALUES
  ('qa-user-9001', 9001, 'qa_admin_in',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin', 'qa-role-9001', 'QA Admin', 'India',     'qa-in@test.kinto',    1),
  ('qa-user-9002', 9001, 'qa_staff_in',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'staff', 'qa-role-9001', 'QA Staff', 'India',     'qa-staff@test.kinto', 1),
  ('qa-user-9003', 9002, 'qa_admin_ae',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin', 'qa-role-9002', 'QA Admin', 'UAE',       'qa-ae@test.kinto',    1),
  ('qa-user-9004', 9003, 'qa_admin_us',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin', 'qa-role-9003', 'QA Admin', 'USA',       'qa-us@test.kinto',    1),
  ('qa-user-9005', 9004, 'qa_admin_eu',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin', 'qa-role-9004', 'QA Admin', 'Europe',    'qa-eu@test.kinto',    1),
  ('qa-user-9006', 9005, 'qa_admin_log', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin',    'qa-role-9005', 'QA Admin',    'Logistics', 'qa-log@test.kinto',     1),
  -- ── Enterprise (tenant 9001 = restaurant_enterprise): 13 roles ─────────────
  ('qa-user-9010', 9001, 'qa_e_owner',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin',           'qa-role-9001',  'QA E Owner',    'India', 'qa-e-owner@test.kinto',    1),
  ('qa-user-9011', 9001, 'qa_e_manager',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'manager',         'qa-role-9001m', 'QA E Manager',  'India', 'qa-e-mgr@test.kinto',      1),
  ('qa-user-9012', 9001, 'qa_e_cashier',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'operator',        'qa-role-9001o', 'QA E Cashier',  'India', 'qa-e-cashier@test.kinto',  1),
  ('qa-user-9013', 9001, 'qa_e_steward',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'reviewer',        'qa-role-9001r', 'QA E Steward',  'India', 'qa-e-steward@test.kinto',  1),
  ('qa-user-9014', 9001, 'qa_e_chef',     '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'reviewer',        'qa-role-9001r', 'QA E Chef',     'India', 'qa-e-chef@test.kinto',     1),
  ('qa-user-9015', 9001, 'qa_e_acct',     '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'accountsmanager', 'qa-role-9001a', 'QA E Acct',     'India', 'qa-e-acct@test.kinto',     1),
  ('qa-user-9016', 9001, 'qa_e_hr',       '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'manager',         'qa-role-9001h', 'QA E HR',       'India', 'qa-e-hr@test.kinto',       1),
  ('qa-user-9017', 9001, 'qa_e_crm',      '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'operator',        'qa-role-9001c', 'QA E CRM',      'India', 'qa-e-crm@test.kinto',      1),
  ('qa-user-9018', 9001, 'qa_e_sales',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'manager',         'qa-role-9001s', 'QA E Sales',    'India', 'qa-e-sales@test.kinto',    1),
  ('qa-user-9019', 9001, 'qa_e_mis',      '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'reviewer',        'qa-role-9001v', 'QA E MIS',      'India', 'qa-e-mis@test.kinto',      1),
  ('qa-user-9019w',9001, 'qa_e_wh',       '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'manager',         'qa-role-9001w', 'QA E WH',       'India', 'qa-e-wh@test.kinto',       1),
  ('qa-user-9019d',9001, 'qa_e_prod',     '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'manager',         'qa-role-9001d', 'QA E Prod',     'India', 'qa-e-prod@test.kinto',     1),
  ('qa-user-9019f',9001, 'qa_e_assets',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'manager',         'qa-role-9001f', 'QA E Assets',   'India', 'qa-e-assets@test.kinto',   1),
  -- ── Regional Restaurant Enterprise (9022–9026): owner + manager + cashier + accountant ──
  ('qa-user-9022',  9022,'qa_ae_owner',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',          'qa-role-9022', 'QA AE Owner',  'UAE',       'qa-ae-owner@rst.kinto',  1),
  ('qa-user-9022m', 9022,'qa_ae_manager', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',        'qa-role-9022m','QA AE Mgr',    'UAE',       'qa-ae-mgr@rst.kinto',    1),
  ('qa-user-9022o', 9022,'qa_ae_cashier', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',       'qa-role-9022o','QA AE Cash',   'UAE',       'qa-ae-cash@rst.kinto',   1),
  ('qa-user-9022a', 9022,'qa_ae_acct',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-9022a','QA AE Acct',   'UAE',       'qa-ae-acct@rst.kinto',   1),
  ('qa-user-9023',  9023,'qa_us_owner',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',          'qa-role-9023', 'QA US Owner',  'USA',       'qa-us-owner@rst.kinto',  1),
  ('qa-user-9023m', 9023,'qa_us_manager', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',        'qa-role-9023m','QA US Mgr',    'USA',       'qa-us-mgr@rst.kinto',    1),
  ('qa-user-9023o', 9023,'qa_us_cashier', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',       'qa-role-9023o','QA US Cash',   'USA',       'qa-us-cash@rst.kinto',   1),
  ('qa-user-9023a', 9023,'qa_us_acct',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-9023a','QA US Acct',   'USA',       'qa-us-acct@rst.kinto',   1),
  ('qa-user-9024',  9024,'qa_eu_owner',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',          'qa-role-9024', 'QA EU Owner',  'Germany',   'qa-eu-owner@rst.kinto',  1),
  ('qa-user-9024m', 9024,'qa_eu_manager', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',        'qa-role-9024m','QA EU Mgr',    'Germany',   'qa-eu-mgr@rst.kinto',    1),
  ('qa-user-9024o', 9024,'qa_eu_cashier', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',       'qa-role-9024o','QA EU Cash',   'Germany',   'qa-eu-cash@rst.kinto',   1),
  ('qa-user-9024a', 9024,'qa_eu_acct',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-9024a','QA EU Acct',   'Germany',   'qa-eu-acct@rst.kinto',   1),
  ('qa-user-9025',  9025,'qa_sg_owner',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',          'qa-role-9025', 'QA SG Owner',  'Singapore', 'qa-sg-owner@rst.kinto',  1),
  ('qa-user-9025m', 9025,'qa_sg_manager', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',        'qa-role-9025m','QA SG Mgr',    'Singapore', 'qa-sg-mgr@rst.kinto',    1),
  ('qa-user-9025o', 9025,'qa_sg_cashier', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',       'qa-role-9025o','QA SG Cash',   'Singapore', 'qa-sg-cash@rst.kinto',   1),
  ('qa-user-9025a', 9025,'qa_sg_acct',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-9025a','QA SG Acct',   'Singapore', 'qa-sg-acct@rst.kinto',   1),
  ('qa-user-9026',  9026,'qa_au_owner',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',          'qa-role-9026', 'QA AU Owner',  'Australia', 'qa-au-owner@rst.kinto',  1),
  ('qa-user-9026m', 9026,'qa_au_manager', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',        'qa-role-9026m','QA AU Mgr',    'Australia', 'qa-au-mgr@rst.kinto',    1),
  ('qa-user-9026o', 9026,'qa_au_cashier', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',       'qa-role-9026o','QA AU Cash',   'Australia', 'qa-au-cash@rst.kinto',   1),
  ('qa-user-9026a', 9026,'qa_au_acct',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-9026a','QA AU Acct',   'Australia', 'qa-au-acct@rst.kinto',   1),
  -- ── Starter (tenant 9020 = restaurant_starter): 6 roles ──────────────────
  ('qa-user-9020',  9020, 'qa_s_owner',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin',    'qa-role-9020',  'QA S Owner',   'India', 'qa-s-owner@test.kinto',   1),
  ('qa-user-9020m', 9020, 'qa_s_manager', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'manager',  'qa-role-9020m', 'QA S Manager', 'India', 'qa-s-mgr@test.kinto',     1),
  ('qa-user-9020o', 9020, 'qa_s_cashier', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'operator', 'qa-role-9020o', 'QA S Cashier', 'India', 'qa-s-cashier@test.kinto', 1),
  ('qa-user-9020r', 9020, 'qa_s_steward', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'reviewer', 'qa-role-9020r', 'QA S Steward', 'India', 'qa-s-steward@test.kinto', 1),
  ('qa-user-9020c', 9020, 'qa_s_chef',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'reviewer', 'qa-role-9020r', 'QA S Chef',    'India', 'qa-s-chef@test.kinto',    1),
  ('qa-user-9020b', 9020, 'qa_s_billing', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'operator', 'qa-role-9020b', 'QA S Billing', 'India', 'qa-s-billing@test.kinto', 1),
  ('qa-user-9020p', 9020, 'qa_s_purchase','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'manager',  'qa-role-9020p', 'QA S Purchase','India', 'qa-s-pur@test.kinto',     1),
  -- ── Professional (tenant 9021 = restaurant_professional): 11 roles ────────
  ('qa-user-9021',  9021, 'qa_p_owner',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin',           'qa-role-9021',  'QA P Owner',   'India', 'qa-p-owner@test.kinto',   1),
  ('qa-user-9021m', 9021, 'qa_p_manager', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'manager',         'qa-role-9021m', 'QA P Manager', 'India', 'qa-p-mgr@test.kinto',     1),
  ('qa-user-9021o', 9021, 'qa_p_cashier', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'operator',        'qa-role-9021o', 'QA P Cashier', 'India', 'qa-p-cashier@test.kinto', 1),
  ('qa-user-9021r', 9021, 'qa_p_steward', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'reviewer',        'qa-role-9021r', 'QA P Steward', 'India', 'qa-p-steward@test.kinto', 1),
  ('qa-user-9021c', 9021, 'qa_p_chef',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'reviewer',        'qa-role-9021r', 'QA P Chef',    'India', 'qa-p-chef@test.kinto',    1),
  ('qa-user-9021a', 9021, 'qa_p_acct',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'accountsmanager', 'qa-role-9021a', 'QA P Acct',    'India', 'qa-p-acct@test.kinto',    1),
  ('qa-user-9021h', 9021, 'qa_p_hr',      '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'manager',         'qa-role-9021h', 'QA P HR',      'India', 'qa-p-hr@test.kinto',      1),
  ('qa-user-9021x', 9021, 'qa_p_crm',     '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'operator',        'qa-role-9021c', 'QA P CRM',     'India', 'qa-p-crm@test.kinto',     1),
  ('qa-user-9021s', 9021, 'qa_p_sales',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'manager',         'qa-role-9021s', 'QA P Sales',   'India', 'qa-p-sales@test.kinto',   1),
  ('qa-user-9021v', 9021, 'qa_p_mis',     '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'reviewer',        'qa-role-9021v', 'QA P MIS',     'India', 'qa-p-mis@test.kinto',     1),
  ('qa-user-9021p', 9021, 'qa_p_purchase','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'manager',         'qa-role-9021p', 'QA P Purchase','India', 'qa-p-pur@test.kinto',     1)
ON CONFLICT (id) DO UPDATE SET
  tenant_id     = EXCLUDED.tenant_id,
  username      = EXCLUDED.username,
  role          = EXCLUDED.role,
  role_id       = EXCLUDED.role_id,
  record_status = EXCLUDED.record_status;

COMMIT;

-- ============================================================
-- OPTIONAL: VENDORS (separate transaction — skip if schema differs)
-- ============================================================
BEGIN;
DO $$
BEGIN
  INSERT INTO vendors (id, tenant_id, name, contact_person, phone, email, gstin, payment_terms, is_active)
  VALUES
    (9001, 9001, 'Fresh Farms Pvt Ltd',    'Suresh Kumar',       '9811223344', 'fresh@farms.in', '09AABCU1111R1ZX', 30, true),
    (9002, 9001, 'Spice World Mumbai',     'Anita Sharma',       '9922334455', 'spice@world.in', '27AABCU2222R1ZX', 15, true),
    (9003, 9001, 'National Beverages',     'Raj Patel',          '9033445566', 'nb@dist.in',     '24AABCU3333R1ZX', 45, true),
    (9004, 9002, 'UAE Fresh Produce LLC',  'Khalid Al Mansoori', '+97150111',  'fresh@uae.ae',   NULL,              30, true),
    (9005, 9002, 'Dubai Linen Supplies',   'Fatima Hassan',      '+97150222',  'linen@dubai.ae', NULL,              15, true),
    (9006, 9002, 'Gulf F&B Wholesale',     'Ahmed Rashid',       '+97150333',  'fnb@gulf.ae',    NULL,              45, true),
    (9007, 9003, 'TechSource Distributors','Mike Johnson',       '5559001234', 'ts@dist.us',     NULL,              30, true),
    (9008, 9003, 'Office Supplies Direct', 'Sarah Williams',     '5559002345', 'osd@direct.us',  NULL,              15, true),
    (9009, 9003, 'West Coast Electronics', 'Tom Davis',          '5559003456', 'wce@elec.us',    NULL,              45, true),
    (9010, 9004, 'Stahl AG München',       'Hans Mueller',       '+4989111222','stahl@ag.de',    'DE111222333',     30, true),
    (9011, 9004, 'European Parts GmbH',    'Anna Schmidt',       '+4930222333','ep@parts.de',    'DE222333444',     15, true),
    (9012, 9004, 'Nordic Supplies AB',     'Erik Johansson',     '+46812345',  'ns@supplies.se', 'SE123456789001',  45, true)
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'vendors insert skipped: %', SQLERRM;
END;
$$;
COMMIT;

-- ============================================================
-- OPTIONAL: EMPLOYEES (separate transaction)
-- ============================================================
BEGIN;
DO $$
BEGIN
  INSERT INTO hr_employees (id, tenant_id, employee_id, first_name, last_name, designation, department, basic_salary, phone, email, date_of_joining, is_active)
  VALUES
    (9001, 9001, 'EMP-IN-001', 'Vikram', 'Mehta',     'Head Chef',        'Kitchen',   45000, '9800001111', 'vikram@kintoin.test',  '2024-01-01', true),
    (9002, 9001, 'EMP-IN-002', 'Sunita', 'Rao',       'Floor Manager',    'FOH',       35000, '9800002222', 'sunita@kintoin.test',  '2024-01-01', true),
    (9003, 9002, 'EMP-AE-001', 'Faisal', 'Al Hashmi', 'Front Desk Mgr',   'FrontDesk', 12000, '+971551111', 'faisal@kintoae.test',  '2024-01-01', true),
    (9004, 9002, 'EMP-AE-002', 'Noura',  'Al Farsi',  'Housekeeping Sup', 'HK',         8500, '+971552222', 'noura@kintoae.test',   '2024-01-01', true),
    (9005, 9003, 'EMP-US-001', 'James',  'Wilson',    'Store Manager',    'Sales',     72000, '5559010001', 'james@kintous.test',   '2024-01-01', true),
    (9006, 9003, 'EMP-US-002', 'Emily',  'Chen',      'Inventory Lead',   'Warehouse', 58000, '5559010002', 'emily@kintous.test',   '2024-01-01', true),
    (9007, 9004, 'EMP-EU-001', 'Klaus',  'Becker',    'Production Mgr',   'Production',75000, '+4915111111','klaus@kintoeu.test',   '2024-01-01', true),
    (9008, 9004, 'EMP-EU-002', 'Ingrid', 'Braun',     'Quality Inspector','QA',         62000, '+4915222222','ingrid@kintoeu.test',  '2024-01-01', true)
  ON CONFLICT (id) DO UPDATE SET first_name = EXCLUDED.first_name;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'hr_employees insert skipped: %', SQLERRM;
END;
$$;
COMMIT;

-- ============================================================
-- OPTIONAL: BANK ACCOUNTS (separate transaction)
-- ============================================================
BEGIN;
DO $$
BEGIN
  INSERT INTO bank_accounts (id, tenant_id, account_name, bank_name, account_number, ifsc_code, opening_balance, current_balance, is_active)
  VALUES
    (9001, 9001, 'HDFC Main Account',   'HDFC Bank',     '50100123456789',          'HDFC0001234', 500000, 500000, true),
    (9002, 9002, 'Emirates NBD Main',   'Emirates NBD',  'AE070331234567890123456', NULL,          200000, 200000, true),
    (9003, 9003, 'Chase Business Chk',  'JPMorgan Chase','123456789012',            NULL,          150000, 150000, true),
    (9004, 9004, 'Deutsche Bank Konto', 'Deutsche Bank', 'DE89370400440532013000',  NULL,          300000, 300000, true)
  ON CONFLICT (id) DO UPDATE SET account_name = EXCLUDED.account_name;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'bank_accounts insert skipped: %', SQLERRM;
END;
$$;
COMMIT;

-- ============================================================
-- REGIONAL RESTAURANT TENANTS (9022–9026) — outlets + menu
-- ============================================================
BEGIN;
DO $$
BEGIN
  INSERT INTO restaurant_outlets (id, tenant_id, name, address, phone, is_active)
  VALUES
    (9040, 9022, 'QA Dubai Outlet',       'Sheikh Zayed Rd, Dubai',         '+97144001111', 1),
    (9041, 9023, 'QA NYC Outlet',          '5th Avenue, New York, NY',       '+12125551234', 1),
    (9042, 9024, 'QA Berlin Outlet',       'Unter den Linden 1, Berlin',     '+493012345678',1),
    (9043, 9025, 'QA Singapore Outlet',    'Orchard Road, Singapore',        '+6562221234',  1),
    (9044, 9026, 'QA Sydney Outlet',       'George Street, Sydney NSW',      '+61292221234', 1)
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'restaurant_outlets regional skipped: %', SQLERRM;
END;
$$;
COMMIT;

BEGIN;
DO $$
BEGIN
  INSERT INTO restaurant_tables (id, tenant_id, outlet_id, table_number, capacity, status)
  VALUES
    (9040, 9022, 9040, 'T1', 4, 'available'),
    (9041, 9022, 9040, 'T2', 6, 'available'),
    (9042, 9023, 9041, 'T1', 4, 'available'),
    (9043, 9023, 9041, 'T2', 4, 'available'),
    (9044, 9024, 9042, 'T1', 4, 'available'),
    (9045, 9024, 9042, 'T2', 6, 'available'),
    (9046, 9025, 9043, 'T1', 4, 'available'),
    (9047, 9025, 9043, 'T2', 4, 'available'),
    (9048, 9026, 9044, 'T1', 4, 'available'),
    (9049, 9026, 9044, 'T2', 6, 'available')
  ON CONFLICT (id) DO UPDATE SET table_number = EXCLUDED.table_number;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'restaurant_tables regional skipped: %', SQLERRM;
END;
$$;
COMMIT;

BEGIN;
DO $$
BEGIN
  INSERT INTO restaurant_menu_categories (id, tenant_id, name, sort_order, is_active)
  VALUES
    -- UAE (Arabic cuisine)
    (9040, 9022, 'Mezze',       1, 1),
    (9041, 9022, 'Grills',      2, 1),
    (9042, 9022, 'Beverages',   3, 1),
    -- USA (American)
    (9043, 9023, 'Starters',    1, 1),
    (9044, 9023, 'Burgers',     2, 1),
    (9045, 9023, 'Drinks',      3, 1),
    -- EU (European)
    (9046, 9024, 'Starters',    1, 1),
    (9047, 9024, 'Mains',       2, 1),
    (9048, 9024, 'Desserts',    3, 1),
    -- Singapore
    (9049, 9025, 'Hawker Picks',1, 1),
    (9050, 9025, 'Rice & Noodles',2,1),
    (9051, 9025, 'Drinks',      3, 1),
    -- Australia
    (9052, 9026, 'Small Plates',1, 1),
    (9053, 9026, 'Mains',       2, 1),
    (9054, 9026, 'Drinks',      3, 1)
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'restaurant_menu_categories regional skipped: %', SQLERRM;
END;
$$;
COMMIT;

BEGIN;
DO $$
BEGIN
  INSERT INTO restaurant_menu_items (id, tenant_id, category_id, name, price, tax_rate, is_active)
  VALUES
    -- UAE items (AED prices, 5% VAT)
    (9040, 9022, 9040, 'Hummus',           25,  5, 1),
    (9041, 9022, 9040, 'Fattoush Salad',   30,  5, 1),
    (9042, 9022, 9041, 'Mixed Grill',      85,  5, 1),
    (9043, 9022, 9042, 'Jallab',           18,  5, 1),
    -- USA items (USD prices, sales tax varies by state)
    (9044, 9023, 9043, 'Chicken Wings',    12,  8, 1),
    (9045, 9023, 9044, 'Classic Burger',   15,  8, 1),
    (9046, 9023, 9044, 'BBQ Burger',       17,  8, 1),
    (9047, 9023, 9045, 'Iced Lemonade',     5,  8, 1),
    -- EU items (EUR prices, 19% VAT in Germany)
    (9048, 9024, 9046, 'Soup of the Day',   8, 19, 1),
    (9049, 9024, 9047, 'Schnitzel',        18, 19, 1),
    (9050, 9024, 9048, 'Apfelstrudel',      7, 19, 1),
    -- Singapore items (SGD prices, 9% GST)
    (9051, 9025, 9049, 'Chicken Rice',      6,  9, 1),
    (9052, 9025, 9050, 'Laksa',             8,  9, 1),
    (9053, 9025, 9051, 'Teh Tarik',         3,  9, 1),
    -- Australia items (AUD prices, 10% GST)
    (9054, 9026, 9052, 'Prawn Cocktail',   18, 10, 1),
    (9055, 9026, 9053, 'Barramundi',       34, 10, 1),
    (9056, 9026, 9054, 'Flat White',        5, 10, 1)
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'restaurant_menu_items regional skipped: %', SQLERRM;
END;
$$;
COMMIT;

BEGIN;
DO $$
BEGIN
  INSERT INTO vendors (id, tenant_id, name, contact_person, phone, email, payment_terms, is_active)
  VALUES
    (9040, 9022, 'Dubai Fresh Produce LLC',    'Khalid Hassan',    '+97150100001','fresh@dxb.ae',      30, true),
    (9041, 9023, 'NYC Food Distributors Inc',  'Mike Thompson',    '+12125559001','nycfood@dist.us',   15, true),
    (9042, 9024, 'Berlin Lebensmittel GmbH',   'Klaus Weber',      '+4930100001', 'berlin@lebens.de',  30, true),
    (9043, 9025, 'SG Fresh Pte Ltd',           'Lee Wei Ming',     '+6591001001', 'fresh@sg.com',      15, true),
    (9044, 9026, 'Sydney Fresh Pty Ltd',       'James Wilson',     '+61411001001','fresh@sydney.au',   30, true)
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'vendors regional skipped: %', SQLERRM;
END;
$$;
COMMIT;

BEGIN;
DO $$
BEGIN
  INSERT INTO bank_accounts (id, tenant_id, account_name, bank_name, account_number, opening_balance, current_balance, is_active)
  VALUES
    (9040, 9022, 'Emirates NBD Dubai',   'Emirates NBD',    'AE070331234999888777', 500000, 500000, true),
    (9041, 9023, 'Chase NYC Business',   'JPMorgan Chase',  '987654321012',         200000, 200000, true),
    (9042, 9024, 'Deutsche Bank Berlin', 'Deutsche Bank',   'DE89370400440532019999',300000,300000, true),
    (9043, 9025, 'DBS Singapore',        'DBS Bank',        '0039123456',           300000, 300000, true),
    (9044, 9026, 'ANZ Sydney',           'ANZ Bank',        '012-345 123456789',    250000, 250000, true)
  ON CONFLICT (id) DO UPDATE SET account_name = EXCLUDED.account_name;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'bank_accounts regional skipped: %', SQLERRM;
END;
$$;
COMMIT;

-- ============================================================
-- RESTAURANT STARTER (9020) — outlets, menu, vendors, employees
-- ============================================================
BEGIN;
DO $$
BEGIN
  INSERT INTO restaurant_outlets (id, tenant_id, name, address, phone, is_active)
  VALUES (9020, 9020, 'QA Starter Outlet', '10 MG Road, Bengaluru', '9900001111', 1)
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'restaurant_outlets 9020 skipped: %', SQLERRM;
END;
$$;
COMMIT;

BEGIN;
DO $$
BEGIN
  INSERT INTO restaurant_tables (id, tenant_id, outlet_id, table_number, capacity, status)
  VALUES
    (9020, 9020, 9020, 'T1', 4, 'available'),
    (9021, 9020, 9020, 'T2', 4, 'available'),
    (9022, 9020, 9020, 'T3', 6, 'available')
  ON CONFLICT (id) DO UPDATE SET table_number = EXCLUDED.table_number;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'restaurant_tables 9020 skipped: %', SQLERRM;
END;
$$;
COMMIT;

BEGIN;
DO $$
BEGIN
  INSERT INTO restaurant_menu_categories (id, tenant_id, name, sort_order, is_active)
  VALUES
    (9020, 9020, 'Starters',    1, 1),
    (9021, 9020, 'Main Course', 2, 1),
    (9022, 9020, 'Beverages',   3, 1)
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'restaurant_menu_categories 9020 skipped: %', SQLERRM;
END;
$$;
COMMIT;

BEGIN;
DO $$
BEGIN
  INSERT INTO restaurant_menu_items (id, tenant_id, category_id, name, price, tax_rate, is_active)
  VALUES
    (9020, 9020, 9020, 'Veg Spring Roll',   120, 5, 1),
    (9021, 9020, 9020, 'Paneer Tikka',      180, 5, 1),
    (9022, 9020, 9021, 'Dal Tadka',         150, 5, 1),
    (9023, 9020, 9021, 'Butter Naan',        40, 5, 1),
    (9024, 9020, 9022, 'Masala Chai',        30, 5, 1),
    (9025, 9020, 9022, 'Fresh Lime Soda',    60, 5, 1)
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'restaurant_menu_items 9020 skipped: %', SQLERRM;
END;
$$;
COMMIT;

BEGIN;
DO $$
BEGIN
  INSERT INTO vendors (id, tenant_id, name, contact_person, phone, email, payment_terms, is_active)
  VALUES
    (9020, 9020, 'Fresh Veggies Supplier',  'Gopal Singh',  '9811000001', 'fresh@veggies.in', 15, true),
    (9021, 9020, 'QA Starter Beverages',    'Priya Reddy',  '9811000002', 'qa@bev.in',        30, true)
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'vendors 9020 skipped: %', SQLERRM;
END;
$$;
COMMIT;

BEGIN;
DO $$
BEGIN
  INSERT INTO hr_employees (id, tenant_id, employee_id, first_name, last_name, designation, department, basic_salary, phone, email, date_of_joining, is_active)
  VALUES
    (9020, 9020, 'EMP-RST-S01', 'Ravi',   'Kumar',   'Head Chef',      'Kitchen', 25000, '9900010001', 'ravi@qa-rst-s.test',  '2025-01-01', true),
    (9021, 9020, 'EMP-RST-S02', 'Meena',  'Pillai',  'Floor Manager',  'FOH',     20000, '9900010002', 'meena@qa-rst-s.test', '2025-01-01', true)
  ON CONFLICT (id) DO UPDATE SET first_name = EXCLUDED.first_name;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'hr_employees 9020 skipped: %', SQLERRM;
END;
$$;
COMMIT;

BEGIN;
DO $$
BEGIN
  INSERT INTO bank_accounts (id, tenant_id, account_name, bank_name, account_number, ifsc_code, opening_balance, current_balance, is_active)
  VALUES
    (9020, 9020, 'Starter HDFC Account', 'HDFC Bank', '50100987654321', 'HDFC0009876', 100000, 100000, true)
  ON CONFLICT (id) DO UPDATE SET account_name = EXCLUDED.account_name;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'bank_accounts 9020 skipped: %', SQLERRM;
END;
$$;
COMMIT;

-- ============================================================
-- RESTAURANT PROFESSIONAL (9021) — outlets, menu, vendors, employees, bank
-- ============================================================
BEGIN;
DO $$
BEGIN
  INSERT INTO restaurant_outlets (id, tenant_id, name, address, phone, is_active)
  VALUES
    (9030, 9021, 'QA Pro Main Outlet',   '50 Brigade Road, Bengaluru', '9900002222', 1),
    (9031, 9021, 'QA Pro Cloud Kitchen', '10 Koramangala, Bengaluru',  '9900002223', 1)
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'restaurant_outlets 9021 skipped: %', SQLERRM;
END;
$$;
COMMIT;

BEGIN;
DO $$
BEGIN
  INSERT INTO restaurant_tables (id, tenant_id, outlet_id, table_number, capacity, status)
  VALUES
    (9030, 9021, 9030, 'A1', 4, 'available'),
    (9031, 9021, 9030, 'A2', 4, 'available'),
    (9032, 9021, 9030, 'A3', 6, 'available'),
    (9033, 9021, 9031, 'B1', 2, 'available')
  ON CONFLICT (id) DO UPDATE SET table_number = EXCLUDED.table_number;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'restaurant_tables 9021 skipped: %', SQLERRM;
END;
$$;
COMMIT;

BEGIN;
DO $$
BEGIN
  INSERT INTO restaurant_menu_categories (id, tenant_id, name, sort_order, is_active)
  VALUES
    (9030, 9021, 'Soups & Salads', 1, 1),
    (9031, 9021, 'Mains',          2, 1),
    (9032, 9021, 'Desserts',       3, 1),
    (9033, 9021, 'Drinks',         4, 1)
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'restaurant_menu_categories 9021 skipped: %', SQLERRM;
END;
$$;
COMMIT;

BEGIN;
DO $$
BEGIN
  INSERT INTO restaurant_menu_items (id, tenant_id, category_id, name, price, tax_rate, is_active)
  VALUES
    (9030, 9021, 9030, 'Tomato Soup',       90,  5, 1),
    (9031, 9021, 9030, 'Caesar Salad',      160, 5, 1),
    (9032, 9021, 9031, 'Chicken Biryani',   280, 5, 1),
    (9033, 9021, 9031, 'Mutton Rogan Josh', 380, 5, 1),
    (9034, 9021, 9031, 'Paneer Makhani',    220, 5, 1),
    (9035, 9021, 9032, 'Gulab Jamun',        80, 5, 1),
    (9036, 9021, 9033, 'Fresh Juice',       100, 5, 1),
    (9037, 9021, 9033, 'Cold Coffee',       130, 5, 1)
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'restaurant_menu_items 9021 skipped: %', SQLERRM;
END;
$$;
COMMIT;

BEGIN;
DO $$
BEGIN
  INSERT INTO vendors (id, tenant_id, name, contact_person, phone, email, payment_terms, is_active)
  VALUES
    (9030, 9021, 'Pro Meat Suppliers',    'Salim Khan',   '9922000001', 'meat@pro.in',   15, true),
    (9031, 9021, 'Pro Dairy & Produce',   'Kavya Nair',   '9922000002', 'dairy@pro.in',  30, true),
    (9032, 9021, 'Pro Beverage Dist.',    'Arvind Gupta', '9922000003', 'bev@prodist.in',45, true)
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'vendors 9021 skipped: %', SQLERRM;
END;
$$;
COMMIT;

BEGIN;
DO $$
BEGIN
  INSERT INTO hr_employees (id, tenant_id, employee_id, first_name, last_name, designation, department, basic_salary, phone, email, date_of_joining, is_active)
  VALUES
    (9030, 9021, 'EMP-RST-P01', 'Arun',    'Sharma',   'Head Chef',      'Kitchen',  35000, '9900020001', 'arun@qa-rst-p.test',    '2025-01-01', true),
    (9031, 9021, 'EMP-RST-P02', 'Divya',   'Menon',    'Floor Manager',  'FOH',      28000, '9900020002', 'divya@qa-rst-p.test',   '2025-01-01', true),
    (9032, 9021, 'EMP-RST-P03', 'Sanjay',  'Verma',    'Accountant',     'Finance',  32000, '9900020003', 'sanjay@qa-rst-p.test',  '2025-01-01', true),
    (9033, 9021, 'EMP-RST-P04', 'Ananya',  'Das',      'HR Executive',   'HR',       25000, '9900020004', 'ananya@qa-rst-p.test',  '2025-01-01', true),
    (9034, 9021, 'EMP-RST-P05', 'Kiran',   'Bose',     'CRM Executive',  'CRM',      22000, '9900020005', 'kiran@qa-rst-p.test',   '2025-01-01', true)
  ON CONFLICT (id) DO UPDATE SET first_name = EXCLUDED.first_name;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'hr_employees 9021 skipped: %', SQLERRM;
END;
$$;
COMMIT;

BEGIN;
DO $$
BEGIN
  INSERT INTO bank_accounts (id, tenant_id, account_name, bank_name, account_number, ifsc_code, opening_balance, current_balance, is_active)
  VALUES
    (9030, 9021, 'Pro ICICI Main',   'ICICI Bank', '003601521234',   'ICIC0000036', 500000, 500000, true),
    (9031, 9021, 'Pro Petty Cash',   'HDFC Bank',  '50100111222333', 'HDFC0001112',  50000,  50000, true)
  ON CONFLICT (id) DO UPDATE SET account_name = EXCLUDED.account_name;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'bank_accounts 9021 skipped: %', SQLERRM;
END;
$$;
COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════════
-- NGO ERP (9400–9426)
-- ═══════════════════════════════════════════════════════════════════════════════
BEGIN;
DO $$
BEGIN
  INSERT INTO tenants (id, name, slug, plan, country, currency, timezone, tax_regime, default_locale, created_at)
  VALUES
    (9400, 'QA NGO Enterprise India',    'qa-ngo-e',  'ngo_enterprise',    'India',       'INR', 'Asia/Kolkata',    'gst',       'en', NOW()),
    (9420, 'QA NGO Starter India',       'qa-ngo-s',  'ngo_starter',       'India',       'INR', 'Asia/Kolkata',    'gst',       'en', NOW()),
    (9421, 'QA NGO Professional India',  'qa-ngo-p',  'ngo_professional',  'India',       'INR', 'Asia/Kolkata',    'gst',       'en', NOW()),
    (9422, 'QA NGO UAE',                 'qa-ngo-ae', 'ngo_enterprise',    'UAE',         'AED', 'Asia/Dubai',      'vat',       'en', NOW()),
    (9423, 'QA NGO USA',                 'qa-ngo-us', 'ngo_enterprise',    'USA',         'USD', 'America/New_York','sales_tax', 'en', NOW()),
    (9424, 'QA NGO Germany',             'qa-ngo-eu', 'ngo_enterprise',    'Germany',     'EUR', 'Europe/Berlin',   'vat',       'en', NOW()),
    (9425, 'QA NGO Singapore',           'qa-ngo-sg', 'ngo_enterprise',    'Singapore',   'SGD', 'Asia/Singapore',  'gst',       'en', NOW()),
    (9426, 'QA NGO Australia',           'qa-ngo-au', 'ngo_enterprise',    'Australia',   'AUD', 'Australia/Sydney','gst',       'en', NOW())
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'tenants NGO skipped: %', SQLERRM;
END;
$$;
COMMIT;

BEGIN;
DO $$
BEGIN
  INSERT INTO roles (id, name, description, tenant_id, record_status)
  VALUES
    -- Enterprise India (9400)
    ('qa-role-9400',  'admin',           'Executive Director — NGO Enterprise',  9400, 1),
    ('qa-role-9400m', 'manager',         'Program Manager — NGO Enterprise',     9400, 1),
    ('qa-role-9400o', 'operator',        'Field Worker — NGO Enterprise',        9400, 1),
    ('qa-role-9400r', 'reviewer',        'Auditor — NGO Enterprise',             9400, 1),
    ('qa-role-9400a', 'accountsmanager', 'Finance Manager — NGO Enterprise',     9400, 1),
    -- Starter India (9420)
    ('qa-role-9420',  'admin',           'Executive Director — NGO Starter',     9420, 1),
    ('qa-role-9420m', 'manager',         'Program Manager — NGO Starter',        9420, 1),
    ('qa-role-9420o', 'operator',        'Field Worker — NGO Starter',           9420, 1),
    ('qa-role-9420r', 'reviewer',        'Auditor — NGO Starter',                9420, 1),
    -- Professional India (9421)
    ('qa-role-9421',  'admin',           'Executive Director — NGO Pro',         9421, 1),
    ('qa-role-9421m', 'manager',         'Program Manager — NGO Pro',            9421, 1),
    ('qa-role-9421o', 'operator',        'Field Worker — NGO Pro',               9421, 1),
    ('qa-role-9421r', 'reviewer',        'Auditor — NGO Pro',                    9421, 1),
    ('qa-role-9421a', 'accountsmanager', 'Finance Manager — NGO Pro',            9421, 1),
    -- Regional enterprise
    ('qa-role-9422',  'admin', 'Exec Director — NGO UAE',         9422, 1),
    ('qa-role-9423',  'admin', 'Exec Director — NGO USA',         9423, 1),
    ('qa-role-9424',  'admin', 'Exec Director — NGO EU',          9424, 1),
    ('qa-role-9425',  'admin', 'Exec Director — NGO SG',          9425, 1),
    ('qa-role-9426',  'admin', 'Exec Director — NGO AU',          9426, 1)
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'roles NGO skipped: %', SQLERRM;
END;
$$;
COMMIT;

BEGIN;
DO $$
BEGIN
  INSERT INTO users (id, tenant_id, username, password, role, role_id, first_name, last_name, email, record_status)
  VALUES
    -- Enterprise India (9400)
    ('qa-u-9400',  9400, 'qa_ngo_e_admin',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin',           'qa-role-9400',  'QA NGO', 'ExDir',    'qa-ngo-e-admin@test.kinto',    1),
    ('qa-u-9401',  9400, 'qa_ngo_e_mgr',     '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'manager',         'qa-role-9400m', 'QA NGO', 'PrgMgr',   'qa-ngo-e-mgr@test.kinto',      1),
    ('qa-u-9402',  9400, 'qa_ngo_e_field',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'operator',        'qa-role-9400o', 'QA NGO', 'Field',    'qa-ngo-e-field@test.kinto',    1),
    ('qa-u-9403',  9400, 'qa_ngo_e_audit',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'reviewer',        'qa-role-9400r', 'QA NGO', 'Auditor',  'qa-ngo-e-audit@test.kinto',    1),
    ('qa-u-9404',  9400, 'qa_ngo_e_finance', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'accountsmanager', 'qa-role-9400a', 'QA NGO', 'Finance',  'qa-ngo-e-finance@test.kinto',  1),
    -- Starter India (9420)
    ('qa-u-9420',  9420, 'qa_ngo_s_admin',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin',           'qa-role-9420',  'QA NGO', 'SAdmin',   'qa-ngo-s-admin@test.kinto',    1),
    ('qa-u-9421s', 9420, 'qa_ngo_s_mgr',     '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'manager',         'qa-role-9420m', 'QA NGO', 'SMgr',     'qa-ngo-s-mgr@test.kinto',      1),
    ('qa-u-9422s', 9420, 'qa_ngo_s_field',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'operator',        'qa-role-9420o', 'QA NGO', 'SField',   'qa-ngo-s-field@test.kinto',    1),
    ('qa-u-9423s', 9420, 'qa_ngo_s_audit',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'reviewer',        'qa-role-9420r', 'QA NGO', 'SAudit',   'qa-ngo-s-audit@test.kinto',    1),
    -- Professional India (9421)
    ('qa-u-9421',  9421, 'qa_ngo_p_admin',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin',           'qa-role-9421',  'QA NGO', 'PAdmin',   'qa-ngo-p-admin@test.kinto',    1),
    ('qa-u-9421m', 9421, 'qa_ngo_p_mgr',     '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'manager',         'qa-role-9421m', 'QA NGO', 'PMgr',     'qa-ngo-p-mgr@test.kinto',      1),
    ('qa-u-9421o', 9421, 'qa_ngo_p_field',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'operator',        'qa-role-9421o', 'QA NGO', 'PField',   'qa-ngo-p-field@test.kinto',    1),
    ('qa-u-9421r', 9421, 'qa_ngo_p_audit',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'reviewer',        'qa-role-9421r', 'QA NGO', 'PAudit',   'qa-ngo-p-audit@test.kinto',    1),
    ('qa-u-9421a', 9421, 'qa_ngo_p_finance', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'accountsmanager', 'qa-role-9421a', 'QA NGO', 'PFinance', 'qa-ngo-p-finance@test.kinto',  1),
    -- Regional admins
    ('qa-u-9422',  9422, 'qa_ngo_ae_admin',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin', 'qa-role-9422', 'QA NGO', 'UAE',  'qa-ngo-ae@test.kinto', 1),
    ('qa-u-9423',  9423, 'qa_ngo_us_admin',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin', 'qa-role-9423', 'QA NGO', 'USA',  'qa-ngo-us@test.kinto', 1),
    ('qa-u-9424',  9424, 'qa_ngo_eu_admin',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin', 'qa-role-9424', 'QA NGO', 'EU',   'qa-ngo-eu@test.kinto', 1),
    ('qa-u-9425',  9425, 'qa_ngo_sg_admin',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin', 'qa-role-9425', 'QA NGO', 'SG',   'qa-ngo-sg@test.kinto', 1),
    ('qa-u-9426',  9426, 'qa_ngo_au_admin',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin', 'qa-role-9426', 'QA NGO', 'AU',   'qa-ngo-au@test.kinto', 1)
  ON CONFLICT (id) DO UPDATE SET username = EXCLUDED.username;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'users NGO skipped: %', SQLERRM;
END;
$$;
COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════════
-- NIDHI COMPANY ERP (9500–9526)
-- ═══════════════════════════════════════════════════════════════════════════════
BEGIN;
DO $$
BEGIN
  INSERT INTO tenants (id, name, slug, plan, country, currency, timezone, tax_regime, default_locale, created_at)
  VALUES
    (9500, 'QA Nidhi Enterprise India',   'qa-nidhi-e',  'nidhi_enterprise',   'India',       'INR', 'Asia/Kolkata',    'gst',       'en', NOW()),
    (9520, 'QA Nidhi Starter India',      'qa-nidhi-s',  'nidhi_starter',      'India',       'INR', 'Asia/Kolkata',    'gst',       'en', NOW()),
    (9521, 'QA Nidhi Professional India', 'qa-nidhi-p',  'nidhi_professional', 'India',       'INR', 'Asia/Kolkata',    'gst',       'en', NOW()),
    (9522, 'QA Nidhi UAE',                'qa-nidhi-ae', 'nidhi_enterprise',   'UAE',         'AED', 'Asia/Dubai',      'vat',       'en', NOW()),
    (9523, 'QA Nidhi USA',                'qa-nidhi-us', 'nidhi_enterprise',   'USA',         'USD', 'America/New_York','sales_tax', 'en', NOW()),
    (9524, 'QA Nidhi Germany',            'qa-nidhi-eu', 'nidhi_enterprise',   'Germany',     'EUR', 'Europe/Berlin',   'vat',       'en', NOW()),
    (9525, 'QA Nidhi Singapore',          'qa-nidhi-sg', 'nidhi_enterprise',   'Singapore',   'SGD', 'Asia/Singapore',  'gst',       'en', NOW()),
    (9526, 'QA Nidhi Australia',          'qa-nidhi-au', 'nidhi_enterprise',   'Australia',   'AUD', 'Australia/Sydney','gst',       'en', NOW())
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'tenants Nidhi skipped: %', SQLERRM;
END;
$$;
COMMIT;

BEGIN;
DO $$
BEGIN
  INSERT INTO roles (id, name, description, tenant_id, record_status)
  VALUES
    ('qa-role-9500',  'admin',           'CEO/Director — Nidhi Enterprise',  9500, 1),
    ('qa-role-9500m', 'manager',         'Branch Manager — Nidhi Enterprise',9500, 1),
    ('qa-role-9500o', 'operator',        'Loan Officer — Nidhi Enterprise',  9500, 1),
    ('qa-role-9500r', 'reviewer',        'Internal Auditor — Nidhi Ent',     9500, 1),
    ('qa-role-9500a', 'accountsmanager', 'Accountant — Nidhi Enterprise',    9500, 1),
    ('qa-role-9520',  'admin',           'CEO/Director — Nidhi Starter',     9520, 1),
    ('qa-role-9520m', 'manager',         'Branch Manager — Nidhi Starter',   9520, 1),
    ('qa-role-9520o', 'operator',        'Loan Officer — Nidhi Starter',     9520, 1),
    ('qa-role-9520r', 'reviewer',        'Internal Auditor — Nidhi Starter', 9520, 1),
    ('qa-role-9521',  'admin',           'CEO/Director — Nidhi Pro',         9521, 1),
    ('qa-role-9521m', 'manager',         'Branch Manager — Nidhi Pro',       9521, 1),
    ('qa-role-9521o', 'operator',        'Loan Officer — Nidhi Pro',         9521, 1),
    ('qa-role-9521r', 'reviewer',        'Internal Auditor — Nidhi Pro',     9521, 1),
    ('qa-role-9521a', 'accountsmanager', 'Accountant — Nidhi Pro',           9521, 1),
    ('qa-role-9522',  'admin', 'CEO — Nidhi UAE', 9522, 1),
    ('qa-role-9523',  'admin', 'CEO — Nidhi USA', 9523, 1),
    ('qa-role-9524',  'admin', 'CEO — Nidhi EU',  9524, 1),
    ('qa-role-9525',  'admin', 'CEO — Nidhi SG',  9525, 1),
    ('qa-role-9526',  'admin', 'CEO — Nidhi AU',  9526, 1)
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'roles Nidhi skipped: %', SQLERRM;
END;
$$;
COMMIT;

BEGIN;
DO $$
BEGIN
  INSERT INTO users (id, tenant_id, username, password, role, role_id, first_name, last_name, email, record_status)
  VALUES
    ('qa-u-9500',  9500, 'qa_nidhi_e_admin',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin',           'qa-role-9500',  'QA Nidhi', 'EAdmin',  'qa-nidhi-e-admin@test.kinto',  1),
    ('qa-u-9501',  9500, 'qa_nidhi_e_mgr',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'manager',         'qa-role-9500m', 'QA Nidhi', 'EMgr',    'qa-nidhi-e-mgr@test.kinto',    1),
    ('qa-u-9502',  9500, 'qa_nidhi_e_loan',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'operator',        'qa-role-9500o', 'QA Nidhi', 'ELoan',   'qa-nidhi-e-loan@test.kinto',   1),
    ('qa-u-9503',  9500, 'qa_nidhi_e_audit',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'reviewer',        'qa-role-9500r', 'QA Nidhi', 'EAudit',  'qa-nidhi-e-audit@test.kinto',  1),
    ('qa-u-9504',  9500, 'qa_nidhi_e_acct',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'accountsmanager', 'qa-role-9500a', 'QA Nidhi', 'EAcct',   'qa-nidhi-e-acct@test.kinto',   1),
    ('qa-u-9520',  9520, 'qa_nidhi_s_admin',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin',           'qa-role-9520',  'QA Nidhi', 'SAdmin',  'qa-nidhi-s-admin@test.kinto',  1),
    ('qa-u-9520m', 9520, 'qa_nidhi_s_mgr',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'manager',         'qa-role-9520m', 'QA Nidhi', 'SMgr',    'qa-nidhi-s-mgr@test.kinto',    1),
    ('qa-u-9520o', 9520, 'qa_nidhi_s_loan',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'operator',        'qa-role-9520o', 'QA Nidhi', 'SLoan',   'qa-nidhi-s-loan@test.kinto',   1),
    ('qa-u-9520r', 9520, 'qa_nidhi_s_audit',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'reviewer',        'qa-role-9520r', 'QA Nidhi', 'SAudit',  'qa-nidhi-s-audit@test.kinto',  1),
    ('qa-u-9521',  9521, 'qa_nidhi_p_admin',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin',           'qa-role-9521',  'QA Nidhi', 'PAdmin',  'qa-nidhi-p-admin@test.kinto',  1),
    ('qa-u-9521m', 9521, 'qa_nidhi_p_mgr',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'manager',         'qa-role-9521m', 'QA Nidhi', 'PMgr',    'qa-nidhi-p-mgr@test.kinto',    1),
    ('qa-u-9521o', 9521, 'qa_nidhi_p_loan',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'operator',        'qa-role-9521o', 'QA Nidhi', 'PLoan',   'qa-nidhi-p-loan@test.kinto',   1),
    ('qa-u-9521r', 9521, 'qa_nidhi_p_audit',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'reviewer',        'qa-role-9521r', 'QA Nidhi', 'PAudit',  'qa-nidhi-p-audit@test.kinto',  1),
    ('qa-u-9521a', 9521, 'qa_nidhi_p_acct',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'accountsmanager', 'qa-role-9521a', 'QA Nidhi', 'PAcct',   'qa-nidhi-p-acct@test.kinto',   1),
    ('qa-u-9522',  9522, 'qa_nidhi_ae_admin', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin', 'qa-role-9522', 'QA Nidhi', 'UAE', 'qa-nidhi-ae@test.kinto', 1),
    ('qa-u-9523',  9523, 'qa_nidhi_us_admin', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin', 'qa-role-9523', 'QA Nidhi', 'USA', 'qa-nidhi-us@test.kinto', 1),
    ('qa-u-9524',  9524, 'qa_nidhi_eu_admin', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin', 'qa-role-9524', 'QA Nidhi', 'EU',  'qa-nidhi-eu@test.kinto', 1),
    ('qa-u-9525',  9525, 'qa_nidhi_sg_admin', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin', 'qa-role-9525', 'QA Nidhi', 'SG',  'qa-nidhi-sg@test.kinto', 1),
    ('qa-u-9526',  9526, 'qa_nidhi_au_admin', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin', 'qa-role-9526', 'QA Nidhi', 'AU',  'qa-nidhi-au@test.kinto', 1)
  ON CONFLICT (id) DO UPDATE SET username = EXCLUDED.username;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'users Nidhi skipped: %', SQLERRM;
END;
$$;
COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════════
-- CRM ERP (9600–9626)
-- ═══════════════════════════════════════════════════════════════════════════════
BEGIN;
DO $$
BEGIN
  INSERT INTO tenants (id, name, slug, plan, country, currency, timezone, tax_regime, default_locale, created_at)
  VALUES
    (9600, 'QA CRM Enterprise India',   'qa-crm-e',  'crm_enterprise',   'India',       'INR', 'Asia/Kolkata',    'gst',       'en', NOW()),
    (9620, 'QA CRM Starter India',      'qa-crm-s',  'crm_starter',      'India',       'INR', 'Asia/Kolkata',    'gst',       'en', NOW()),
    (9621, 'QA CRM Professional India', 'qa-crm-p',  'crm_professional', 'India',       'INR', 'Asia/Kolkata',    'gst',       'en', NOW()),
    (9622, 'QA CRM UAE',                'qa-crm-ae', 'crm_enterprise',   'UAE',         'AED', 'Asia/Dubai',      'vat',       'en', NOW()),
    (9623, 'QA CRM USA',                'qa-crm-us', 'crm_enterprise',   'USA',         'USD', 'America/New_York','sales_tax', 'en', NOW()),
    (9624, 'QA CRM Germany',            'qa-crm-eu', 'crm_enterprise',   'Germany',     'EUR', 'Europe/Berlin',   'vat',       'en', NOW()),
    (9625, 'QA CRM Singapore',          'qa-crm-sg', 'crm_enterprise',   'Singapore',   'SGD', 'Asia/Singapore',  'gst',       'en', NOW()),
    (9626, 'QA CRM Australia',          'qa-crm-au', 'crm_enterprise',   'Australia',   'AUD', 'Australia/Sydney','gst',       'en', NOW())
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'tenants CRM skipped: %', SQLERRM;
END;
$$;
COMMIT;

BEGIN;
DO $$
BEGIN
  INSERT INTO roles (id, name, description, tenant_id, record_status)
  VALUES
    ('qa-role-9600',  'admin',           'Sales Director — CRM Enterprise',  9600, 1),
    ('qa-role-9600m', 'manager',         'Sales Manager — CRM Enterprise',   9600, 1),
    ('qa-role-9600o', 'operator',        'Sales Executive — CRM Enterprise', 9600, 1),
    ('qa-role-9600r', 'reviewer',        'Lead Reviewer — CRM Enterprise',   9600, 1),
    ('qa-role-9600a', 'accountsmanager', 'Finance — CRM Enterprise',         9600, 1),
    ('qa-role-9620',  'admin',           'Sales Director — CRM Starter',     9620, 1),
    ('qa-role-9620m', 'manager',         'Sales Manager — CRM Starter',      9620, 1),
    ('qa-role-9620o', 'operator',        'Sales Executive — CRM Starter',    9620, 1),
    ('qa-role-9620r', 'reviewer',        'Lead Reviewer — CRM Starter',      9620, 1),
    ('qa-role-9621',  'admin',           'Sales Director — CRM Pro',         9621, 1),
    ('qa-role-9621m', 'manager',         'Sales Manager — CRM Pro',          9621, 1),
    ('qa-role-9621o', 'operator',        'Sales Executive — CRM Pro',        9621, 1),
    ('qa-role-9621r', 'reviewer',        'Lead Reviewer — CRM Pro',          9621, 1),
    ('qa-role-9621a', 'accountsmanager', 'Finance — CRM Pro',                9621, 1),
    ('qa-role-9622',  'admin', 'Sales Dir — CRM UAE', 9622, 1),
    ('qa-role-9623',  'admin', 'Sales Dir — CRM USA', 9623, 1),
    ('qa-role-9624',  'admin', 'Sales Dir — CRM EU',  9624, 1),
    ('qa-role-9625',  'admin', 'Sales Dir — CRM SG',  9625, 1),
    ('qa-role-9626',  'admin', 'Sales Dir — CRM AU',  9626, 1)
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'roles CRM skipped: %', SQLERRM;
END;
$$;
COMMIT;

BEGIN;
DO $$
BEGIN
  INSERT INTO users (id, tenant_id, username, password, role, role_id, first_name, last_name, email, record_status)
  VALUES
    ('qa-u-9600',  9600, 'qa_crm_e_admin',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin',           'qa-role-9600',  'QA CRM', 'EAdmin', 'qa-crm-e-admin@test.kinto',  1),
    ('qa-u-9601',  9600, 'qa_crm_e_mgr',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'manager',         'qa-role-9600m', 'QA CRM', 'EMgr',   'qa-crm-e-mgr@test.kinto',    1),
    ('qa-u-9602',  9600, 'qa_crm_e_exec',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'operator',        'qa-role-9600o', 'QA CRM', 'EExec',  'qa-crm-e-exec@test.kinto',   1),
    ('qa-u-9603',  9600, 'qa_crm_e_review', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'reviewer',        'qa-role-9600r', 'QA CRM', 'EReview','qa-crm-e-review@test.kinto',  1),
    ('qa-u-9604',  9600, 'qa_crm_e_fin',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'accountsmanager', 'qa-role-9600a', 'QA CRM', 'EFin',   'qa-crm-e-fin@test.kinto',    1),
    ('qa-u-9620',  9620, 'qa_crm_s_admin',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin',           'qa-role-9620',  'QA CRM', 'SAdmin', 'qa-crm-s-admin@test.kinto',  1),
    ('qa-u-9620m', 9620, 'qa_crm_s_mgr',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'manager',         'qa-role-9620m', 'QA CRM', 'SMgr',   'qa-crm-s-mgr@test.kinto',    1),
    ('qa-u-9620o', 9620, 'qa_crm_s_exec',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'operator',        'qa-role-9620o', 'QA CRM', 'SExec',  'qa-crm-s-exec@test.kinto',   1),
    ('qa-u-9620r', 9620, 'qa_crm_s_review', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'reviewer',        'qa-role-9620r', 'QA CRM', 'SReview','qa-crm-s-review@test.kinto',  1),
    ('qa-u-9621',  9621, 'qa_crm_p_admin',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin',           'qa-role-9621',  'QA CRM', 'PAdmin', 'qa-crm-p-admin@test.kinto',  1),
    ('qa-u-9621m', 9621, 'qa_crm_p_mgr',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'manager',         'qa-role-9621m', 'QA CRM', 'PMgr',   'qa-crm-p-mgr@test.kinto',    1),
    ('qa-u-9621o', 9621, 'qa_crm_p_exec',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'operator',        'qa-role-9621o', 'QA CRM', 'PExec',  'qa-crm-p-exec@test.kinto',   1),
    ('qa-u-9621r', 9621, 'qa_crm_p_review', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'reviewer',        'qa-role-9621r', 'QA CRM', 'PReview','qa-crm-p-review@test.kinto',  1),
    ('qa-u-9621a', 9621, 'qa_crm_p_fin',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'accountsmanager', 'qa-role-9621a', 'QA CRM', 'PFin',   'qa-crm-p-fin@test.kinto',    1),
    ('qa-u-9622',  9622, 'qa_crm_ae_admin', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin', 'qa-role-9622', 'QA CRM', 'UAE', 'qa-crm-ae@test.kinto', 1),
    ('qa-u-9623',  9623, 'qa_crm_us_admin', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin', 'qa-role-9623', 'QA CRM', 'USA', 'qa-crm-us@test.kinto', 1),
    ('qa-u-9624',  9624, 'qa_crm_eu_admin', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin', 'qa-role-9624', 'QA CRM', 'EU',  'qa-crm-eu@test.kinto', 1),
    ('qa-u-9625',  9625, 'qa_crm_sg_admin', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin', 'qa-role-9625', 'QA CRM', 'SG',  'qa-crm-sg@test.kinto', 1),
    ('qa-u-9626',  9626, 'qa_crm_au_admin', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin', 'qa-role-9626', 'QA CRM', 'AU',  'qa-crm-au@test.kinto', 1)
  ON CONFLICT (id) DO UPDATE SET username = EXCLUDED.username;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'users CRM skipped: %', SQLERRM;
END;
$$;
COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════════
-- LOGISTICS ERP (9700–9726)
-- ═══════════════════════════════════════════════════════════════════════════════
BEGIN;
DO $$
BEGIN
  INSERT INTO tenants (id, name, slug, plan, country, currency, timezone, tax_regime, default_locale, created_at)
  VALUES
    (9700, 'QA Logistics Enterprise India',   'qa-log-e',  'logistics_enterprise',   'India',       'INR', 'Asia/Kolkata',    'gst',       'en', NOW()),
    (9720, 'QA Logistics Starter India',      'qa-log-s',  'logistics_starter',      'India',       'INR', 'Asia/Kolkata',    'gst',       'en', NOW()),
    (9721, 'QA Logistics Professional India', 'qa-log-p',  'logistics_professional', 'India',       'INR', 'Asia/Kolkata',    'gst',       'en', NOW()),
    (9722, 'QA Logistics UAE',                'qa-log-ae', 'logistics_enterprise',   'UAE',         'AED', 'Asia/Dubai',      'vat',       'en', NOW()),
    (9723, 'QA Logistics USA',                'qa-log-us', 'logistics_enterprise',   'USA',         'USD', 'America/New_York','sales_tax', 'en', NOW()),
    (9724, 'QA Logistics Germany',            'qa-log-eu', 'logistics_enterprise',   'Germany',     'EUR', 'Europe/Berlin',   'vat',       'en', NOW()),
    (9725, 'QA Logistics Singapore',          'qa-log-sg', 'logistics_enterprise',   'Singapore',   'SGD', 'Asia/Singapore',  'gst',       'en', NOW()),
    (9726, 'QA Logistics Australia',          'qa-log-au', 'logistics_enterprise',   'Australia',   'AUD', 'Australia/Sydney','gst',       'en', NOW())
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'tenants Logistics skipped: %', SQLERRM;
END;
$$;
COMMIT;

BEGIN;
DO $$
BEGIN
  INSERT INTO roles (id, name, description, tenant_id, record_status)
  VALUES
    ('qa-role-9700',  'admin',           'Operations Director — Log Enterprise', 9700, 1),
    ('qa-role-9700m', 'manager',         'Fleet Manager — Log Enterprise',       9700, 1),
    ('qa-role-9700o', 'operator',        'Driver/Dispatcher — Log Enterprise',   9700, 1),
    ('qa-role-9700r', 'reviewer',        'Warehouse Reviewer — Log Enterprise',  9700, 1),
    ('qa-role-9700a', 'accountsmanager', 'Accountant — Log Enterprise',          9700, 1),
    ('qa-role-9720',  'admin',           'Operations Director — Log Starter',    9720, 1),
    ('qa-role-9720m', 'manager',         'Fleet Manager — Log Starter',          9720, 1),
    ('qa-role-9720o', 'operator',        'Driver/Dispatcher — Log Starter',      9720, 1),
    ('qa-role-9720r', 'reviewer',        'Warehouse Reviewer — Log Starter',     9720, 1),
    ('qa-role-9721',  'admin',           'Operations Director — Log Pro',        9721, 1),
    ('qa-role-9721m', 'manager',         'Fleet Manager — Log Pro',              9721, 1),
    ('qa-role-9721o', 'operator',        'Driver/Dispatcher — Log Pro',          9721, 1),
    ('qa-role-9721r', 'reviewer',        'Warehouse Reviewer — Log Pro',         9721, 1),
    ('qa-role-9721a', 'accountsmanager', 'Accountant — Log Pro',                 9721, 1),
    ('qa-role-9722',  'admin', 'Ops Dir — Log UAE', 9722, 1),
    ('qa-role-9723',  'admin', 'Ops Dir — Log USA', 9723, 1),
    ('qa-role-9724',  'admin', 'Ops Dir — Log EU',  9724, 1),
    ('qa-role-9725',  'admin', 'Ops Dir — Log SG',  9725, 1),
    ('qa-role-9726',  'admin', 'Ops Dir — Log AU',  9726, 1)
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'roles Logistics skipped: %', SQLERRM;
END;
$$;
COMMIT;

BEGIN;
DO $$
BEGIN
  INSERT INTO users (id, tenant_id, username, password, role, role_id, first_name, last_name, email, record_status)
  VALUES
    ('qa-u-9700',  9700, 'qa_log_e_admin',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin',           'qa-role-9700',  'QA Log', 'EAdmin', 'qa-log-e-admin@test.kinto',  1),
    ('qa-u-9701',  9700, 'qa_log_e_fleet',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'manager',         'qa-role-9700m', 'QA Log', 'EFleet', 'qa-log-e-fleet@test.kinto',  1),
    ('qa-u-9702',  9700, 'qa_log_e_driver', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'operator',        'qa-role-9700o', 'QA Log', 'EDriver','qa-log-e-driver@test.kinto', 1),
    ('qa-u-9703',  9700, 'qa_log_e_wh',     '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'reviewer',        'qa-role-9700r', 'QA Log', 'EWH',    'qa-log-e-wh@test.kinto',     1),
    ('qa-u-9704',  9700, 'qa_log_e_acct',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'accountsmanager', 'qa-role-9700a', 'QA Log', 'EAcct',  'qa-log-e-acct@test.kinto',   1),
    ('qa-u-9720',  9720, 'qa_log_s_admin',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin',           'qa-role-9720',  'QA Log', 'SAdmin', 'qa-log-s-admin@test.kinto',  1),
    ('qa-u-9720m', 9720, 'qa_log_s_fleet',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'manager',         'qa-role-9720m', 'QA Log', 'SFleet', 'qa-log-s-fleet@test.kinto',  1),
    ('qa-u-9720o', 9720, 'qa_log_s_driver', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'operator',        'qa-role-9720o', 'QA Log', 'SDriver','qa-log-s-driver@test.kinto', 1),
    ('qa-u-9720r', 9720, 'qa_log_s_wh',     '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'reviewer',        'qa-role-9720r', 'QA Log', 'SWH',    'qa-log-s-wh@test.kinto',     1),
    ('qa-u-9721',  9721, 'qa_log_p_admin',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin',           'qa-role-9721',  'QA Log', 'PAdmin', 'qa-log-p-admin@test.kinto',  1),
    ('qa-u-9721m', 9721, 'qa_log_p_fleet',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'manager',         'qa-role-9721m', 'QA Log', 'PFleet', 'qa-log-p-fleet@test.kinto',  1),
    ('qa-u-9721o', 9721, 'qa_log_p_driver', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'operator',        'qa-role-9721o', 'QA Log', 'PDriver','qa-log-p-driver@test.kinto', 1),
    ('qa-u-9721r', 9721, 'qa_log_p_wh',     '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'reviewer',        'qa-role-9721r', 'QA Log', 'PWH',    'qa-log-p-wh@test.kinto',     1),
    ('qa-u-9721a', 9721, 'qa_log_p_acct',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'accountsmanager', 'qa-role-9721a', 'QA Log', 'PAcct',  'qa-log-p-acct@test.kinto',   1),
    ('qa-u-9722',  9722, 'qa_log_ae_admin', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin', 'qa-role-9722', 'QA Log', 'UAE', 'qa-log-ae@test.kinto', 1),
    ('qa-u-9723',  9723, 'qa_log_us_admin', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin', 'qa-role-9723', 'QA Log', 'USA', 'qa-log-us@test.kinto', 1),
    ('qa-u-9724',  9724, 'qa_log_eu_admin', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin', 'qa-role-9724', 'QA Log', 'EU',  'qa-log-eu@test.kinto', 1),
    ('qa-u-9725',  9725, 'qa_log_sg_admin', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin', 'qa-role-9725', 'QA Log', 'SG',  'qa-log-sg@test.kinto', 1),
    ('qa-u-9726',  9726, 'qa_log_au_admin', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin', 'qa-role-9726', 'QA Log', 'AU',  'qa-log-au@test.kinto', 1)
  ON CONFLICT (id) DO UPDATE SET username = EXCLUDED.username;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'users Logistics skipped: %', SQLERRM;
END;
$$;
COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════
-- HOTEL ERP TENANTS (9100–9126)
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;
DO $$
BEGIN
  INSERT INTO tenants (id, name, slug, plan, country, currency, timezone, tax_regime, default_locale, created_at)
  VALUES
    (9100, 'QA Hotel Enterprise India', 'qa-htl-e',  'hotel_enterprise',    'India',     'INR', 'Asia/Kolkata',     'gst',       'en', NOW()),
    (9120, 'QA Hotel Starter India',    'qa-htl-s',  'hotel_starter',       'India',     'INR', 'Asia/Kolkata',     'gst',       'en', NOW()),
    (9121, 'QA Hotel Professional',     'qa-htl-p',  'hotel_professional',  'India',     'INR', 'Asia/Kolkata',     'gst',       'en', NOW()),
    (9122, 'QA Hotel UAE',              'qa-htl-ae', 'hotel_enterprise',    'UAE',       'AED', 'Asia/Dubai',       'vat',       'en', NOW()),
    (9123, 'QA Hotel USA',              'qa-htl-us', 'hotel_enterprise',    'USA',       'USD', 'America/New_York', 'sales_tax', 'en', NOW()),
    (9124, 'QA Hotel Europe',           'qa-htl-eu', 'hotel_enterprise',    'Germany',   'EUR', 'Europe/Berlin',    'vat',       'en', NOW()),
    (9125, 'QA Hotel Singapore',        'qa-htl-sg', 'hotel_enterprise',    'Singapore', 'SGD', 'Asia/Singapore',   'gst',       'en', NOW()),
    (9126, 'QA Hotel Australia',        'qa-htl-au', 'hotel_enterprise',    'Australia', 'AUD', 'Australia/Sydney', 'gst',       'en', NOW())
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, plan = EXCLUDED.plan;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Hotel tenants skipped: %', SQLERRM;
END;
$$;
COMMIT;

BEGIN;
DO $$
BEGIN
  INSERT INTO roles (id, name, description, tenant_id, record_status) VALUES
    ('qa-role-9100',  'admin',           'Owner/GM — HTL Ent',        9100, 1),
    ('qa-role-9100m', 'manager',         'Front Desk Mgr — Ent',      9100, 1),
    ('qa-role-9100o', 'operator',        'Receptionist — Ent',        9100, 1),
    ('qa-role-9100r', 'reviewer',        'Housekeeping — Ent',        9100, 1),
    ('qa-role-9100a', 'accountsmanager', 'Accountant — Ent',          9100, 1),
    ('qa-role-9100h', 'manager',         'HR Manager — Ent',          9100, 1),
    ('qa-role-9100c', 'operator',        'CRM Exec — Ent',            9100, 1),
    ('qa-role-9100s', 'manager',         'Sales Mgr — Ent',           9100, 1),
    ('qa-role-9100v', 'reviewer',        'MIS Viewer — Ent',          9100, 1),
    ('qa-role-9100w', 'manager',         'Warehouse Mgr — Ent',       9100, 1),
    ('qa-role-9100f', 'manager',         'Assets Mgr — Ent',          9100, 1),
    ('qa-role-9120',  'admin',           'Owner — HTL Starter',       9120, 1),
    ('qa-role-9120m', 'manager',         'FD Mgr — Starter',          9120, 1),
    ('qa-role-9120o', 'operator',        'Receptionist — Starter',    9120, 1),
    ('qa-role-9120r', 'reviewer',        'Housekeeping — Starter',    9120, 1),
    ('qa-role-9121',  'admin',           'Owner — HTL Pro',           9121, 1),
    ('qa-role-9121m', 'manager',         'FD Mgr — Pro',              9121, 1),
    ('qa-role-9121o', 'operator',        'Receptionist — Pro',        9121, 1),
    ('qa-role-9121r', 'reviewer',        'Housekeeping — Pro',        9121, 1),
    ('qa-role-9121a', 'accountsmanager', 'Accountant — Pro',          9121, 1),
    ('qa-role-9121h', 'manager',         'HR Manager — Pro',          9121, 1),
    ('qa-role-9122',  'admin',           'Owner — HTL UAE',           9122, 1),
    ('qa-role-9122m', 'manager',         'FD Mgr — UAE',              9122, 1),
    ('qa-role-9122o', 'operator',        'Receptionist — UAE',        9122, 1),
    ('qa-role-9122a', 'accountsmanager', 'Accountant — UAE',          9122, 1),
    ('qa-role-9123',  'admin',           'Owner — HTL USA',           9123, 1),
    ('qa-role-9123m', 'manager',         'FD Mgr — USA',              9123, 1),
    ('qa-role-9123o', 'operator',        'Receptionist — USA',        9123, 1),
    ('qa-role-9123a', 'accountsmanager', 'Accountant — USA',          9123, 1),
    ('qa-role-9124',  'admin',           'Owner — HTL EU',            9124, 1),
    ('qa-role-9124m', 'manager',         'FD Mgr — EU',               9124, 1),
    ('qa-role-9124o', 'operator',        'Receptionist — EU',         9124, 1),
    ('qa-role-9124a', 'accountsmanager', 'Accountant — EU',           9124, 1),
    ('qa-role-9125',  'admin',           'Owner — HTL SG',            9125, 1),
    ('qa-role-9125m', 'manager',         'FD Mgr — SG',               9125, 1),
    ('qa-role-9125o', 'operator',        'Receptionist — SG',         9125, 1),
    ('qa-role-9125a', 'accountsmanager', 'Accountant — SG',           9125, 1),
    ('qa-role-9126',  'admin',           'Owner — HTL AU',            9126, 1),
    ('qa-role-9126m', 'manager',         'FD Mgr — AU',               9126, 1),
    ('qa-role-9126o', 'operator',        'Receptionist — AU',         9126, 1),
    ('qa-role-9126a', 'accountsmanager', 'Accountant — AU',           9126, 1)
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Hotel roles skipped: %', SQLERRM;
END;
$$;
COMMIT;

BEGIN;
DO $$
BEGIN
  INSERT INTO users (id, tenant_id, username, password, role, role_id, name, country, email, record_status) VALUES
    ('qa-user-9100',  9100, 'qa_h_owner',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin',           'qa-role-9100',  'QA H Owner',    'India', 'qa-h-owner@test.kinto',   1),
    ('qa-user-9100m', 9100, 'qa_h_manager',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'manager',         'qa-role-9100m', 'QA H Manager',  'India', 'qa-h-mgr@test.kinto',     1),
    ('qa-user-9100o', 9100, 'qa_h_recept',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'operator',        'qa-role-9100o', 'QA H Recept',   'India', 'qa-h-recept@test.kinto',  1),
    ('qa-user-9100r', 9100, 'qa_h_hk',       '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'reviewer',        'qa-role-9100r', 'QA H HK',       'India', 'qa-h-hk@test.kinto',      1),
    ('qa-user-9100a', 9100, 'qa_h_acct',     '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'accountsmanager', 'qa-role-9100a', 'QA H Acct',     'India', 'qa-h-acct@test.kinto',    1),
    ('qa-user-9100h', 9100, 'qa_h_hr',       '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'manager',         'qa-role-9100h', 'QA H HR',       'India', 'qa-h-hr@test.kinto',      1),
    ('qa-user-9100c', 9100, 'qa_h_crm',      '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'operator',        'qa-role-9100c', 'QA H CRM',      'India', 'qa-h-crm@test.kinto',     1),
    ('qa-user-9100s', 9100, 'qa_h_sales',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'manager',         'qa-role-9100s', 'QA H Sales',    'India', 'qa-h-sales@test.kinto',   1),
    ('qa-user-9100v', 9100, 'qa_h_mis',      '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'reviewer',        'qa-role-9100v', 'QA H MIS',      'India', 'qa-h-mis@test.kinto',     1),
    ('qa-user-9100w', 9100, 'qa_h_wh',       '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'manager',         'qa-role-9100w', 'QA H WH',       'India', 'qa-h-wh@test.kinto',      1),
    ('qa-user-9100f', 9100, 'qa_h_assets',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'manager',         'qa-role-9100f', 'QA H Assets',   'India', 'qa-h-assets@test.kinto',  1),
    ('qa-user-9120',  9120, 'qa_hs_owner',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin',    'qa-role-9120',  'QA HS Owner',   'India', 'qa-hs-owner@test.kinto',  1),
    ('qa-user-9120m', 9120, 'qa_hs_manager', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'manager',  'qa-role-9120m', 'QA HS Manager', 'India', 'qa-hs-mgr@test.kinto',    1),
    ('qa-user-9120o', 9120, 'qa_hs_recept',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'operator', 'qa-role-9120o', 'QA HS Recept',  'India', 'qa-hs-recept@test.kinto', 1),
    ('qa-user-9120r', 9120, 'qa_hs_hk',      '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'reviewer', 'qa-role-9120r', 'QA HS HK',      'India', 'qa-hs-hk@test.kinto',     1),
    ('qa-user-9121',  9121, 'qa_hp_owner',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin',           'qa-role-9121',  'QA HP Owner',   'India', 'qa-hp-owner@test.kinto',  1),
    ('qa-user-9121m', 9121, 'qa_hp_manager', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'manager',         'qa-role-9121m', 'QA HP Manager', 'India', 'qa-hp-mgr@test.kinto',    1),
    ('qa-user-9121o', 9121, 'qa_hp_recept',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'operator',        'qa-role-9121o', 'QA HP Recept',  'India', 'qa-hp-recept@test.kinto', 1),
    ('qa-user-9121r', 9121, 'qa_hp_hk',      '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'reviewer',        'qa-role-9121r', 'QA HP HK',      'India', 'qa-hp-hk@test.kinto',     1),
    ('qa-user-9121a', 9121, 'qa_hp_acct',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'accountsmanager', 'qa-role-9121a', 'QA HP Acct',    'India', 'qa-hp-acct@test.kinto',   1),
    ('qa-user-9121h', 9121, 'qa_hp_hr',      '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'manager',         'qa-role-9121h', 'QA HP HR',      'India', 'qa-hp-hr@test.kinto',     1),
    ('qa-user-9122',  9122, 'qa_hae_owner',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin',           'qa-role-9122',  'QA HAE Owner',  'UAE',       'qa-hae-owner@test.kinto',  1),
    ('qa-user-9122m', 9122, 'qa_hae_manager','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'manager',         'qa-role-9122m', 'QA HAE Manager','UAE',       'qa-hae-mgr@test.kinto',    1),
    ('qa-user-9122o', 9122, 'qa_hae_recept', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'operator',        'qa-role-9122o', 'QA HAE Recept', 'UAE',       'qa-hae-recept@test.kinto', 1),
    ('qa-user-9122a', 9122, 'qa_hae_acct',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'accountsmanager', 'qa-role-9122a', 'QA HAE Acct',   'UAE',       'qa-hae-acct@test.kinto',   1),
    ('qa-user-9123',  9123, 'qa_hus_owner',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin',           'qa-role-9123',  'QA HUS Owner',  'USA',       'qa-hus-owner@test.kinto',  1),
    ('qa-user-9123m', 9123, 'qa_hus_manager','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'manager',         'qa-role-9123m', 'QA HUS Manager','USA',       'qa-hus-mgr@test.kinto',    1),
    ('qa-user-9123o', 9123, 'qa_hus_recept', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'operator',        'qa-role-9123o', 'QA HUS Recept', 'USA',       'qa-hus-recept@test.kinto', 1),
    ('qa-user-9123a', 9123, 'qa_hus_acct',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'accountsmanager', 'qa-role-9123a', 'QA HUS Acct',   'USA',       'qa-hus-acct@test.kinto',   1),
    ('qa-user-9124',  9124, 'qa_heu_owner',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin',           'qa-role-9124',  'QA HEU Owner',  'Germany',   'qa-heu-owner@test.kinto',  1),
    ('qa-user-9124m', 9124, 'qa_heu_manager','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'manager',         'qa-role-9124m', 'QA HEU Manager','Germany',   'qa-heu-mgr@test.kinto',    1),
    ('qa-user-9124o', 9124, 'qa_heu_recept', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'operator',        'qa-role-9124o', 'QA HEU Recept', 'Germany',   'qa-heu-recept@test.kinto', 1),
    ('qa-user-9124a', 9124, 'qa_heu_acct',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'accountsmanager', 'qa-role-9124a', 'QA HEU Acct',   'Germany',   'qa-heu-acct@test.kinto',   1),
    ('qa-user-9125',  9125, 'qa_hsg_owner',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin',           'qa-role-9125',  'QA HSG Owner',  'Singapore', 'qa-hsg-owner@test.kinto',  1),
    ('qa-user-9125m', 9125, 'qa_hsg_manager','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'manager',         'qa-role-9125m', 'QA HSG Manager','Singapore', 'qa-hsg-mgr@test.kinto',    1),
    ('qa-user-9125o', 9125, 'qa_hsg_recept', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'operator',        'qa-role-9125o', 'QA HSG Recept', 'Singapore', 'qa-hsg-recept@test.kinto', 1),
    ('qa-user-9125a', 9125, 'qa_hsg_acct',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'accountsmanager', 'qa-role-9125a', 'QA HSG Acct',   'Singapore', 'qa-hsg-acct@test.kinto',   1),
    ('qa-user-9126',  9126, 'qa_hau_owner',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin',           'qa-role-9126',  'QA HAU Owner',  'Australia', 'qa-hau-owner@test.kinto',  1),
    ('qa-user-9126m', 9126, 'qa_hau_manager','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'manager',         'qa-role-9126m', 'QA HAU Manager','Australia', 'qa-hau-mgr@test.kinto',    1),
    ('qa-user-9126o', 9126, 'qa_hau_recept', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'operator',        'qa-role-9126o', 'QA HAU Recept', 'Australia', 'qa-hau-recept@test.kinto', 1),
    ('qa-user-9126a', 9126, 'qa_hau_acct',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'accountsmanager', 'qa-role-9126a', 'QA HAU Acct',   'Australia', 'qa-hau-acct@test.kinto',   1)
  ON CONFLICT (id) DO UPDATE SET username = EXCLUDED.username;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Hotel users skipped: %', SQLERRM;
END;
$$;
COMMIT;

BEGIN;
DO $$
BEGIN
  INSERT INTO hotel_room_types (id, tenant_id, name, description, base_rate, max_occupancy, is_active)
  VALUES
    (9100, 9100, 'Standard', 'Standard Room', 3500, 2, true),
    (9101, 9100, 'Deluxe',   'Deluxe Room',   5500, 2, true),
    (9102, 9100, 'Suite',    'Suite Room',     9500, 4, true)
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'hotel_room_types skipped: %', SQLERRM;
END;
$$;
COMMIT;

BEGIN;
DO $$
BEGIN
  INSERT INTO hotel_rooms (id, tenant_id, room_number, floor, room_type_id, status, is_active)
  VALUES
    (9100, 9100, '101', '1', 9100, 'available', true),
    (9101, 9100, '102', '1', 9100, 'available', true),
    (9102, 9100, '201', '2', 9101, 'available', true),
    (9103, 9100, '301', '3', 9102, 'available', true)
  ON CONFLICT (id) DO UPDATE SET room_number = EXCLUDED.room_number;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'hotel_rooms skipped: %', SQLERRM;
END;
$$;
COMMIT;

BEGIN;
DO $$
BEGIN
  INSERT INTO hotel_guests (id, tenant_id, name, phone, email, id_type, id_number, nationality, is_active)
  VALUES
    (9100, 9100, 'QA Test Guest', '9800001001', 'guest1@qa-htl.test', 'passport', 'QA-HTL-001', 'Indian', true),
    (9101, 9100, 'QA VIP Guest',  '9800001002', 'guest2@qa-htl.test', 'aadhar',   'QA-HTL-002', 'Indian', true)
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'hotel_guests skipped: %', SQLERRM;
END;
$$;
COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════
-- HEALTHCARE ERP TENANTS (9200–9226)
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;
DO $$
BEGIN
  INSERT INTO tenants (id, name, slug, plan, country, currency, timezone, tax_regime, default_locale, created_at)
  VALUES
    (9200, 'QA Healthcare Enterprise India', 'qa-hc-e',  'healthcare_enterprise',   'India',     'INR', 'Asia/Kolkata',     'gst',       'en', NOW()),
    (9220, 'QA Healthcare Starter India',    'qa-hc-s',  'healthcare_starter',      'India',     'INR', 'Asia/Kolkata',     'gst',       'en', NOW()),
    (9221, 'QA Healthcare Professional',     'qa-hc-p',  'healthcare_professional', 'India',     'INR', 'Asia/Kolkata',     'gst',       'en', NOW()),
    (9222, 'QA Healthcare UAE',              'qa-hc-ae', 'healthcare_enterprise',   'UAE',       'AED', 'Asia/Dubai',       'vat',       'en', NOW()),
    (9223, 'QA Healthcare USA',              'qa-hc-us', 'healthcare_enterprise',   'USA',       'USD', 'America/New_York', 'sales_tax', 'en', NOW()),
    (9224, 'QA Healthcare Europe',           'qa-hc-eu', 'healthcare_enterprise',   'Germany',   'EUR', 'Europe/Berlin',    'vat',       'en', NOW()),
    (9225, 'QA Healthcare Singapore',        'qa-hc-sg', 'healthcare_enterprise',   'Singapore', 'SGD', 'Asia/Singapore',   'gst',       'en', NOW()),
    (9226, 'QA Healthcare Australia',        'qa-hc-au', 'healthcare_enterprise',   'Australia', 'AUD', 'Australia/Sydney', 'gst',       'en', NOW())
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, plan = EXCLUDED.plan;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Healthcare tenants skipped: %', SQLERRM;
END;
$$;
COMMIT;

BEGIN;
DO $$
BEGIN
  INSERT INTO roles (id, name, description, tenant_id, record_status) VALUES
    ('qa-role-9200',  'admin',           'Admin — HC Ent',              9200, 1),
    ('qa-role-9200m', 'manager',         'Doctor — HC Ent',             9200, 1),
    ('qa-role-9200o', 'operator',        'Nurse/Receptionist — Ent',    9200, 1),
    ('qa-role-9200r', 'reviewer',        'Lab Technician — Ent',        9200, 1),
    ('qa-role-9200a', 'accountsmanager', 'Billing Manager — Ent',       9200, 1),
    ('qa-role-9200h', 'manager',         'HR Manager — Ent',            9200, 1),
    ('qa-role-9200c', 'operator',        'CRM Exec — Ent',              9200, 1),
    ('qa-role-9200v', 'reviewer',        'MIS Viewer — Ent',            9200, 1),
    ('qa-role-9220',  'admin',           'Admin — HC Starter',          9220, 1),
    ('qa-role-9220m', 'manager',         'Doctor — Starter',            9220, 1),
    ('qa-role-9220o', 'operator',        'Nurse — Starter',             9220, 1),
    ('qa-role-9220r', 'reviewer',        'Lab Tech — Starter',          9220, 1),
    ('qa-role-9221',  'admin',           'Admin — HC Pro',              9221, 1),
    ('qa-role-9221m', 'manager',         'Doctor — Pro',                9221, 1),
    ('qa-role-9221o', 'operator',        'Nurse — Pro',                 9221, 1),
    ('qa-role-9221r', 'reviewer',        'Lab Tech — Pro',              9221, 1),
    ('qa-role-9221a', 'accountsmanager', 'Billing Mgr — Pro',           9221, 1),
    ('qa-role-9221h', 'manager',         'HR Manager — Pro',            9221, 1),
    ('qa-role-9222',  'admin',           'Admin — HC UAE',              9222, 1),
    ('qa-role-9222m', 'manager',         'Doctor — HC UAE',             9222, 1),
    ('qa-role-9222o', 'operator',        'Nurse — HC UAE',              9222, 1),
    ('qa-role-9222a', 'accountsmanager', 'Billing — HC UAE',            9222, 1),
    ('qa-role-9223',  'admin',           'Admin — HC USA',              9223, 1),
    ('qa-role-9223m', 'manager',         'Doctor — HC USA',             9223, 1),
    ('qa-role-9223o', 'operator',        'Nurse — HC USA',              9223, 1),
    ('qa-role-9223a', 'accountsmanager', 'Billing — HC USA',            9223, 1),
    ('qa-role-9224',  'admin',           'Admin — HC EU',               9224, 1),
    ('qa-role-9224m', 'manager',         'Doctor — HC EU',              9224, 1),
    ('qa-role-9224o', 'operator',        'Nurse — HC EU',               9224, 1),
    ('qa-role-9224a', 'accountsmanager', 'Billing — HC EU',             9224, 1),
    ('qa-role-9225',  'admin',           'Admin — HC SG',               9225, 1),
    ('qa-role-9225m', 'manager',         'Doctor — HC SG',              9225, 1),
    ('qa-role-9225o', 'operator',        'Nurse — HC SG',               9225, 1),
    ('qa-role-9225a', 'accountsmanager', 'Billing — HC SG',             9225, 1),
    ('qa-role-9226',  'admin',           'Admin — HC AU',               9226, 1),
    ('qa-role-9226m', 'manager',         'Doctor — HC AU',              9226, 1),
    ('qa-role-9226o', 'operator',        'Nurse — HC AU',               9226, 1),
    ('qa-role-9226a', 'accountsmanager', 'Billing — HC AU',             9226, 1)
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Healthcare roles skipped: %', SQLERRM;
END;
$$;
COMMIT;

BEGIN;
DO $$
BEGIN
  INSERT INTO users (id, tenant_id, username, password, role, role_id, name, country, email, record_status) VALUES
    ('qa-user-9200',  9200, 'qa_hc_admin',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin',           'qa-role-9200',  'QA HC Admin',   'India', 'qa-hc-admin@test.kinto',   1),
    ('qa-user-9200m', 9200, 'qa_hc_doctor',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'manager',         'qa-role-9200m', 'QA HC Doctor',  'India', 'qa-hc-doctor@test.kinto',  1),
    ('qa-user-9200o', 9200, 'qa_hc_nurse',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'operator',        'qa-role-9200o', 'QA HC Nurse',   'India', 'qa-hc-nurse@test.kinto',   1),
    ('qa-user-9200r', 9200, 'qa_hc_lab',     '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'reviewer',        'qa-role-9200r', 'QA HC Lab',     'India', 'qa-hc-lab@test.kinto',     1),
    ('qa-user-9200a', 9200, 'qa_hc_billing', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'accountsmanager', 'qa-role-9200a', 'QA HC Billing', 'India', 'qa-hc-billing@test.kinto', 1),
    ('qa-user-9200h', 9200, 'qa_hc_hr',      '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'manager',         'qa-role-9200h', 'QA HC HR',      'India', 'qa-hc-hr@test.kinto',      1),
    ('qa-user-9200c', 9200, 'qa_hc_crm',     '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'operator',        'qa-role-9200c', 'QA HC CRM',     'India', 'qa-hc-crm@test.kinto',     1),
    ('qa-user-9200v', 9200, 'qa_hc_mis',     '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'reviewer',        'qa-role-9200v', 'QA HC MIS',     'India', 'qa-hc-mis@test.kinto',     1),
    ('qa-user-9220',  9220, 'qa_hcs_admin',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin',    'qa-role-9220',  'QA HCS Admin',  'India', 'qa-hcs-admin@test.kinto',  1),
    ('qa-user-9220m', 9220, 'qa_hcs_doctor', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'manager',  'qa-role-9220m', 'QA HCS Doctor', 'India', 'qa-hcs-doctor@test.kinto', 1),
    ('qa-user-9220o', 9220, 'qa_hcs_nurse',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'operator', 'qa-role-9220o', 'QA HCS Nurse',  'India', 'qa-hcs-nurse@test.kinto',  1),
    ('qa-user-9220r', 9220, 'qa_hcs_lab',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'reviewer', 'qa-role-9220r', 'QA HCS Lab',    'India', 'qa-hcs-lab@test.kinto',    1),
    ('qa-user-9221',  9221, 'qa_hcp_admin',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin',           'qa-role-9221',  'QA HCP Admin',  'India', 'qa-hcp-admin@test.kinto',  1),
    ('qa-user-9221m', 9221, 'qa_hcp_doctor', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'manager',         'qa-role-9221m', 'QA HCP Doctor', 'India', 'qa-hcp-doctor@test.kinto', 1),
    ('qa-user-9221o', 9221, 'qa_hcp_nurse',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'operator',        'qa-role-9221o', 'QA HCP Nurse',  'India', 'qa-hcp-nurse@test.kinto',  1),
    ('qa-user-9221r', 9221, 'qa_hcp_lab',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'reviewer',        'qa-role-9221r', 'QA HCP Lab',    'India', 'qa-hcp-lab@test.kinto',    1),
    ('qa-user-9221a', 9221, 'qa_hcp_billing','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'accountsmanager', 'qa-role-9221a', 'QA HCP Billing','India', 'qa-hcp-billing@test.kinto',1),
    ('qa-user-9221h', 9221, 'qa_hcp_hr',     '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'manager',         'qa-role-9221h', 'QA HCP HR',     'India', 'qa-hcp-hr@test.kinto',     1),
    ('qa-user-9222',  9222, 'qa_hcae_admin',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin',           'qa-role-9222',  'QA HCAE Admin',  'UAE',       'qa-hcae-admin@test.kinto',   1),
    ('qa-user-9222m', 9222, 'qa_hcae_doctor', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'manager',         'qa-role-9222m', 'QA HCAE Doctor', 'UAE',       'qa-hcae-doctor@test.kinto',  1),
    ('qa-user-9222o', 9222, 'qa_hcae_nurse',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'operator',        'qa-role-9222o', 'QA HCAE Nurse',  'UAE',       'qa-hcae-nurse@test.kinto',   1),
    ('qa-user-9222a', 9222, 'qa_hcae_billing','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'accountsmanager', 'qa-role-9222a', 'QA HCAE Billing','UAE',       'qa-hcae-billing@test.kinto', 1),
    ('qa-user-9223',  9223, 'qa_hcus_admin',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin',           'qa-role-9223',  'QA HCUS Admin',  'USA',       'qa-hcus-admin@test.kinto',   1),
    ('qa-user-9223m', 9223, 'qa_hcus_doctor', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'manager',         'qa-role-9223m', 'QA HCUS Doctor', 'USA',       'qa-hcus-doctor@test.kinto',  1),
    ('qa-user-9223o', 9223, 'qa_hcus_nurse',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'operator',        'qa-role-9223o', 'QA HCUS Nurse',  'USA',       'qa-hcus-nurse@test.kinto',   1),
    ('qa-user-9223a', 9223, 'qa_hcus_billing','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'accountsmanager', 'qa-role-9223a', 'QA HCUS Billing','USA',       'qa-hcus-billing@test.kinto', 1),
    ('qa-user-9224',  9224, 'qa_hceu_admin',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin',           'qa-role-9224',  'QA HCEU Admin',  'Germany',   'qa-hceu-admin@test.kinto',   1),
    ('qa-user-9224m', 9224, 'qa_hceu_doctor', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'manager',         'qa-role-9224m', 'QA HCEU Doctor', 'Germany',   'qa-hceu-doctor@test.kinto',  1),
    ('qa-user-9224o', 9224, 'qa_hceu_nurse',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'operator',        'qa-role-9224o', 'QA HCEU Nurse',  'Germany',   'qa-hceu-nurse@test.kinto',   1),
    ('qa-user-9224a', 9224, 'qa_hceu_billing','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'accountsmanager', 'qa-role-9224a', 'QA HCEU Billing','Germany',   'qa-hceu-billing@test.kinto', 1),
    ('qa-user-9225',  9225, 'qa_hcsg_admin',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin',           'qa-role-9225',  'QA HCSG Admin',  'Singapore', 'qa-hcsg-admin@test.kinto',   1),
    ('qa-user-9225m', 9225, 'qa_hcsg_doctor', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'manager',         'qa-role-9225m', 'QA HCSG Doctor', 'Singapore', 'qa-hcsg-doctor@test.kinto',  1),
    ('qa-user-9225o', 9225, 'qa_hcsg_nurse',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'operator',        'qa-role-9225o', 'QA HCSG Nurse',  'Singapore', 'qa-hcsg-nurse@test.kinto',   1),
    ('qa-user-9225a', 9225, 'qa_hcsg_billing','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'accountsmanager', 'qa-role-9225a', 'QA HCSG Billing','Singapore', 'qa-hcsg-billing@test.kinto', 1),
    ('qa-user-9226',  9226, 'qa_hcau_admin',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin',           'qa-role-9226',  'QA HCAU Admin',  'Australia', 'qa-hcau-admin@test.kinto',   1),
    ('qa-user-9226m', 9226, 'qa_hcau_doctor', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'manager',         'qa-role-9226m', 'QA HCAU Doctor', 'Australia', 'qa-hcau-doctor@test.kinto',  1),
    ('qa-user-9226o', 9226, 'qa_hcau_nurse',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'operator',        'qa-role-9226o', 'QA HCAU Nurse',  'Australia', 'qa-hcau-nurse@test.kinto',   1),
    ('qa-user-9226a', 9226, 'qa_hcau_billing','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'accountsmanager', 'qa-role-9226a', 'QA HCAU Billing','Australia', 'qa-hcau-billing@test.kinto', 1)
  ON CONFLICT (id) DO UPDATE SET username = EXCLUDED.username;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Healthcare users skipped: %', SQLERRM;
END;
$$;
COMMIT;

BEGIN;
DO $$
BEGIN
  INSERT INTO patients (id, tenant_id, name, phone, email, date_of_birth, gender, blood_group, is_active)
  VALUES
    (9200, 9200, 'QA Patient One',   '9700001001', 'p1@qa-hc.test', '1990-01-15', 'Male',   'O+', true),
    (9201, 9200, 'QA Patient Two',   '9700001002', 'p2@qa-hc.test', '1985-06-20', 'Female', 'A+', true),
    (9202, 9200, 'QA Patient Three', '9700001003', 'p3@qa-hc.test', '2000-03-10', 'Male',   'B+', true)
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'patients 9200 skipped: %', SQLERRM;
END;
$$;
COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════
-- PHARMACY ERP TENANTS (9300–9326)
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;
DO $$
BEGIN
  INSERT INTO tenants (id, name, slug, plan, country, currency, timezone, tax_regime, default_locale, created_at)
  VALUES
    (9300, 'QA Pharmacy Enterprise India', 'qa-ph-e',  'pharmacy_enterprise',   'India',     'INR', 'Asia/Kolkata',     'gst',       'en', NOW()),
    (9320, 'QA Pharmacy Starter India',    'qa-ph-s',  'pharmacy_starter',      'India',     'INR', 'Asia/Kolkata',     'gst',       'en', NOW()),
    (9321, 'QA Pharmacy Professional',     'qa-ph-p',  'pharmacy_professional', 'India',     'INR', 'Asia/Kolkata',     'gst',       'en', NOW()),
    (9322, 'QA Pharmacy UAE',              'qa-ph-ae', 'pharmacy_enterprise',   'UAE',       'AED', 'Asia/Dubai',       'vat',       'en', NOW()),
    (9323, 'QA Pharmacy USA',              'qa-ph-us', 'pharmacy_enterprise',   'USA',       'USD', 'America/New_York', 'sales_tax', 'en', NOW()),
    (9324, 'QA Pharmacy Europe',           'qa-ph-eu', 'pharmacy_enterprise',   'Germany',   'EUR', 'Europe/Berlin',    'vat',       'en', NOW()),
    (9325, 'QA Pharmacy Singapore',        'qa-ph-sg', 'pharmacy_enterprise',   'Singapore', 'SGD', 'Asia/Singapore',   'gst',       'en', NOW()),
    (9326, 'QA Pharmacy Australia',        'qa-ph-au', 'pharmacy_enterprise',   'Australia', 'AUD', 'Australia/Sydney', 'gst',       'en', NOW())
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, plan = EXCLUDED.plan;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Pharmacy tenants skipped: %', SQLERRM;
END;
$$;
COMMIT;

BEGIN;
DO $$
BEGIN
  INSERT INTO roles (id, name, description, tenant_id, record_status) VALUES
    ('qa-role-9300',  'admin',           'Owner/Pharmacist — Ent',     9300, 1),
    ('qa-role-9300m', 'manager',         'Store Manager — Ent',        9300, 1),
    ('qa-role-9300o', 'operator',        'Sales Staff — Ent',          9300, 1),
    ('qa-role-9300r', 'reviewer',        'Inventory Staff — Ent',      9300, 1),
    ('qa-role-9300a', 'accountsmanager', 'Accountant — Ent',           9300, 1),
    ('qa-role-9300h', 'manager',         'HR Manager — Ent',           9300, 1),
    ('qa-role-9300v', 'reviewer',        'MIS Viewer — Ent',           9300, 1),
    ('qa-role-9320',  'admin',           'Owner — PH Starter',         9320, 1),
    ('qa-role-9320m', 'manager',         'Store Mgr — Starter',        9320, 1),
    ('qa-role-9320o', 'operator',        'Sales Staff — Starter',      9320, 1),
    ('qa-role-9320r', 'reviewer',        'Inventory — Starter',        9320, 1),
    ('qa-role-9321',  'admin',           'Owner — PH Pro',             9321, 1),
    ('qa-role-9321m', 'manager',         'Store Mgr — Pro',            9321, 1),
    ('qa-role-9321o', 'operator',        'Sales Staff — Pro',          9321, 1),
    ('qa-role-9321r', 'reviewer',        'Inventory — Pro',            9321, 1),
    ('qa-role-9321a', 'accountsmanager', 'Accountant — Pro',           9321, 1),
    ('qa-role-9322',  'admin',           'Owner — PH UAE',             9322, 1),
    ('qa-role-9322m', 'manager',         'Store Mgr — UAE',            9322, 1),
    ('qa-role-9322o', 'operator',        'Sales Staff — UAE',          9322, 1),
    ('qa-role-9322a', 'accountsmanager', 'Accountant — UAE',           9322, 1),
    ('qa-role-9323',  'admin',           'Owner — PH USA',             9323, 1),
    ('qa-role-9323m', 'manager',         'Store Mgr — USA',            9323, 1),
    ('qa-role-9323o', 'operator',        'Sales Staff — USA',          9323, 1),
    ('qa-role-9323a', 'accountsmanager', 'Accountant — USA',           9323, 1),
    ('qa-role-9324',  'admin',           'Owner — PH EU',              9324, 1),
    ('qa-role-9324m', 'manager',         'Store Mgr — EU',             9324, 1),
    ('qa-role-9324o', 'operator',        'Sales Staff — EU',           9324, 1),
    ('qa-role-9324a', 'accountsmanager', 'Accountant — EU',            9324, 1),
    ('qa-role-9325',  'admin',           'Owner — PH SG',              9325, 1),
    ('qa-role-9325m', 'manager',         'Store Mgr — SG',             9325, 1),
    ('qa-role-9325o', 'operator',        'Sales Staff — SG',           9325, 1),
    ('qa-role-9325a', 'accountsmanager', 'Accountant — SG',            9325, 1),
    ('qa-role-9326',  'admin',           'Owner — PH AU',              9326, 1),
    ('qa-role-9326m', 'manager',         'Store Mgr — AU',             9326, 1),
    ('qa-role-9326o', 'operator',        'Sales Staff — AU',           9326, 1),
    ('qa-role-9326a', 'accountsmanager', 'Accountant — AU',            9326, 1)
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Pharmacy roles skipped: %', SQLERRM;
END;
$$;
COMMIT;

BEGIN;
DO $$
BEGIN
  INSERT INTO users (id, tenant_id, username, password, role, role_id, name, country, email, record_status) VALUES
    ('qa-user-9300',  9300, 'qa_ph_owner',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin',           'qa-role-9300',  'QA PH Owner',   'India', 'qa-ph-owner@test.kinto',   1),
    ('qa-user-9300m', 9300, 'qa_ph_manager', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'manager',         'qa-role-9300m', 'QA PH Manager', 'India', 'qa-ph-mgr@test.kinto',     1),
    ('qa-user-9300o', 9300, 'qa_ph_sales',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'operator',        'qa-role-9300o', 'QA PH Sales',   'India', 'qa-ph-sales@test.kinto',   1),
    ('qa-user-9300r', 9300, 'qa_ph_invt',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'reviewer',        'qa-role-9300r', 'QA PH Invt',    'India', 'qa-ph-invt@test.kinto',    1),
    ('qa-user-9300a', 9300, 'qa_ph_acct',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'accountsmanager', 'qa-role-9300a', 'QA PH Acct',    'India', 'qa-ph-acct@test.kinto',    1),
    ('qa-user-9300h', 9300, 'qa_ph_hr',      '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'manager',         'qa-role-9300h', 'QA PH HR',      'India', 'qa-ph-hr@test.kinto',      1),
    ('qa-user-9300v', 9300, 'qa_ph_mis',     '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'reviewer',        'qa-role-9300v', 'QA PH MIS',     'India', 'qa-ph-mis@test.kinto',     1),
    ('qa-user-9320',  9320, 'qa_phs_owner',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin',    'qa-role-9320',  'QA PHS Owner',  'India', 'qa-phs-owner@test.kinto',  1),
    ('qa-user-9320m', 9320, 'qa_phs_manager','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'manager',  'qa-role-9320m', 'QA PHS Manager','India', 'qa-phs-mgr@test.kinto',    1),
    ('qa-user-9320o', 9320, 'qa_phs_sales',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'operator', 'qa-role-9320o', 'QA PHS Sales',  'India', 'qa-phs-sales@test.kinto',  1),
    ('qa-user-9320r', 9320, 'qa_phs_invt',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'reviewer', 'qa-role-9320r', 'QA PHS Invt',   'India', 'qa-phs-invt@test.kinto',   1),
    ('qa-user-9321',  9321, 'qa_php_owner',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin',           'qa-role-9321',  'QA PHP Owner',  'India', 'qa-php-owner@test.kinto',  1),
    ('qa-user-9321m', 9321, 'qa_php_manager','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'manager',         'qa-role-9321m', 'QA PHP Manager','India', 'qa-php-mgr@test.kinto',    1),
    ('qa-user-9321o', 9321, 'qa_php_sales',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'operator',        'qa-role-9321o', 'QA PHP Sales',  'India', 'qa-php-sales@test.kinto',  1),
    ('qa-user-9321r', 9321, 'qa_php_invt',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'reviewer',        'qa-role-9321r', 'QA PHP Invt',   'India', 'qa-php-invt@test.kinto',   1),
    ('qa-user-9321a', 9321, 'qa_php_acct',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'accountsmanager', 'qa-role-9321a', 'QA PHP Acct',   'India', 'qa-php-acct@test.kinto',   1),
    ('qa-user-9322',  9322, 'qa_phae_owner',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin',           'qa-role-9322',  'QA PHAE Owner',  'UAE',       'qa-phae-owner@test.kinto',  1),
    ('qa-user-9322m', 9322, 'qa_phae_manager','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'manager',         'qa-role-9322m', 'QA PHAE Manager','UAE',       'qa-phae-mgr@test.kinto',    1),
    ('qa-user-9322o', 9322, 'qa_phae_sales',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'operator',        'qa-role-9322o', 'QA PHAE Sales',  'UAE',       'qa-phae-sales@test.kinto',  1),
    ('qa-user-9322a', 9322, 'qa_phae_acct',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'accountsmanager', 'qa-role-9322a', 'QA PHAE Acct',   'UAE',       'qa-phae-acct@test.kinto',   1),
    ('qa-user-9323',  9323, 'qa_phus_owner',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin',           'qa-role-9323',  'QA PHUS Owner',  'USA',       'qa-phus-owner@test.kinto',  1),
    ('qa-user-9323m', 9323, 'qa_phus_manager','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'manager',         'qa-role-9323m', 'QA PHUS Manager','USA',       'qa-phus-mgr@test.kinto',    1),
    ('qa-user-9323o', 9323, 'qa_phus_sales',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'operator',        'qa-role-9323o', 'QA PHUS Sales',  'USA',       'qa-phus-sales@test.kinto',  1),
    ('qa-user-9323a', 9323, 'qa_phus_acct',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'accountsmanager', 'qa-role-9323a', 'QA PHUS Acct',   'USA',       'qa-phus-acct@test.kinto',   1),
    ('qa-user-9324',  9324, 'qa_pheu_owner',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin',           'qa-role-9324',  'QA PHEU Owner',  'Germany',   'qa-pheu-owner@test.kinto',  1),
    ('qa-user-9324m', 9324, 'qa_pheu_manager','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'manager',         'qa-role-9324m', 'QA PHEU Manager','Germany',   'qa-pheu-mgr@test.kinto',    1),
    ('qa-user-9324o', 9324, 'qa_pheu_sales',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'operator',        'qa-role-9324o', 'QA PHEU Sales',  'Germany',   'qa-pheu-sales@test.kinto',  1),
    ('qa-user-9324a', 9324, 'qa_pheu_acct',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'accountsmanager', 'qa-role-9324a', 'QA PHEU Acct',   'Germany',   'qa-pheu-acct@test.kinto',   1),
    ('qa-user-9325',  9325, 'qa_phsg_owner',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin',           'qa-role-9325',  'QA PHSG Owner',  'Singapore', 'qa-phsg-owner@test.kinto',  1),
    ('qa-user-9325m', 9325, 'qa_phsg_manager','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'manager',         'qa-role-9325m', 'QA PHSG Manager','Singapore', 'qa-phsg-mgr@test.kinto',    1),
    ('qa-user-9325o', 9325, 'qa_phsg_sales',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'operator',        'qa-role-9325o', 'QA PHSG Sales',  'Singapore', 'qa-phsg-sales@test.kinto',  1),
    ('qa-user-9325a', 9325, 'qa_phsg_acct',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'accountsmanager', 'qa-role-9325a', 'QA PHSG Acct',   'Singapore', 'qa-phsg-acct@test.kinto',   1),
    ('qa-user-9326',  9326, 'qa_phau_owner',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin',           'qa-role-9326',  'QA PHAU Owner',  'Australia', 'qa-phau-owner@test.kinto',  1),
    ('qa-user-9326m', 9326, 'qa_phau_manager','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'manager',         'qa-role-9326m', 'QA PHAU Manager','Australia', 'qa-phau-mgr@test.kinto',    1),
    ('qa-user-9326o', 9326, 'qa_phau_sales',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'operator',        'qa-role-9326o', 'QA PHAU Sales',  'Australia', 'qa-phau-sales@test.kinto',  1),
    ('qa-user-9326a', 9326, 'qa_phau_acct',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'accountsmanager', 'qa-role-9326a', 'QA PHAU Acct',   'Australia', 'qa-phau-acct@test.kinto',   1)
  ON CONFLICT (id) DO UPDATE SET username = EXCLUDED.username;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Pharmacy users skipped: %', SQLERRM;
END;
$$;
COMMIT;

BEGIN;
DO $$
BEGIN
  INSERT INTO medicines (id, tenant_id, name, generic_name, manufacturer, category, unit, purchase_price, sale_price, gst_rate, is_active)
  VALUES
    (9300, 9300, 'QA Paracetamol 500mg', 'Paracetamol',   'QA Pharma Ltd',  'Analgesic',    'Strip',  12.00,  25.00, 12, true),
    (9301, 9300, 'QA Amoxicillin 250mg', 'Amoxicillin',   'QA Pharma Ltd',  'Antibiotic',   'Strip',  45.00,  80.00, 12, true),
    (9302, 9300, 'QA Vitamin D3 1000IU', 'Cholecalciferol','QA Nutra Ltd',  'Supplement',   'Bottle', 120.00, 199.00, 5, true),
    (9303, 9300, 'QA Cetirizine 10mg',   'Cetirizine',    'QA Pharma Ltd',  'Antihistamine','Strip',  18.00,  35.00, 12, true)
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'medicines 9300 skipped: %', SQLERRM;
END;
$$;
COMMIT;

-- ============================================================
-- REAL ESTATE ERP TENANTS (9800–9826)
-- ============================================================
BEGIN;

INSERT INTO tenants (id, name, slug, plan, country, currency, timezone, tax_regime, default_locale, created_at)
VALUES
  (9800, 'QA Real Estate Enterprise IN', 'qa-re-e',  'real_estate_enterprise',    'India',       'INR', 'Asia/Kolkata',     'gst',       'en', NOW()),
  (9820, 'QA Real Estate Starter IN',    'qa-re-s',  'real_estate_starter',       'India',       'INR', 'Asia/Kolkata',     'gst',       'en', NOW()),
  (9821, 'QA Real Estate Professional',  'qa-re-p',  'real_estate_professional',  'India',       'INR', 'Asia/Kolkata',     'gst',       'en', NOW()),
  (9822, 'QA Real Estate UAE',           'qa-re-ae', 'real_estate_enterprise',    'UAE',         'AED', 'Asia/Dubai',       'vat',       'en', NOW()),
  (9823, 'QA Real Estate USA',           'qa-re-us', 'real_estate_enterprise',    'USA',         'USD', 'America/New_York', 'sales_tax', 'en', NOW()),
  (9824, 'QA Real Estate EU',            'qa-re-eu', 'real_estate_enterprise',    'Germany',     'EUR', 'Europe/Berlin',    'vat',       'en', NOW()),
  (9825, 'QA Real Estate Singapore',     'qa-re-sg', 'real_estate_enterprise',    'Singapore',   'SGD', 'Asia/Singapore',   'gst',       'en', NOW()),
  (9826, 'QA Real Estate Australia',     'qa-re-au', 'real_estate_enterprise',    'Australia',   'AUD', 'Australia/Sydney', 'gst',       'en', NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, slug = EXCLUDED.slug, plan = EXCLUDED.plan,
  country = EXCLUDED.country, currency = EXCLUDED.currency,
  timezone = EXCLUDED.timezone, tax_regime = EXCLUDED.tax_regime;

INSERT INTO roles (id, name, description, tenant_id, record_status)
VALUES
  ('qa-role-9800',  'admin',           'Owner/MD — RE Enterprise',        9800, 1),
  ('qa-role-9800m', 'manager',         'Sales Manager — RE Enterprise',   9800, 1),
  ('qa-role-9800o', 'operator',        'Sales Executive — RE Enterprise', 9800, 1),
  ('qa-role-9800r', 'reviewer',        'Site Inspector — RE Enterprise',  9800, 1),
  ('qa-role-9800a', 'accountsmanager', 'Finance Manager — RE Enterprise', 9800, 1),
  ('qa-role-9820',  'admin',    'Owner — RE Starter',             9820, 1),
  ('qa-role-9820m', 'manager',  'Sales Manager — RE Starter',     9820, 1),
  ('qa-role-9820o', 'operator', 'Sales Executive — RE Starter',   9820, 1),
  ('qa-role-9820r', 'reviewer', 'Site Inspector — RE Starter',    9820, 1),
  ('qa-role-9821',  'admin',           'Owner — RE Pro',                  9821, 1),
  ('qa-role-9821m', 'manager',         'Sales Manager — RE Pro',          9821, 1),
  ('qa-role-9821o', 'operator',        'Sales Executive — RE Pro',        9821, 1),
  ('qa-role-9821r', 'reviewer',        'Site Inspector — RE Pro',         9821, 1),
  ('qa-role-9821a', 'accountsmanager', 'Finance Manager — RE Pro',        9821, 1),
  ('qa-role-9822',  'admin','Owner — RE UAE',9822,1),('qa-role-9822m','manager','Mgr — RE UAE',9822,1),
  ('qa-role-9822o', 'operator','Agent — RE UAE',9822,1),('qa-role-9822a','accountsmanager','Acct — RE UAE',9822,1),
  ('qa-role-9823',  'admin','Owner — RE USA',9823,1),('qa-role-9823m','manager','Mgr — RE USA',9823,1),
  ('qa-role-9823o', 'operator','Agent — RE USA',9823,1),('qa-role-9823a','accountsmanager','Acct — RE USA',9823,1),
  ('qa-role-9824',  'admin','Owner — RE EU',9824,1),('qa-role-9824m','manager','Mgr — RE EU',9824,1),
  ('qa-role-9824o', 'operator','Agent — RE EU',9824,1),('qa-role-9824a','accountsmanager','Acct — RE EU',9824,1),
  ('qa-role-9825',  'admin','Owner — RE SG',9825,1),('qa-role-9825m','manager','Mgr — RE SG',9825,1),
  ('qa-role-9825o', 'operator','Agent — RE SG',9825,1),('qa-role-9825a','accountsmanager','Acct — RE SG',9825,1),
  ('qa-role-9826',  'admin','Owner — RE AU',9826,1),('qa-role-9826m','manager','Mgr — RE AU',9826,1),
  ('qa-role-9826o', 'operator','Agent — RE AU',9826,1),('qa-role-9826a','accountsmanager','Acct — RE AU',9826,1)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, tenant_id = EXCLUDED.tenant_id;

INSERT INTO users (id, tenant_id, username, password, role, role_id, first_name, last_name, email, record_status)
VALUES
  ('qa-user-9800',  9800,'qa_re_e_owner',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',           'qa-role-9800',  'QA RE','E Owner',   'qa-re-e-owner@test.kinto',   1),
  ('qa-user-9800m', 9800,'qa_re_e_manager',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',         'qa-role-9800m', 'QA RE','E Mgr',     'qa-re-e-mgr@test.kinto',     1),
  ('qa-user-9800o', 9800,'qa_re_e_agent',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',        'qa-role-9800o', 'QA RE','E Agent',   'qa-re-e-agent@test.kinto',   1),
  ('qa-user-9800r', 9800,'qa_re_e_inspector','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','reviewer',        'qa-role-9800r', 'QA RE','E Insp',    'qa-re-e-insp@test.kinto',    1),
  ('qa-user-9800a', 9800,'qa_re_e_finance',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager', 'qa-role-9800a', 'QA RE','E Finance', 'qa-re-e-fin@test.kinto',     1),
  ('qa-user-9820',  9820,'qa_re_s_owner',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',    'qa-role-9820',  'QA RE','S Owner',   'qa-re-s-owner@test.kinto',   1),
  ('qa-user-9820m', 9820,'qa_re_s_manager',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',  'qa-role-9820m', 'QA RE','S Mgr',     'qa-re-s-mgr@test.kinto',     1),
  ('qa-user-9820o', 9820,'qa_re_s_agent',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator', 'qa-role-9820o', 'QA RE','S Agent',   'qa-re-s-agent@test.kinto',   1),
  ('qa-user-9820r', 9820,'qa_re_s_inspector','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','reviewer', 'qa-role-9820r', 'QA RE','S Insp',    'qa-re-s-insp@test.kinto',    1),
  ('qa-user-9821',  9821,'qa_re_p_owner',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',           'qa-role-9821',  'QA RE','P Owner',   'qa-re-p-owner@test.kinto',   1),
  ('qa-user-9821m', 9821,'qa_re_p_manager',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',         'qa-role-9821m', 'QA RE','P Mgr',     'qa-re-p-mgr@test.kinto',     1),
  ('qa-user-9821o', 9821,'qa_re_p_agent',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',        'qa-role-9821o', 'QA RE','P Agent',   'qa-re-p-agent@test.kinto',   1),
  ('qa-user-9821r', 9821,'qa_re_p_inspector','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','reviewer',        'qa-role-9821r', 'QA RE','P Insp',    'qa-re-p-insp@test.kinto',    1),
  ('qa-user-9821a', 9821,'qa_re_p_finance',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager', 'qa-role-9821a', 'QA RE','P Finance', 'qa-re-p-fin@test.kinto',     1),
  ('qa-user-9822',  9822,'qa_re_ae_owner',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',          'qa-role-9822',  'QA RE','AE Owner','qa-re-ae-owner@test.kinto', 1),
  ('qa-user-9822m', 9822,'qa_re_ae_manager', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',        'qa-role-9822m', 'QA RE','AE Mgr',  'qa-re-ae-mgr@test.kinto',   1),
  ('qa-user-9822o', 9822,'qa_re_ae_agent',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',       'qa-role-9822o', 'QA RE','AE Agent','qa-re-ae-agent@test.kinto', 1),
  ('qa-user-9822a', 9822,'qa_re_ae_acct',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-9822a', 'QA RE','AE Acct', 'qa-re-ae-acct@test.kinto',  1),
  ('qa-user-9823',  9823,'qa_re_us_owner',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',          'qa-role-9823',  'QA RE','US Owner','qa-re-us-owner@test.kinto', 1),
  ('qa-user-9823m', 9823,'qa_re_us_manager', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',        'qa-role-9823m', 'QA RE','US Mgr',  'qa-re-us-mgr@test.kinto',   1),
  ('qa-user-9823o', 9823,'qa_re_us_agent',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',       'qa-role-9823o', 'QA RE','US Agent','qa-re-us-agent@test.kinto', 1),
  ('qa-user-9823a', 9823,'qa_re_us_acct',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-9823a', 'QA RE','US Acct', 'qa-re-us-acct@test.kinto',  1),
  ('qa-user-9824',  9824,'qa_re_eu_owner',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',          'qa-role-9824',  'QA RE','EU Owner','qa-re-eu-owner@test.kinto', 1),
  ('qa-user-9824m', 9824,'qa_re_eu_manager', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',        'qa-role-9824m', 'QA RE','EU Mgr',  'qa-re-eu-mgr@test.kinto',   1),
  ('qa-user-9824o', 9824,'qa_re_eu_agent',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',       'qa-role-9824o', 'QA RE','EU Agent','qa-re-eu-agent@test.kinto', 1),
  ('qa-user-9824a', 9824,'qa_re_eu_acct',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-9824a', 'QA RE','EU Acct', 'qa-re-eu-acct@test.kinto',  1),
  ('qa-user-9825',  9825,'qa_re_sg_owner',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',          'qa-role-9825',  'QA RE','SG Owner','qa-re-sg-owner@test.kinto', 1),
  ('qa-user-9825m', 9825,'qa_re_sg_manager', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',        'qa-role-9825m', 'QA RE','SG Mgr',  'qa-re-sg-mgr@test.kinto',   1),
  ('qa-user-9825o', 9825,'qa_re_sg_agent',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',       'qa-role-9825o', 'QA RE','SG Agent','qa-re-sg-agent@test.kinto', 1),
  ('qa-user-9825a', 9825,'qa_re_sg_acct',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-9825a', 'QA RE','SG Acct', 'qa-re-sg-acct@test.kinto',  1),
  ('qa-user-9826',  9826,'qa_re_au_owner',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',          'qa-role-9826',  'QA RE','AU Owner','qa-re-au-owner@test.kinto', 1),
  ('qa-user-9826m', 9826,'qa_re_au_manager', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',        'qa-role-9826m', 'QA RE','AU Mgr',  'qa-re-au-mgr@test.kinto',   1),
  ('qa-user-9826o', 9826,'qa_re_au_agent',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',       'qa-role-9826o', 'QA RE','AU Agent','qa-re-au-agent@test.kinto', 1),
  ('qa-user-9826a', 9826,'qa_re_au_acct',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-9826a', 'QA RE','AU Acct', 'qa-re-au-acct@test.kinto',  1)
ON CONFLICT (id) DO UPDATE SET
  tenant_id = EXCLUDED.tenant_id, username = EXCLUDED.username,
  role = EXCLUDED.role, role_id = EXCLUDED.role_id, record_status = EXCLUDED.record_status;

COMMIT;

-- ============================================================
-- AGRICULTURE ERP TENANTS (9900–9926)
-- ============================================================
BEGIN;

INSERT INTO tenants (id, name, slug, plan, country, currency, timezone, tax_regime, default_locale, created_at)
VALUES
  (9900, 'QA Agriculture Enterprise IN', 'qa-agr-e',  'agriculture_enterprise',    'India',       'INR', 'Asia/Kolkata',     'gst',       'en', NOW()),
  (9920, 'QA Agriculture Starter IN',    'qa-agr-s',  'agriculture_starter',       'India',       'INR', 'Asia/Kolkata',     'gst',       'en', NOW()),
  (9921, 'QA Agriculture Professional',  'qa-agr-p',  'agriculture_professional',  'India',       'INR', 'Asia/Kolkata',     'gst',       'en', NOW()),
  (9922, 'QA Agriculture UAE',           'qa-agr-ae', 'agriculture_enterprise',    'UAE',         'AED', 'Asia/Dubai',       'vat',       'en', NOW()),
  (9923, 'QA Agriculture USA',           'qa-agr-us', 'agriculture_enterprise',    'USA',         'USD', 'America/New_York', 'sales_tax', 'en', NOW()),
  (9924, 'QA Agriculture EU',            'qa-agr-eu', 'agriculture_enterprise',    'Germany',     'EUR', 'Europe/Berlin',    'vat',       'en', NOW()),
  (9925, 'QA Agriculture Singapore',     'qa-agr-sg', 'agriculture_enterprise',    'Singapore',   'SGD', 'Asia/Singapore',   'gst',       'en', NOW()),
  (9926, 'QA Agriculture Australia',     'qa-agr-au', 'agriculture_enterprise',    'Australia',   'AUD', 'Australia/Sydney', 'gst',       'en', NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, slug = EXCLUDED.slug, plan = EXCLUDED.plan,
  country = EXCLUDED.country, currency = EXCLUDED.currency,
  timezone = EXCLUDED.timezone, tax_regime = EXCLUDED.tax_regime;

INSERT INTO roles (id, name, description, tenant_id, record_status)
VALUES
  ('qa-role-9900',  'admin',           'Farm Owner — AGR Enterprise',        9900, 1),
  ('qa-role-9900m', 'manager',         'Farm Manager — AGR Enterprise',      9900, 1),
  ('qa-role-9900o', 'operator',        'Field Supervisor — AGR Enterprise',  9900, 1),
  ('qa-role-9900r', 'reviewer',        'Quality Inspector — AGR Enterprise', 9900, 1),
  ('qa-role-9900a', 'accountsmanager', 'Accountant — AGR Enterprise',        9900, 1),
  ('qa-role-9920',  'admin',    'Farm Owner — AGR Starter',        9920, 1),
  ('qa-role-9920m', 'manager',  'Farm Manager — AGR Starter',      9920, 1),
  ('qa-role-9920o', 'operator', 'Field Supervisor — AGR Starter',  9920, 1),
  ('qa-role-9920r', 'reviewer', 'Quality Inspector — AGR Starter', 9920, 1),
  ('qa-role-9921',  'admin',           'Farm Owner — AGR Pro',        9921, 1),
  ('qa-role-9921m', 'manager',         'Farm Manager — AGR Pro',      9921, 1),
  ('qa-role-9921o', 'operator',        'Field Supervisor — AGR Pro',  9921, 1),
  ('qa-role-9921r', 'reviewer',        'Quality Inspector — AGR Pro', 9921, 1),
  ('qa-role-9921a', 'accountsmanager', 'Accountant — AGR Pro',        9921, 1),
  ('qa-role-9922',  'admin','Owner — AGR UAE',9922,1),('qa-role-9922m','manager','Mgr — AGR UAE',9922,1),
  ('qa-role-9922o', 'operator','Supervisor — AGR UAE',9922,1),('qa-role-9922a','accountsmanager','Acct — AGR UAE',9922,1),
  ('qa-role-9923',  'admin','Owner — AGR USA',9923,1),('qa-role-9923m','manager','Mgr — AGR USA',9923,1),
  ('qa-role-9923o', 'operator','Supervisor — AGR USA',9923,1),('qa-role-9923a','accountsmanager','Acct — AGR USA',9923,1),
  ('qa-role-9924',  'admin','Owner — AGR EU',9924,1),('qa-role-9924m','manager','Mgr — AGR EU',9924,1),
  ('qa-role-9924o', 'operator','Supervisor — AGR EU',9924,1),('qa-role-9924a','accountsmanager','Acct — AGR EU',9924,1),
  ('qa-role-9925',  'admin','Owner — AGR SG',9925,1),('qa-role-9925m','manager','Mgr — AGR SG',9925,1),
  ('qa-role-9925o', 'operator','Supervisor — AGR SG',9925,1),('qa-role-9925a','accountsmanager','Acct — AGR SG',9925,1),
  ('qa-role-9926',  'admin','Owner — AGR AU',9926,1),('qa-role-9926m','manager','Mgr — AGR AU',9926,1),
  ('qa-role-9926o', 'operator','Supervisor — AGR AU',9926,1),('qa-role-9926a','accountsmanager','Acct — AGR AU',9926,1)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, tenant_id = EXCLUDED.tenant_id;

INSERT INTO users (id, tenant_id, username, password, role, role_id, first_name, last_name, email, record_status)
VALUES
  ('qa-user-9900',  9900,'qa_agr_e_owner',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',           'qa-role-9900',  'QA AGR','E Owner','qa-agr-e-owner@test.kinto',  1),
  ('qa-user-9900m', 9900,'qa_agr_e_manager', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',         'qa-role-9900m', 'QA AGR','E Mgr',  'qa-agr-e-mgr@test.kinto',    1),
  ('qa-user-9900o', 9900,'qa_agr_e_super',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',        'qa-role-9900o', 'QA AGR','E Super','qa-agr-e-super@test.kinto',  1),
  ('qa-user-9900r', 9900,'qa_agr_e_qc',      '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','reviewer',        'qa-role-9900r', 'QA AGR','E QC',   'qa-agr-e-qc@test.kinto',     1),
  ('qa-user-9900a', 9900,'qa_agr_e_acct',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager', 'qa-role-9900a', 'QA AGR','E Acct', 'qa-agr-e-acct@test.kinto',   1),
  ('qa-user-9920',  9920,'qa_agr_s_owner',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',    'qa-role-9920',  'QA AGR','S Owner','qa-agr-s-owner@test.kinto',  1),
  ('qa-user-9920m', 9920,'qa_agr_s_manager', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',  'qa-role-9920m', 'QA AGR','S Mgr',  'qa-agr-s-mgr@test.kinto',    1),
  ('qa-user-9920o', 9920,'qa_agr_s_super',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator', 'qa-role-9920o', 'QA AGR','S Super','qa-agr-s-super@test.kinto',  1),
  ('qa-user-9920r', 9920,'qa_agr_s_qc',      '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','reviewer', 'qa-role-9920r', 'QA AGR','S QC',   'qa-agr-s-qc@test.kinto',     1),
  ('qa-user-9921',  9921,'qa_agr_p_owner',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',           'qa-role-9921',  'QA AGR','P Owner','qa-agr-p-owner@test.kinto',  1),
  ('qa-user-9921m', 9921,'qa_agr_p_manager', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',         'qa-role-9921m', 'QA AGR','P Mgr',  'qa-agr-p-mgr@test.kinto',    1),
  ('qa-user-9921o', 9921,'qa_agr_p_super',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',        'qa-role-9921o', 'QA AGR','P Super','qa-agr-p-super@test.kinto',  1),
  ('qa-user-9921r', 9921,'qa_agr_p_qc',      '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','reviewer',        'qa-role-9921r', 'QA AGR','P QC',   'qa-agr-p-qc@test.kinto',     1),
  ('qa-user-9921a', 9921,'qa_agr_p_acct',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager', 'qa-role-9921a', 'QA AGR','P Acct', 'qa-agr-p-acct@test.kinto',   1),
  ('qa-user-9922',  9922,'qa_agr_ae_owner',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',          'qa-role-9922',  'QA AGR','AE Owner','qa-agr-ae-owner@test.kinto', 1),
  ('qa-user-9922m', 9922,'qa_agr_ae_mgr',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',        'qa-role-9922m', 'QA AGR','AE Mgr',  'qa-agr-ae-mgr@test.kinto',   1),
  ('qa-user-9922o', 9922,'qa_agr_ae_super',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',       'qa-role-9922o', 'QA AGR','AE Super','qa-agr-ae-super@test.kinto', 1),
  ('qa-user-9922a', 9922,'qa_agr_ae_acct',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-9922a', 'QA AGR','AE Acct', 'qa-agr-ae-acct@test.kinto',  1),
  ('qa-user-9923',  9923,'qa_agr_us_owner',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',          'qa-role-9923',  'QA AGR','US Owner','qa-agr-us-owner@test.kinto', 1),
  ('qa-user-9923m', 9923,'qa_agr_us_mgr',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',        'qa-role-9923m', 'QA AGR','US Mgr',  'qa-agr-us-mgr@test.kinto',   1),
  ('qa-user-9923o', 9923,'qa_agr_us_super',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',       'qa-role-9923o', 'QA AGR','US Super','qa-agr-us-super@test.kinto', 1),
  ('qa-user-9923a', 9923,'qa_agr_us_acct',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-9923a', 'QA AGR','US Acct', 'qa-agr-us-acct@test.kinto',  1),
  ('qa-user-9924',  9924,'qa_agr_eu_owner',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',          'qa-role-9924',  'QA AGR','EU Owner','qa-agr-eu-owner@test.kinto', 1),
  ('qa-user-9924m', 9924,'qa_agr_eu_mgr',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',        'qa-role-9924m', 'QA AGR','EU Mgr',  'qa-agr-eu-mgr@test.kinto',   1),
  ('qa-user-9924o', 9924,'qa_agr_eu_super',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',       'qa-role-9924o', 'QA AGR','EU Super','qa-agr-eu-super@test.kinto', 1),
  ('qa-user-9924a', 9924,'qa_agr_eu_acct',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-9924a', 'QA AGR','EU Acct', 'qa-agr-eu-acct@test.kinto',  1),
  ('qa-user-9925',  9925,'qa_agr_sg_owner',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',          'qa-role-9925',  'QA AGR','SG Owner','qa-agr-sg-owner@test.kinto', 1),
  ('qa-user-9925m', 9925,'qa_agr_sg_mgr',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',        'qa-role-9925m', 'QA AGR','SG Mgr',  'qa-agr-sg-mgr@test.kinto',   1),
  ('qa-user-9925o', 9925,'qa_agr_sg_super',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',       'qa-role-9925o', 'QA AGR','SG Super','qa-agr-sg-super@test.kinto', 1),
  ('qa-user-9925a', 9925,'qa_agr_sg_acct',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-9925a', 'QA AGR','SG Acct', 'qa-agr-sg-acct@test.kinto',  1),
  ('qa-user-9926',  9926,'qa_agr_au_owner',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',          'qa-role-9926',  'QA AGR','AU Owner','qa-agr-au-owner@test.kinto', 1),
  ('qa-user-9926m', 9926,'qa_agr_au_mgr',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',        'qa-role-9926m', 'QA AGR','AU Mgr',  'qa-agr-au-mgr@test.kinto',   1),
  ('qa-user-9926o', 9926,'qa_agr_au_super',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',       'qa-role-9926o', 'QA AGR','AU Super','qa-agr-au-super@test.kinto', 1),
  ('qa-user-9926a', 9926,'qa_agr_au_acct',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-9926a', 'QA AGR','AU Acct', 'qa-agr-au-acct@test.kinto',  1)
ON CONFLICT (id) DO UPDATE SET
  tenant_id = EXCLUDED.tenant_id, username = EXCLUDED.username,
  role = EXCLUDED.role, role_id = EXCLUDED.role_id, record_status = EXCLUDED.record_status;

COMMIT;

-- ============================================================
-- EDUCATION ERP TENANTS (9950–9976)
-- ============================================================
BEGIN;

INSERT INTO tenants (id, name, slug, plan, country, currency, timezone, tax_regime, default_locale, created_at)
VALUES
  (9950, 'QA Education Enterprise IN', 'qa-edu-e',  'education_enterprise',    'India',       'INR', 'Asia/Kolkata',     'gst',       'en', NOW()),
  (9970, 'QA Education Starter IN',    'qa-edu-s',  'education_starter',       'India',       'INR', 'Asia/Kolkata',     'gst',       'en', NOW()),
  (9971, 'QA Education Professional',  'qa-edu-p',  'education_professional',  'India',       'INR', 'Asia/Kolkata',     'gst',       'en', NOW()),
  (9972, 'QA Education UAE',           'qa-edu-ae', 'education_enterprise',    'UAE',         'AED', 'Asia/Dubai',       'vat',       'en', NOW()),
  (9973, 'QA Education USA',           'qa-edu-us', 'education_enterprise',    'USA',         'USD', 'America/New_York', 'sales_tax', 'en', NOW()),
  (9974, 'QA Education EU',            'qa-edu-eu', 'education_enterprise',    'Germany',     'EUR', 'Europe/Berlin',    'vat',       'en', NOW()),
  (9975, 'QA Education Singapore',     'qa-edu-sg', 'education_enterprise',    'Singapore',   'SGD', 'Asia/Singapore',   'gst',       'en', NOW()),
  (9976, 'QA Education Australia',     'qa-edu-au', 'education_enterprise',    'Australia',   'AUD', 'Australia/Sydney', 'gst',       'en', NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, slug = EXCLUDED.slug, plan = EXCLUDED.plan,
  country = EXCLUDED.country, currency = EXCLUDED.currency,
  timezone = EXCLUDED.timezone, tax_regime = EXCLUDED.tax_regime;

INSERT INTO roles (id, name, description, tenant_id, record_status)
VALUES
  ('qa-role-9950',  'admin',           'Principal — EDU Enterprise',        9950, 1),
  ('qa-role-9950m', 'manager',         'Admin Officer — EDU Enterprise',    9950, 1),
  ('qa-role-9950o', 'operator',        'Fee Collector — EDU Enterprise',    9950, 1),
  ('qa-role-9950r', 'reviewer',        'Teacher — EDU Enterprise',          9950, 1),
  ('qa-role-9950a', 'accountsmanager', 'Finance Officer — EDU Enterprise',  9950, 1),
  ('qa-role-9970',  'admin',    'Principal — EDU Starter',      9970, 1),
  ('qa-role-9970m', 'manager',  'Admin Officer — EDU Starter',  9970, 1),
  ('qa-role-9970o', 'operator', 'Fee Collector — EDU Starter',  9970, 1),
  ('qa-role-9970r', 'reviewer', 'Teacher — EDU Starter',        9970, 1),
  ('qa-role-9971',  'admin',           'Principal — EDU Pro',        9971, 1),
  ('qa-role-9971m', 'manager',         'Admin Officer — EDU Pro',    9971, 1),
  ('qa-role-9971o', 'operator',        'Fee Collector — EDU Pro',    9971, 1),
  ('qa-role-9971r', 'reviewer',        'Teacher — EDU Pro',          9971, 1),
  ('qa-role-9971a', 'accountsmanager', 'Finance Officer — EDU Pro',  9971, 1),
  ('qa-role-9972',  'admin','Principal — EDU UAE',9972,1),('qa-role-9972m','manager','Admin — EDU UAE',9972,1),
  ('qa-role-9972o', 'operator','Fee — EDU UAE',9972,1),('qa-role-9972a','accountsmanager','Finance — EDU UAE',9972,1),
  ('qa-role-9973',  'admin','Principal — EDU USA',9973,1),('qa-role-9973m','manager','Admin — EDU USA',9973,1),
  ('qa-role-9973o', 'operator','Fee — EDU USA',9973,1),('qa-role-9973a','accountsmanager','Finance — EDU USA',9973,1),
  ('qa-role-9974',  'admin','Principal — EDU EU',9974,1),('qa-role-9974m','manager','Admin — EDU EU',9974,1),
  ('qa-role-9974o', 'operator','Fee — EDU EU',9974,1),('qa-role-9974a','accountsmanager','Finance — EDU EU',9974,1),
  ('qa-role-9975',  'admin','Principal — EDU SG',9975,1),('qa-role-9975m','manager','Admin — EDU SG',9975,1),
  ('qa-role-9975o', 'operator','Fee — EDU SG',9975,1),('qa-role-9975a','accountsmanager','Finance — EDU SG',9975,1),
  ('qa-role-9976',  'admin','Principal — EDU AU',9976,1),('qa-role-9976m','manager','Admin — EDU AU',9976,1),
  ('qa-role-9976o', 'operator','Fee — EDU AU',9976,1),('qa-role-9976a','accountsmanager','Finance — EDU AU',9976,1)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, tenant_id = EXCLUDED.tenant_id;

INSERT INTO users (id, tenant_id, username, password, role, role_id, first_name, last_name, email, record_status)
VALUES
  ('qa-user-9950',  9950,'qa_edu_e_owner',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',           'qa-role-9950',  'QA EDU','E Principal','qa-edu-e-owner@test.kinto', 1),
  ('qa-user-9950m', 9950,'qa_edu_e_admin',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',         'qa-role-9950m', 'QA EDU','E Admin',    'qa-edu-e-admin@test.kinto', 1),
  ('qa-user-9950o', 9950,'qa_edu_e_fee',     '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',        'qa-role-9950o', 'QA EDU','E Fee',      'qa-edu-e-fee@test.kinto',   1),
  ('qa-user-9950r', 9950,'qa_edu_e_teacher', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','reviewer',        'qa-role-9950r', 'QA EDU','E Teacher',  'qa-edu-e-tchr@test.kinto',  1),
  ('qa-user-9950a', 9950,'qa_edu_e_finance', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager', 'qa-role-9950a', 'QA EDU','E Finance',  'qa-edu-e-fin@test.kinto',   1),
  ('qa-user-9970',  9970,'qa_edu_s_owner',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',    'qa-role-9970',  'QA EDU','S Principal','qa-edu-s-owner@test.kinto', 1),
  ('qa-user-9970m', 9970,'qa_edu_s_admin',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',  'qa-role-9970m', 'QA EDU','S Admin',    'qa-edu-s-admin@test.kinto', 1),
  ('qa-user-9970o', 9970,'qa_edu_s_fee',     '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator', 'qa-role-9970o', 'QA EDU','S Fee',      'qa-edu-s-fee@test.kinto',   1),
  ('qa-user-9970r', 9970,'qa_edu_s_teacher', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','reviewer', 'qa-role-9970r', 'QA EDU','S Teacher',  'qa-edu-s-tchr@test.kinto',  1),
  ('qa-user-9971',  9971,'qa_edu_p_owner',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',           'qa-role-9971',  'QA EDU','P Principal','qa-edu-p-owner@test.kinto', 1),
  ('qa-user-9971m', 9971,'qa_edu_p_admin',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',         'qa-role-9971m', 'QA EDU','P Admin',    'qa-edu-p-admin@test.kinto', 1),
  ('qa-user-9971o', 9971,'qa_edu_p_fee',     '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',        'qa-role-9971o', 'QA EDU','P Fee',      'qa-edu-p-fee@test.kinto',   1),
  ('qa-user-9971r', 9971,'qa_edu_p_teacher', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','reviewer',        'qa-role-9971r', 'QA EDU','P Teacher',  'qa-edu-p-tchr@test.kinto',  1),
  ('qa-user-9971a', 9971,'qa_edu_p_finance', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager', 'qa-role-9971a', 'QA EDU','P Finance',  'qa-edu-p-fin@test.kinto',   1),
  ('qa-user-9972',  9972,'qa_edu_ae_owner',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',          'qa-role-9972',  'QA EDU','AE Owner','qa-edu-ae-owner@test.kinto', 1),
  ('qa-user-9972m', 9972,'qa_edu_ae_admin',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',        'qa-role-9972m', 'QA EDU','AE Admin','qa-edu-ae-admin@test.kinto', 1),
  ('qa-user-9972o', 9972,'qa_edu_ae_fee',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',       'qa-role-9972o', 'QA EDU','AE Fee',  'qa-edu-ae-fee@test.kinto',   1),
  ('qa-user-9972a', 9972,'qa_edu_ae_fin',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-9972a', 'QA EDU','AE Fin',  'qa-edu-ae-fin@test.kinto',   1),
  ('qa-user-9973',  9973,'qa_edu_us_owner',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',          'qa-role-9973',  'QA EDU','US Owner','qa-edu-us-owner@test.kinto', 1),
  ('qa-user-9973m', 9973,'qa_edu_us_admin',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',        'qa-role-9973m', 'QA EDU','US Admin','qa-edu-us-admin@test.kinto', 1),
  ('qa-user-9973o', 9973,'qa_edu_us_fee',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',       'qa-role-9973o', 'QA EDU','US Fee',  'qa-edu-us-fee@test.kinto',   1),
  ('qa-user-9973a', 9973,'qa_edu_us_fin',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-9973a', 'QA EDU','US Fin',  'qa-edu-us-fin@test.kinto',   1),
  ('qa-user-9974',  9974,'qa_edu_eu_owner',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',          'qa-role-9974',  'QA EDU','EU Owner','qa-edu-eu-owner@test.kinto', 1),
  ('qa-user-9974m', 9974,'qa_edu_eu_admin',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',        'qa-role-9974m', 'QA EDU','EU Admin','qa-edu-eu-admin@test.kinto', 1),
  ('qa-user-9974o', 9974,'qa_edu_eu_fee',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',       'qa-role-9974o', 'QA EDU','EU Fee',  'qa-edu-eu-fee@test.kinto',   1),
  ('qa-user-9974a', 9974,'qa_edu_eu_fin',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-9974a', 'QA EDU','EU Fin',  'qa-edu-eu-fin@test.kinto',   1),
  ('qa-user-9975',  9975,'qa_edu_sg_owner',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',          'qa-role-9975',  'QA EDU','SG Owner','qa-edu-sg-owner@test.kinto', 1),
  ('qa-user-9975m', 9975,'qa_edu_sg_admin',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',        'qa-role-9975m', 'QA EDU','SG Admin','qa-edu-sg-admin@test.kinto', 1),
  ('qa-user-9975o', 9975,'qa_edu_sg_fee',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',       'qa-role-9975o', 'QA EDU','SG Fee',  'qa-edu-sg-fee@test.kinto',   1),
  ('qa-user-9975a', 9975,'qa_edu_sg_fin',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-9975a', 'QA EDU','SG Fin',  'qa-edu-sg-fin@test.kinto',   1),
  ('qa-user-9976',  9976,'qa_edu_au_owner',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',          'qa-role-9976',  'QA EDU','AU Owner','qa-edu-au-owner@test.kinto', 1),
  ('qa-user-9976m', 9976,'qa_edu_au_admin',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',        'qa-role-9976m', 'QA EDU','AU Admin','qa-edu-au-admin@test.kinto', 1),
  ('qa-user-9976o', 9976,'qa_edu_au_fee',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',       'qa-role-9976o', 'QA EDU','AU Fee',  'qa-edu-au-fee@test.kinto',   1),
  ('qa-user-9976a', 9976,'qa_edu_au_fin',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-9976a', 'QA EDU','AU Fin',  'qa-edu-au-fin@test.kinto',   1)
ON CONFLICT (id) DO UPDATE SET
  tenant_id = EXCLUDED.tenant_id, username = EXCLUDED.username,
  role = EXCLUDED.role, role_id = EXCLUDED.role_id, record_status = EXCLUDED.record_status;

COMMIT;

-- ============================================================
-- GOLD ERP TENANTS (8000–8026)
-- ============================================================
BEGIN;

INSERT INTO tenants (id, name, slug, plan, country, currency, timezone, tax_regime, default_locale, created_at)
VALUES
  (8000, 'QA Gold ERP Enterprise IN', 'qa-gold-e',  'gold_erp_enterprise',    'India',       'INR', 'Asia/Kolkata',     'gst',       'en', NOW()),
  (8020, 'QA Gold ERP Starter IN',    'qa-gold-s',  'gold_erp_starter',       'India',       'INR', 'Asia/Kolkata',     'gst',       'en', NOW()),
  (8021, 'QA Gold ERP Professional',  'qa-gold-p',  'gold_erp_professional',  'India',       'INR', 'Asia/Kolkata',     'gst',       'en', NOW()),
  (8022, 'QA Gold ERP UAE',           'qa-gold-ae', 'gold_erp_enterprise',    'UAE',         'AED', 'Asia/Dubai',       'vat',       'en', NOW()),
  (8023, 'QA Gold ERP USA',           'qa-gold-us', 'gold_erp_enterprise',    'USA',         'USD', 'America/New_York', 'sales_tax', 'en', NOW()),
  (8024, 'QA Gold ERP EU',            'qa-gold-eu', 'gold_erp_enterprise',    'Germany',     'EUR', 'Europe/Berlin',    'vat',       'en', NOW()),
  (8025, 'QA Gold ERP Singapore',     'qa-gold-sg', 'gold_erp_enterprise',    'Singapore',   'SGD', 'Asia/Singapore',   'gst',       'en', NOW()),
  (8026, 'QA Gold ERP Australia',     'qa-gold-au', 'gold_erp_enterprise',    'Australia',   'AUD', 'Australia/Sydney', 'gst',       'en', NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, slug = EXCLUDED.slug, plan = EXCLUDED.plan,
  country = EXCLUDED.country, currency = EXCLUDED.currency,
  timezone = EXCLUDED.timezone, tax_regime = EXCLUDED.tax_regime;

INSERT INTO roles (id, name, description, tenant_id, record_status)
VALUES
  ('qa-role-8000',  'admin',           'Owner/Director — Gold Enterprise',    8000, 1),
  ('qa-role-8000m', 'manager',         'Store Manager — Gold Enterprise',     8000, 1),
  ('qa-role-8000o', 'operator',        'Sales Staff — Gold Enterprise',       8000, 1),
  ('qa-role-8000r', 'reviewer',        'Quality Checker — Gold Enterprise',   8000, 1),
  ('qa-role-8000a', 'accountsmanager', 'Accountant — Gold Enterprise',        8000, 1),
  ('qa-role-8020',  'admin',    'Owner — Gold Starter',           8020, 1),
  ('qa-role-8020m', 'manager',  'Store Manager — Gold Starter',   8020, 1),
  ('qa-role-8020o', 'operator', 'Sales Staff — Gold Starter',     8020, 1),
  ('qa-role-8020r', 'reviewer', 'Quality Checker — Gold Starter', 8020, 1),
  ('qa-role-8021',  'admin',           'Owner — Gold Pro',           8021, 1),
  ('qa-role-8021m', 'manager',         'Store Manager — Gold Pro',   8021, 1),
  ('qa-role-8021o', 'operator',        'Sales Staff — Gold Pro',     8021, 1),
  ('qa-role-8021r', 'reviewer',        'Quality Checker — Gold Pro', 8021, 1),
  ('qa-role-8021a', 'accountsmanager', 'Accountant — Gold Pro',      8021, 1),
  ('qa-role-8022',  'admin','Owner — Gold UAE',8022,1),('qa-role-8022m','manager','Mgr — Gold UAE',8022,1),
  ('qa-role-8022o', 'operator','Staff — Gold UAE',8022,1),('qa-role-8022a','accountsmanager','Acct — Gold UAE',8022,1),
  ('qa-role-8023',  'admin','Owner — Gold USA',8023,1),('qa-role-8023m','manager','Mgr — Gold USA',8023,1),
  ('qa-role-8023o', 'operator','Staff — Gold USA',8023,1),('qa-role-8023a','accountsmanager','Acct — Gold USA',8023,1),
  ('qa-role-8024',  'admin','Owner — Gold EU',8024,1),('qa-role-8024m','manager','Mgr — Gold EU',8024,1),
  ('qa-role-8024o', 'operator','Staff — Gold EU',8024,1),('qa-role-8024a','accountsmanager','Acct — Gold EU',8024,1),
  ('qa-role-8025',  'admin','Owner — Gold SG',8025,1),('qa-role-8025m','manager','Mgr — Gold SG',8025,1),
  ('qa-role-8025o', 'operator','Staff — Gold SG',8025,1),('qa-role-8025a','accountsmanager','Acct — Gold SG',8025,1),
  ('qa-role-8026',  'admin','Owner — Gold AU',8026,1),('qa-role-8026m','manager','Mgr — Gold AU',8026,1),
  ('qa-role-8026o', 'operator','Staff — Gold AU',8026,1),('qa-role-8026a','accountsmanager','Acct — Gold AU',8026,1)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, tenant_id = EXCLUDED.tenant_id;

INSERT INTO users (id, tenant_id, username, password, role, role_id, first_name, last_name, email, record_status)
VALUES
  ('qa-user-8000',  8000,'qa_gold_e_owner',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',           'qa-role-8000',  'QA GOLD','E Owner','qa-gold-e-owner@test.kinto',  1),
  ('qa-user-8000m', 8000,'qa_gold_e_mgr',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',         'qa-role-8000m', 'QA GOLD','E Mgr',  'qa-gold-e-mgr@test.kinto',    1),
  ('qa-user-8000o', 8000,'qa_gold_e_staff',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',        'qa-role-8000o', 'QA GOLD','E Staff','qa-gold-e-staff@test.kinto',  1),
  ('qa-user-8000r', 8000,'qa_gold_e_qc',     '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','reviewer',        'qa-role-8000r', 'QA GOLD','E QC',   'qa-gold-e-qc@test.kinto',     1),
  ('qa-user-8000a', 8000,'qa_gold_e_acct',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager', 'qa-role-8000a', 'QA GOLD','E Acct', 'qa-gold-e-acct@test.kinto',   1),
  ('qa-user-8020',  8020,'qa_gold_s_owner',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',    'qa-role-8020',  'QA GOLD','S Owner','qa-gold-s-owner@test.kinto',  1),
  ('qa-user-8020m', 8020,'qa_gold_s_mgr',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',  'qa-role-8020m', 'QA GOLD','S Mgr',  'qa-gold-s-mgr@test.kinto',    1),
  ('qa-user-8020o', 8020,'qa_gold_s_staff',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator', 'qa-role-8020o', 'QA GOLD','S Staff','qa-gold-s-staff@test.kinto',  1),
  ('qa-user-8020r', 8020,'qa_gold_s_qc',     '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','reviewer', 'qa-role-8020r', 'QA GOLD','S QC',   'qa-gold-s-qc@test.kinto',     1),
  ('qa-user-8021',  8021,'qa_gold_p_owner',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',           'qa-role-8021',  'QA GOLD','P Owner','qa-gold-p-owner@test.kinto',  1),
  ('qa-user-8021m', 8021,'qa_gold_p_mgr',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',         'qa-role-8021m', 'QA GOLD','P Mgr',  'qa-gold-p-mgr@test.kinto',    1),
  ('qa-user-8021o', 8021,'qa_gold_p_staff',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',        'qa-role-8021o', 'QA GOLD','P Staff','qa-gold-p-staff@test.kinto',  1),
  ('qa-user-8021r', 8021,'qa_gold_p_qc',     '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','reviewer',        'qa-role-8021r', 'QA GOLD','P QC',   'qa-gold-p-qc@test.kinto',     1),
  ('qa-user-8021a', 8021,'qa_gold_p_acct',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager', 'qa-role-8021a', 'QA GOLD','P Acct', 'qa-gold-p-acct@test.kinto',   1),
  ('qa-user-8022',  8022,'qa_gold_ae_owner', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',          'qa-role-8022',  'QA GOLD','AE Owner','qa-gold-ae-owner@test.kinto', 1),
  ('qa-user-8022m', 8022,'qa_gold_ae_mgr',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',        'qa-role-8022m', 'QA GOLD','AE Mgr',  'qa-gold-ae-mgr@test.kinto',   1),
  ('qa-user-8022o', 8022,'qa_gold_ae_staff', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',       'qa-role-8022o', 'QA GOLD','AE Staff','qa-gold-ae-staff@test.kinto', 1),
  ('qa-user-8022a', 8022,'qa_gold_ae_acct',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-8022a', 'QA GOLD','AE Acct', 'qa-gold-ae-acct@test.kinto',  1),
  ('qa-user-8023',  8023,'qa_gold_us_owner', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',          'qa-role-8023',  'QA GOLD','US Owner','qa-gold-us-owner@test.kinto', 1),
  ('qa-user-8023m', 8023,'qa_gold_us_mgr',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',        'qa-role-8023m', 'QA GOLD','US Mgr',  'qa-gold-us-mgr@test.kinto',   1),
  ('qa-user-8023o', 8023,'qa_gold_us_staff', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',       'qa-role-8023o', 'QA GOLD','US Staff','qa-gold-us-staff@test.kinto', 1),
  ('qa-user-8023a', 8023,'qa_gold_us_acct',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-8023a', 'QA GOLD','US Acct', 'qa-gold-us-acct@test.kinto',  1),
  ('qa-user-8024',  8024,'qa_gold_eu_owner', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',          'qa-role-8024',  'QA GOLD','EU Owner','qa-gold-eu-owner@test.kinto', 1),
  ('qa-user-8024m', 8024,'qa_gold_eu_mgr',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',        'qa-role-8024m', 'QA GOLD','EU Mgr',  'qa-gold-eu-mgr@test.kinto',   1),
  ('qa-user-8024o', 8024,'qa_gold_eu_staff', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',       'qa-role-8024o', 'QA GOLD','EU Staff','qa-gold-eu-staff@test.kinto', 1),
  ('qa-user-8024a', 8024,'qa_gold_eu_acct',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-8024a', 'QA GOLD','EU Acct', 'qa-gold-eu-acct@test.kinto',  1),
  ('qa-user-8025',  8025,'qa_gold_sg_owner', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',          'qa-role-8025',  'QA GOLD','SG Owner','qa-gold-sg-owner@test.kinto', 1),
  ('qa-user-8025m', 8025,'qa_gold_sg_mgr',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',        'qa-role-8025m', 'QA GOLD','SG Mgr',  'qa-gold-sg-mgr@test.kinto',   1),
  ('qa-user-8025o', 8025,'qa_gold_sg_staff', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',       'qa-role-8025o', 'QA GOLD','SG Staff','qa-gold-sg-staff@test.kinto', 1),
  ('qa-user-8025a', 8025,'qa_gold_sg_acct',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-8025a', 'QA GOLD','SG Acct', 'qa-gold-sg-acct@test.kinto',  1),
  ('qa-user-8026',  8026,'qa_gold_au_owner', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',          'qa-role-8026',  'QA GOLD','AU Owner','qa-gold-au-owner@test.kinto', 1),
  ('qa-user-8026m', 8026,'qa_gold_au_mgr',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',        'qa-role-8026m', 'QA GOLD','AU Mgr',  'qa-gold-au-mgr@test.kinto',   1),
  ('qa-user-8026o', 8026,'qa_gold_au_staff', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',       'qa-role-8026o', 'QA GOLD','AU Staff','qa-gold-au-staff@test.kinto', 1),
  ('qa-user-8026a', 8026,'qa_gold_au_acct',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-8026a', 'QA GOLD','AU Acct', 'qa-gold-au-acct@test.kinto',  1)
ON CONFLICT (id) DO UPDATE SET
  tenant_id = EXCLUDED.tenant_id, username = EXCLUDED.username,
  role = EXCLUDED.role, role_id = EXCLUDED.role_id, record_status = EXCLUDED.record_status;

COMMIT;

-- Verify critical data
SELECT t.name, t.currency, t.tax_regime,
       (SELECT COUNT(*) FROM users u WHERE u.tenant_id = t.id AND u.record_status = 1) AS users
FROM tenants t WHERE t.id IN (9001, 9002, 9003, 9004, 9005, 9020, 9021, 9022, 9023, 9024, 9025, 9026,
  9100, 9120, 9121, 9122, 9123, 9124, 9125, 9126,
  9200, 9220, 9221, 9222, 9223, 9224, 9225, 9226,
  9300, 9320, 9321, 9322, 9323, 9324, 9325, 9326,
  9400, 9420, 9421, 9422, 9423, 9424, 9425, 9426,
  9500, 9520, 9521, 9522, 9523, 9524, 9525, 9526,
  9600, 9620, 9621, 9622, 9623, 9624, 9625, 9626,
  9700, 9720, 9721, 9722, 9723, 9724, 9725, 9726,
  9800, 9820, 9821, 9822, 9823, 9824, 9825, 9826,
  9900, 9920, 9921, 9922, 9923, 9924, 9925, 9926,
  9950, 9970, 9971, 9972, 9973, 9974, 9975, 9976,
  8000, 8020, 8021, 8022, 8023, 8024, 8025, 8026,
  8100, 8120, 8121, 8122, 8123, 8124, 8125, 8126,
  8200, 8220, 8221, 8222, 8223, 8224, 8225, 8226,
  8300, 8320, 8321, 8322, 8323, 8324, 8325, 8326,
  8400, 8420, 8421, 8422, 8423, 8424, 8425, 8426,
  8500, 8520, 8521, 8522, 8523, 8524, 8525, 8526) ORDER BY t.id;

-- ============================================================
-- RETAIL/POS TENANTS (8100–8126)
-- ============================================================
BEGIN;
DO $$
BEGIN
  INSERT INTO tenants (id, name, slug, plan, country, currency, timezone, tax_regime, default_locale, created_at)
  VALUES
    (8100,'QA POS Enterprise IN',  'qa-pos-e', 'retail_enterprise',  'India',    'INR','Asia/Kolkata',    'gst',      'en',NOW()),
    (8120,'QA POS Starter IN',     'qa-pos-s', 'retail_starter',     'India',    'INR','Asia/Kolkata',    'gst',      'en',NOW()),
    (8121,'QA POS Professional IN','qa-pos-p', 'retail_professional','India',    'INR','Asia/Kolkata',    'gst',      'en',NOW()),
    (8122,'QA POS UAE',            'qa-pos-ae','retail_enterprise',  'UAE',      'AED','Asia/Dubai',      'vat',      'en',NOW()),
    (8123,'QA POS USA',            'qa-pos-us','retail_enterprise',  'USA',      'USD','America/New_York','sales_tax','en',NOW()),
    (8124,'QA POS Europe',         'qa-pos-eu','retail_enterprise',  'Germany',  'EUR','Europe/Berlin',   'vat',      'en',NOW()),
    (8125,'QA POS Singapore',      'qa-pos-sg','retail_enterprise',  'Singapore','SGD','Asia/Singapore',  'gst',      'en',NOW()),
    (8126,'QA POS Australia',      'qa-pos-au','retail_enterprise',  'Australia','AUD','Australia/Sydney','gst',      'en',NOW())
  ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,slug=EXCLUDED.slug,plan=EXCLUDED.plan,currency=EXCLUDED.currency,timezone=EXCLUDED.timezone,tax_regime=EXCLUDED.tax_regime;

  INSERT INTO roles (id,name,description,tenant_id,record_status) VALUES
    ('qa-role-8100', 'admin',          'Owner/Director — POS Ent',    8100,1),
    ('qa-role-8100m','manager',        'Store Manager — POS Ent',     8100,1),
    ('qa-role-8100o','operator',       'Cashier — POS Ent',           8100,1),
    ('qa-role-8100r','reviewer',       'Inv Auditor — POS Ent',       8100,1),
    ('qa-role-8100a','accountsmanager','Accountant — POS Ent',        8100,1),
    ('qa-role-8100h','manager',        'HR Manager — POS Ent',        8100,1),
    ('qa-role-8100w','manager',        'Warehouse Mgr — POS Ent',     8100,1),
    ('qa-role-8120', 'admin',          'Owner — POS Starter',         8120,1),
    ('qa-role-8120m','manager',        'Store Mgr — POS Starter',     8120,1),
    ('qa-role-8120o','operator',       'Cashier — POS Starter',       8120,1),
    ('qa-role-8120r','reviewer',       'Inv Auditor — POS Starter',   8120,1),
    ('qa-role-8121', 'admin',          'Owner — POS Pro',             8121,1),
    ('qa-role-8121m','manager',        'Store Mgr — POS Pro',         8121,1),
    ('qa-role-8121o','operator',       'Cashier — POS Pro',           8121,1),
    ('qa-role-8121r','reviewer',       'Inv Auditor — POS Pro',       8121,1),
    ('qa-role-8121a','accountsmanager','Accountant — POS Pro',        8121,1),
    ('qa-role-8121h','manager',        'HR Mgr — POS Pro',            8121,1),
    ('qa-role-8122', 'admin','Owner — POS UAE',8122,1),('qa-role-8122m','manager','Mgr — POS UAE',8122,1),
    ('qa-role-8122o','operator','Cashier — POS UAE',8122,1),('qa-role-8122a','accountsmanager','Acct — POS UAE',8122,1),
    ('qa-role-8123', 'admin','Owner — POS USA',8123,1),('qa-role-8123m','manager','Mgr — POS USA',8123,1),
    ('qa-role-8123o','operator','Cashier — POS USA',8123,1),('qa-role-8123a','accountsmanager','Acct — POS USA',8123,1),
    ('qa-role-8124', 'admin','Owner — POS EU',8124,1),('qa-role-8124m','manager','Mgr — POS EU',8124,1),
    ('qa-role-8124o','operator','Cashier — POS EU',8124,1),('qa-role-8124a','accountsmanager','Acct — POS EU',8124,1),
    ('qa-role-8125', 'admin','Owner — POS SG',8125,1),('qa-role-8125m','manager','Mgr — POS SG',8125,1),
    ('qa-role-8125o','operator','Cashier — POS SG',8125,1),('qa-role-8125a','accountsmanager','Acct — POS SG',8125,1),
    ('qa-role-8126', 'admin','Owner — POS AU',8126,1),('qa-role-8126m','manager','Mgr — POS AU',8126,1),
    ('qa-role-8126o','operator','Cashier — POS AU',8126,1),('qa-role-8126a','accountsmanager','Acct — POS AU',8126,1)
  ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,tenant_id=EXCLUDED.tenant_id;

  INSERT INTO users (id,tenant_id,username,password,role,role_id,first_name,last_name,email,record_status) VALUES
    ('qa-u-8100', 8100,'qa_pos_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',          'qa-role-8100', 'QA POS','E Owner','qa-pos-e-owner@pos.kinto',1),
    ('qa-u-8100m',8100,'qa_pos_mgr',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',        'qa-role-8100m','QA POS','E Mgr',  'qa-pos-e-mgr@pos.kinto',  1),
    ('qa-u-8100o',8100,'qa_pos_cash', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',       'qa-role-8100o','QA POS','E Cash', 'qa-pos-e-cash@pos.kinto', 1),
    ('qa-u-8100r',8100,'qa_pos_audit','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','reviewer',       'qa-role-8100r','QA POS','E Audit','qa-pos-e-audit@pos.kinto',1),
    ('qa-u-8100a',8100,'qa_pos_acct', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-8100a','QA POS','E Acct', 'qa-pos-e-acct@pos.kinto', 1),
    ('qa-u-8100h',8100,'qa_pos_hr',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',        'qa-role-8100h','QA POS','E HR',   'qa-pos-e-hr@pos.kinto',   1),
    ('qa-u-8100w',8100,'qa_pos_wh',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',        'qa-role-8100w','QA POS','E WH',   'qa-pos-e-wh@pos.kinto',   1),
    ('qa-u-8120', 8120,'qa_pos_s_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',   'qa-role-8120', 'QA POS','S Owner','qa-pos-s-owner@pos.kinto',1),
    ('qa-u-8120m',8120,'qa_pos_s_mgr',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager', 'qa-role-8120m','QA POS','S Mgr',  'qa-pos-s-mgr@pos.kinto',  1),
    ('qa-u-8120o',8120,'qa_pos_s_cash', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator','qa-role-8120o','QA POS','S Cash', 'qa-pos-s-cash@pos.kinto', 1),
    ('qa-u-8120r',8120,'qa_pos_s_audit','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','reviewer','qa-role-8120r','QA POS','S Audit','qa-pos-s-audit@pos.kinto',1),
    ('qa-u-8121', 8121,'qa_pos_p_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',          'qa-role-8121', 'QA POS','P Owner','qa-pos-p-owner@pos.kinto',1),
    ('qa-u-8121m',8121,'qa_pos_p_mgr',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',        'qa-role-8121m','QA POS','P Mgr',  'qa-pos-p-mgr@pos.kinto',  1),
    ('qa-u-8121o',8121,'qa_pos_p_cash', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',       'qa-role-8121o','QA POS','P Cash', 'qa-pos-p-cash@pos.kinto', 1),
    ('qa-u-8121r',8121,'qa_pos_p_audit','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','reviewer',       'qa-role-8121r','QA POS','P Audit','qa-pos-p-audit@pos.kinto',1),
    ('qa-u-8121a',8121,'qa_pos_p_acct', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-8121a','QA POS','P Acct', 'qa-pos-p-acct@pos.kinto', 1),
    ('qa-u-8121h',8121,'qa_pos_p_hr',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',        'qa-role-8121h','QA POS','P HR',   'qa-pos-p-hr@pos.kinto',   1),
    ('qa-u-8122', 8122,'qa_pos_ae_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',          'qa-role-8122', 'QA POS','AE Owner','qa-pos-ae-owner@pos.kinto',1),
    ('qa-u-8122m',8122,'qa_pos_ae_mgr',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',        'qa-role-8122m','QA POS','AE Mgr',  'qa-pos-ae-mgr@pos.kinto',  1),
    ('qa-u-8122o',8122,'qa_pos_ae_cash', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',       'qa-role-8122o','QA POS','AE Cash', 'qa-pos-ae-cash@pos.kinto', 1),
    ('qa-u-8122a',8122,'qa_pos_ae_acct', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-8122a','QA POS','AE Acct', 'qa-pos-ae-acct@pos.kinto', 1),
    ('qa-u-8123', 8123,'qa_pos_us_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',          'qa-role-8123', 'QA POS','US Owner','qa-pos-us-owner@pos.kinto',1),
    ('qa-u-8123m',8123,'qa_pos_us_mgr',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',        'qa-role-8123m','QA POS','US Mgr',  'qa-pos-us-mgr@pos.kinto',  1),
    ('qa-u-8123o',8123,'qa_pos_us_cash', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',       'qa-role-8123o','QA POS','US Cash', 'qa-pos-us-cash@pos.kinto', 1),
    ('qa-u-8123a',8123,'qa_pos_us_acct', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-8123a','QA POS','US Acct', 'qa-pos-us-acct@pos.kinto', 1),
    ('qa-u-8124', 8124,'qa_pos_eu_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',          'qa-role-8124', 'QA POS','EU Owner','qa-pos-eu-owner@pos.kinto',1),
    ('qa-u-8124m',8124,'qa_pos_eu_mgr',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',        'qa-role-8124m','QA POS','EU Mgr',  'qa-pos-eu-mgr@pos.kinto',  1),
    ('qa-u-8124o',8124,'qa_pos_eu_cash', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',       'qa-role-8124o','QA POS','EU Cash', 'qa-pos-eu-cash@pos.kinto', 1),
    ('qa-u-8124a',8124,'qa_pos_eu_acct', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-8124a','QA POS','EU Acct', 'qa-pos-eu-acct@pos.kinto', 1),
    ('qa-u-8125', 8125,'qa_pos_sg_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',          'qa-role-8125', 'QA POS','SG Owner','qa-pos-sg-owner@pos.kinto',1),
    ('qa-u-8125m',8125,'qa_pos_sg_mgr',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',        'qa-role-8125m','QA POS','SG Mgr',  'qa-pos-sg-mgr@pos.kinto',  1),
    ('qa-u-8125o',8125,'qa_pos_sg_cash', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',       'qa-role-8125o','QA POS','SG Cash', 'qa-pos-sg-cash@pos.kinto', 1),
    ('qa-u-8125a',8125,'qa_pos_sg_acct', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-8125a','QA POS','SG Acct', 'qa-pos-sg-acct@pos.kinto', 1),
    ('qa-u-8126', 8126,'qa_pos_au_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',          'qa-role-8126', 'QA POS','AU Owner','qa-pos-au-owner@pos.kinto',1),
    ('qa-u-8126m',8126,'qa_pos_au_mgr',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',        'qa-role-8126m','QA POS','AU Mgr',  'qa-pos-au-mgr@pos.kinto',  1),
    ('qa-u-8126o',8126,'qa_pos_au_cash', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',       'qa-role-8126o','QA POS','AU Cash', 'qa-pos-au-cash@pos.kinto', 1),
    ('qa-u-8126a',8126,'qa_pos_au_acct', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-8126a','QA POS','AU Acct', 'qa-pos-au-acct@pos.kinto', 1)
  ON CONFLICT (id) DO UPDATE SET tenant_id=EXCLUDED.tenant_id,username=EXCLUDED.username,role=EXCLUDED.role,role_id=EXCLUDED.role_id,record_status=EXCLUDED.record_status;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'POS tenants skipped: %', SQLERRM;
END;
$$;
COMMIT;

-- ============================================================
-- MANUFACTURING TENANTS (8200–8226)
-- ============================================================
BEGIN;
DO $$
BEGIN
  INSERT INTO tenants (id,name,slug,plan,country,currency,timezone,tax_regime,default_locale,created_at) VALUES
    (8200,'QA Mfg Enterprise IN',  'qa-mfg-e', 'manufacturing_enterprise',  'India',    'INR','Asia/Kolkata',    'gst',      'en',NOW()),
    (8220,'QA Mfg Starter IN',     'qa-mfg-s', 'manufacturing_starter',     'India',    'INR','Asia/Kolkata',    'gst',      'en',NOW()),
    (8221,'QA Mfg Professional IN','qa-mfg-p', 'manufacturing_professional','India',    'INR','Asia/Kolkata',    'gst',      'en',NOW()),
    (8222,'QA Mfg UAE',            'qa-mfg-ae','manufacturing_enterprise',  'UAE',      'AED','Asia/Dubai',      'vat',      'en',NOW()),
    (8223,'QA Mfg USA',            'qa-mfg-us','manufacturing_enterprise',  'USA',      'USD','America/New_York','sales_tax','en',NOW()),
    (8224,'QA Mfg Europe',         'qa-mfg-eu','manufacturing_enterprise',  'Germany',  'EUR','Europe/Berlin',   'vat',      'en',NOW()),
    (8225,'QA Mfg Singapore',      'qa-mfg-sg','manufacturing_enterprise',  'Singapore','SGD','Asia/Singapore',  'gst',      'en',NOW()),
    (8226,'QA Mfg Australia',      'qa-mfg-au','manufacturing_enterprise',  'Australia','AUD','Australia/Sydney','gst',      'en',NOW())
  ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,slug=EXCLUDED.slug,plan=EXCLUDED.plan,currency=EXCLUDED.currency,timezone=EXCLUDED.timezone,tax_regime=EXCLUDED.tax_regime;

  INSERT INTO roles (id,name,description,tenant_id,record_status) VALUES
    ('qa-role-8200', 'admin',          'Owner/MD — Mfg Ent',         8200,1),
    ('qa-role-8200m','manager',        'Production Mgr — Mfg Ent',   8200,1),
    ('qa-role-8200o','operator',       'Shop Floor Op — Mfg Ent',    8200,1),
    ('qa-role-8200r','reviewer',       'Quality Insp — Mfg Ent',     8200,1),
    ('qa-role-8200a','accountsmanager','Finance Mgr — Mfg Ent',      8200,1),
    ('qa-role-8200h','manager',        'HR Mgr — Mfg Ent',           8200,1),
    ('qa-role-8200w','manager',        'Warehouse Mgr — Mfg Ent',    8200,1),
    ('qa-role-8220', 'admin',          'Owner — Mfg Starter',        8220,1),
    ('qa-role-8220m','manager',        'Prod Mgr — Mfg Starter',     8220,1),
    ('qa-role-8220o','operator',       'Shop Floor — Mfg Starter',   8220,1),
    ('qa-role-8220r','reviewer',       'QA Insp — Mfg Starter',      8220,1),
    ('qa-role-8221', 'admin',          'Owner — Mfg Pro',            8221,1),
    ('qa-role-8221m','manager',        'Prod Mgr — Mfg Pro',         8221,1),
    ('qa-role-8221o','operator',       'Shop Floor — Mfg Pro',       8221,1),
    ('qa-role-8221r','reviewer',       'QA Insp — Mfg Pro',          8221,1),
    ('qa-role-8221a','accountsmanager','Finance — Mfg Pro',          8221,1),
    ('qa-role-8222', 'admin','Owner — Mfg UAE',8222,1),('qa-role-8222m','manager','Prod Mgr — Mfg UAE',8222,1),
    ('qa-role-8222o','operator','Shop Floor — Mfg UAE',8222,1),('qa-role-8222a','accountsmanager','Finance — Mfg UAE',8222,1),
    ('qa-role-8223', 'admin','Owner — Mfg USA',8223,1),('qa-role-8223m','manager','Prod Mgr — Mfg USA',8223,1),
    ('qa-role-8223o','operator','Shop Floor — Mfg USA',8223,1),('qa-role-8223a','accountsmanager','Finance — Mfg USA',8223,1),
    ('qa-role-8224', 'admin','Owner — Mfg EU',8224,1),('qa-role-8224m','manager','Prod Mgr — Mfg EU',8224,1),
    ('qa-role-8224o','operator','Shop Floor — Mfg EU',8224,1),('qa-role-8224a','accountsmanager','Finance — Mfg EU',8224,1),
    ('qa-role-8225', 'admin','Owner — Mfg SG',8225,1),('qa-role-8225m','manager','Prod Mgr — Mfg SG',8225,1),
    ('qa-role-8225o','operator','Shop Floor — Mfg SG',8225,1),('qa-role-8225a','accountsmanager','Finance — Mfg SG',8225,1),
    ('qa-role-8226', 'admin','Owner — Mfg AU',8226,1),('qa-role-8226m','manager','Prod Mgr — Mfg AU',8226,1),
    ('qa-role-8226o','operator','Shop Floor — Mfg AU',8226,1),('qa-role-8226a','accountsmanager','Finance — Mfg AU',8226,1)
  ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,tenant_id=EXCLUDED.tenant_id;

  INSERT INTO users (id,tenant_id,username,password,role,role_id,first_name,last_name,email,record_status) VALUES
    ('qa-u-8200', 8200,'qa_mfg_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',          'qa-role-8200', 'QA Mfg','E Owner','qa-mfg-e-owner@mfg.kinto',1),
    ('qa-u-8200m',8200,'qa_mfg_prod', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',        'qa-role-8200m','QA Mfg','E Prod', 'qa-mfg-e-prod@mfg.kinto', 1),
    ('qa-u-8200o',8200,'qa_mfg_floor','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',       'qa-role-8200o','QA Mfg','E Floor','qa-mfg-e-floor@mfg.kinto',1),
    ('qa-u-8200r',8200,'qa_mfg_qa',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','reviewer',       'qa-role-8200r','QA Mfg','E QA',   'qa-mfg-e-qa@mfg.kinto',   1),
    ('qa-u-8200a',8200,'qa_mfg_fin',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-8200a','QA Mfg','E Fin',  'qa-mfg-e-fin@mfg.kinto',  1),
    ('qa-u-8200h',8200,'qa_mfg_hr',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',        'qa-role-8200h','QA Mfg','E HR',   'qa-mfg-e-hr@mfg.kinto',   1),
    ('qa-u-8200w',8200,'qa_mfg_wh',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',        'qa-role-8200w','QA Mfg','E WH',   'qa-mfg-e-wh@mfg.kinto',   1),
    ('qa-u-8220', 8220,'qa_mfg_s_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',   'qa-role-8220', 'QA Mfg','S Owner','qa-mfg-s-owner@mfg.kinto',1),
    ('qa-u-8220m',8220,'qa_mfg_s_prod', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager', 'qa-role-8220m','QA Mfg','S Prod', 'qa-mfg-s-prod@mfg.kinto', 1),
    ('qa-u-8220o',8220,'qa_mfg_s_floor','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator','qa-role-8220o','QA Mfg','S Floor','qa-mfg-s-floor@mfg.kinto',1),
    ('qa-u-8220r',8220,'qa_mfg_s_qa',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','reviewer','qa-role-8220r','QA Mfg','S QA',   'qa-mfg-s-qa@mfg.kinto',   1),
    ('qa-u-8221', 8221,'qa_mfg_p_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',          'qa-role-8221', 'QA Mfg','P Owner','qa-mfg-p-owner@mfg.kinto',1),
    ('qa-u-8221m',8221,'qa_mfg_p_prod', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',        'qa-role-8221m','QA Mfg','P Prod', 'qa-mfg-p-prod@mfg.kinto', 1),
    ('qa-u-8221o',8221,'qa_mfg_p_floor','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',       'qa-role-8221o','QA Mfg','P Floor','qa-mfg-p-floor@mfg.kinto',1),
    ('qa-u-8221r',8221,'qa_mfg_p_qa',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','reviewer',       'qa-role-8221r','QA Mfg','P QA',   'qa-mfg-p-qa@mfg.kinto',   1),
    ('qa-u-8221a',8221,'qa_mfg_p_fin',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-8221a','QA Mfg','P Fin',  'qa-mfg-p-fin@mfg.kinto',  1),
    ('qa-u-8222', 8222,'qa_mfg_ae_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',          'qa-role-8222', 'QA Mfg','AE Owner','qa-mfg-ae-owner@mfg.kinto',1),
    ('qa-u-8222m',8222,'qa_mfg_ae_prod', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',        'qa-role-8222m','QA Mfg','AE Prod', 'qa-mfg-ae-prod@mfg.kinto', 1),
    ('qa-u-8222o',8222,'qa_mfg_ae_floor','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',       'qa-role-8222o','QA Mfg','AE Floor','qa-mfg-ae-floor@mfg.kinto',1),
    ('qa-u-8222a',8222,'qa_mfg_ae_acct', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-8222a','QA Mfg','AE Acct', 'qa-mfg-ae-acct@mfg.kinto', 1),
    ('qa-u-8223', 8223,'qa_mfg_us_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',          'qa-role-8223', 'QA Mfg','US Owner','qa-mfg-us-owner@mfg.kinto',1),
    ('qa-u-8223m',8223,'qa_mfg_us_prod', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',        'qa-role-8223m','QA Mfg','US Prod', 'qa-mfg-us-prod@mfg.kinto', 1),
    ('qa-u-8223o',8223,'qa_mfg_us_floor','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',       'qa-role-8223o','QA Mfg','US Floor','qa-mfg-us-floor@mfg.kinto',1),
    ('qa-u-8223a',8223,'qa_mfg_us_acct', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-8223a','QA Mfg','US Acct', 'qa-mfg-us-acct@mfg.kinto', 1),
    ('qa-u-8224', 8224,'qa_mfg_eu_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',          'qa-role-8224', 'QA Mfg','EU Owner','qa-mfg-eu-owner@mfg.kinto',1),
    ('qa-u-8224m',8224,'qa_mfg_eu_prod', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',        'qa-role-8224m','QA Mfg','EU Prod', 'qa-mfg-eu-prod@mfg.kinto', 1),
    ('qa-u-8224o',8224,'qa_mfg_eu_floor','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',       'qa-role-8224o','QA Mfg','EU Floor','qa-mfg-eu-floor@mfg.kinto',1),
    ('qa-u-8224a',8224,'qa_mfg_eu_acct', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-8224a','QA Mfg','EU Acct', 'qa-mfg-eu-acct@mfg.kinto', 1),
    ('qa-u-8225', 8225,'qa_mfg_sg_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',          'qa-role-8225', 'QA Mfg','SG Owner','qa-mfg-sg-owner@mfg.kinto',1),
    ('qa-u-8225m',8225,'qa_mfg_sg_prod', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',        'qa-role-8225m','QA Mfg','SG Prod', 'qa-mfg-sg-prod@mfg.kinto', 1),
    ('qa-u-8225o',8225,'qa_mfg_sg_floor','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',       'qa-role-8225o','QA Mfg','SG Floor','qa-mfg-sg-floor@mfg.kinto',1),
    ('qa-u-8225a',8225,'qa_mfg_sg_acct', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-8225a','QA Mfg','SG Acct', 'qa-mfg-sg-acct@mfg.kinto', 1),
    ('qa-u-8226', 8226,'qa_mfg_au_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',          'qa-role-8226', 'QA Mfg','AU Owner','qa-mfg-au-owner@mfg.kinto',1),
    ('qa-u-8226m',8226,'qa_mfg_au_prod', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',        'qa-role-8226m','QA Mfg','AU Prod', 'qa-mfg-au-prod@mfg.kinto', 1),
    ('qa-u-8226o',8226,'qa_mfg_au_floor','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',       'qa-role-8226o','QA Mfg','AU Floor','qa-mfg-au-floor@mfg.kinto',1),
    ('qa-u-8226a',8226,'qa_mfg_au_acct', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-8226a','QA Mfg','AU Acct', 'qa-mfg-au-acct@mfg.kinto', 1)
  ON CONFLICT (id) DO UPDATE SET tenant_id=EXCLUDED.tenant_id,username=EXCLUDED.username,role=EXCLUDED.role,role_id=EXCLUDED.role_id,record_status=EXCLUDED.record_status;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Mfg tenants skipped: %', SQLERRM;
END;
$$;
COMMIT;

-- ============================================================
-- FINANCE ERP TENANTS (8300–8326)
-- ============================================================
BEGIN;
DO $$
BEGIN
  INSERT INTO tenants (id,name,slug,plan,country,currency,timezone,tax_regime,default_locale,created_at) VALUES
    (8300,'QA Finance Enterprise IN',  'qa-fin-e', 'finance_enterprise',  'India',    'INR','Asia/Kolkata',    'gst',      'en',NOW()),
    (8320,'QA Finance Starter IN',     'qa-fin-s', 'finance_starter',     'India',    'INR','Asia/Kolkata',    'gst',      'en',NOW()),
    (8321,'QA Finance Professional IN','qa-fin-p', 'finance_professional','India',    'INR','Asia/Kolkata',    'gst',      'en',NOW()),
    (8322,'QA Finance UAE',            'qa-fin-ae','finance_enterprise',  'UAE',      'AED','Asia/Dubai',      'vat',      'en',NOW()),
    (8323,'QA Finance USA',            'qa-fin-us','finance_enterprise',  'USA',      'USD','America/New_York','sales_tax','en',NOW()),
    (8324,'QA Finance Europe',         'qa-fin-eu','finance_enterprise',  'Germany',  'EUR','Europe/Berlin',   'vat',      'en',NOW()),
    (8325,'QA Finance Singapore',      'qa-fin-sg','finance_enterprise',  'Singapore','SGD','Asia/Singapore',  'gst',      'en',NOW()),
    (8326,'QA Finance Australia',      'qa-fin-au','finance_enterprise',  'Australia','AUD','Australia/Sydney','gst',      'en',NOW())
  ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,slug=EXCLUDED.slug,plan=EXCLUDED.plan,currency=EXCLUDED.currency,timezone=EXCLUDED.timezone,tax_regime=EXCLUDED.tax_regime;

  INSERT INTO roles (id,name,description,tenant_id,record_status) VALUES
    ('qa-role-8300', 'admin',          'CFO/Director — Fin Ent',     8300,1),
    ('qa-role-8300m','manager',        'Finance Mgr — Fin Ent',      8300,1),
    ('qa-role-8300o','operator',       'Accounts Exec — Fin Ent',    8300,1),
    ('qa-role-8300r','reviewer',       'Internal Auditor — Fin Ent', 8300,1),
    ('qa-role-8300a','accountsmanager','Accountant — Fin Ent',       8300,1),
    ('qa-role-8300h','manager',        'HR Mgr — Fin Ent',           8300,1),
    ('qa-role-8320', 'admin',          'CFO — Fin Starter',          8320,1),
    ('qa-role-8320m','manager',        'Finance Mgr — Fin Starter',  8320,1),
    ('qa-role-8320o','operator',       'Accounts Exec — Fin Starter',8320,1),
    ('qa-role-8320r','reviewer',       'Auditor — Fin Starter',      8320,1),
    ('qa-role-8321', 'admin',          'CFO — Fin Pro',              8321,1),
    ('qa-role-8321m','manager',        'Finance Mgr — Fin Pro',      8321,1),
    ('qa-role-8321o','operator',       'Accounts Exec — Fin Pro',    8321,1),
    ('qa-role-8321r','reviewer',       'Auditor — Fin Pro',          8321,1),
    ('qa-role-8321a','accountsmanager','Accountant — Fin Pro',       8321,1),
    ('qa-role-8322', 'admin','CFO — Fin UAE',8322,1),('qa-role-8322m','manager','Fin Mgr — UAE',8322,1),
    ('qa-role-8322o','operator','Accts Exec — UAE',8322,1),('qa-role-8322a','accountsmanager','Acct — UAE',8322,1),
    ('qa-role-8323', 'admin','CFO — Fin USA',8323,1),('qa-role-8323m','manager','Fin Mgr — USA',8323,1),
    ('qa-role-8323o','operator','Accts Exec — USA',8323,1),('qa-role-8323a','accountsmanager','Acct — USA',8323,1),
    ('qa-role-8324', 'admin','CFO — Fin EU',8324,1),('qa-role-8324m','manager','Fin Mgr — EU',8324,1),
    ('qa-role-8324o','operator','Accts Exec — EU',8324,1),('qa-role-8324a','accountsmanager','Acct — EU',8324,1),
    ('qa-role-8325', 'admin','CFO — Fin SG',8325,1),('qa-role-8325m','manager','Fin Mgr — SG',8325,1),
    ('qa-role-8325o','operator','Accts Exec — SG',8325,1),('qa-role-8325a','accountsmanager','Acct — SG',8325,1),
    ('qa-role-8326', 'admin','CFO — Fin AU',8326,1),('qa-role-8326m','manager','Fin Mgr — AU',8326,1),
    ('qa-role-8326o','operator','Accts Exec — AU',8326,1),('qa-role-8326a','accountsmanager','Acct — AU',8326,1)
  ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,tenant_id=EXCLUDED.tenant_id;

  INSERT INTO users (id,tenant_id,username,password,role,role_id,first_name,last_name,email,record_status) VALUES
    ('qa-u-8300', 8300,'qa_fin_cfo',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',          'qa-role-8300', 'QA Fin','E CFO',  'qa-fin-e-cfo@fin.kinto',  1),
    ('qa-u-8300m',8300,'qa_fin_mgr',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',        'qa-role-8300m','QA Fin','E Mgr',  'qa-fin-e-mgr@fin.kinto',  1),
    ('qa-u-8300o',8300,'qa_fin_exec',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',       'qa-role-8300o','QA Fin','E Exec', 'qa-fin-e-exec@fin.kinto', 1),
    ('qa-u-8300r',8300,'qa_fin_audit', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','reviewer',       'qa-role-8300r','QA Fin','E Audit','qa-fin-e-audit@fin.kinto',1),
    ('qa-u-8300a',8300,'qa_fin_acct',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-8300a','QA Fin','E Acct', 'qa-fin-e-acct@fin.kinto', 1),
    ('qa-u-8300h',8300,'qa_fin_hr',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',        'qa-role-8300h','QA Fin','E HR',   'qa-fin-e-hr@fin.kinto',   1),
    ('qa-u-8320', 8320,'qa_fin_s_cfo', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',   'qa-role-8320', 'QA Fin','S CFO',  'qa-fin-s-cfo@fin.kinto',  1),
    ('qa-u-8320m',8320,'qa_fin_s_mgr', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager', 'qa-role-8320m','QA Fin','S Mgr',  'qa-fin-s-mgr@fin.kinto',  1),
    ('qa-u-8320o',8320,'qa_fin_s_exec','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator','qa-role-8320o','QA Fin','S Exec', 'qa-fin-s-exec@fin.kinto', 1),
    ('qa-u-8320r',8320,'qa_fin_s_audit','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','reviewer','qa-role-8320r','QA Fin','S Audit','qa-fin-s-audit@fin.kinto',1),
    ('qa-u-8321', 8321,'qa_fin_p_cfo', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',          'qa-role-8321', 'QA Fin','P CFO',  'qa-fin-p-cfo@fin.kinto',  1),
    ('qa-u-8321m',8321,'qa_fin_p_mgr', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',        'qa-role-8321m','QA Fin','P Mgr',  'qa-fin-p-mgr@fin.kinto',  1),
    ('qa-u-8321o',8321,'qa_fin_p_exec','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',       'qa-role-8321o','QA Fin','P Exec', 'qa-fin-p-exec@fin.kinto', 1),
    ('qa-u-8321r',8321,'qa_fin_p_audit','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','reviewer',      'qa-role-8321r','QA Fin','P Audit','qa-fin-p-audit@fin.kinto',1),
    ('qa-u-8321a',8321,'qa_fin_p_acct','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-8321a','QA Fin','P Acct', 'qa-fin-p-acct@fin.kinto', 1),
    ('qa-u-8322', 8322,'qa_fin_ae_cfo', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',          'qa-role-8322', 'QA Fin','AE CFO', 'qa-fin-ae-cfo@fin.kinto', 1),
    ('qa-u-8322m',8322,'qa_fin_ae_mgr', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',        'qa-role-8322m','QA Fin','AE Mgr', 'qa-fin-ae-mgr@fin.kinto', 1),
    ('qa-u-8322o',8322,'qa_fin_ae_exec','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',       'qa-role-8322o','QA Fin','AE Exec','qa-fin-ae-exec@fin.kinto',1),
    ('qa-u-8322a',8322,'qa_fin_ae_acct','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-8322a','QA Fin','AE Acct','qa-fin-ae-acct@fin.kinto',1),
    ('qa-u-8323', 8323,'qa_fin_us_cfo', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',          'qa-role-8323', 'QA Fin','US CFO', 'qa-fin-us-cfo@fin.kinto', 1),
    ('qa-u-8323m',8323,'qa_fin_us_mgr', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',        'qa-role-8323m','QA Fin','US Mgr', 'qa-fin-us-mgr@fin.kinto', 1),
    ('qa-u-8323o',8323,'qa_fin_us_exec','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',       'qa-role-8323o','QA Fin','US Exec','qa-fin-us-exec@fin.kinto',1),
    ('qa-u-8323a',8323,'qa_fin_us_acct','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-8323a','QA Fin','US Acct','qa-fin-us-acct@fin.kinto',1),
    ('qa-u-8324', 8324,'qa_fin_eu_cfo', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',          'qa-role-8324', 'QA Fin','EU CFO', 'qa-fin-eu-cfo@fin.kinto', 1),
    ('qa-u-8324m',8324,'qa_fin_eu_mgr', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',        'qa-role-8324m','QA Fin','EU Mgr', 'qa-fin-eu-mgr@fin.kinto', 1),
    ('qa-u-8324o',8324,'qa_fin_eu_exec','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',       'qa-role-8324o','QA Fin','EU Exec','qa-fin-eu-exec@fin.kinto',1),
    ('qa-u-8324a',8324,'qa_fin_eu_acct','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-8324a','QA Fin','EU Acct','qa-fin-eu-acct@fin.kinto',1),
    ('qa-u-8325', 8325,'qa_fin_sg_cfo', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',          'qa-role-8325', 'QA Fin','SG CFO', 'qa-fin-sg-cfo@fin.kinto', 1),
    ('qa-u-8325m',8325,'qa_fin_sg_mgr', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',        'qa-role-8325m','QA Fin','SG Mgr', 'qa-fin-sg-mgr@fin.kinto', 1),
    ('qa-u-8325o',8325,'qa_fin_sg_exec','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',       'qa-role-8325o','QA Fin','SG Exec','qa-fin-sg-exec@fin.kinto',1),
    ('qa-u-8325a',8325,'qa_fin_sg_acct','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-8325a','QA Fin','SG Acct','qa-fin-sg-acct@fin.kinto',1),
    ('qa-u-8326', 8326,'qa_fin_au_cfo', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',          'qa-role-8326', 'QA Fin','AU CFO', 'qa-fin-au-cfo@fin.kinto', 1),
    ('qa-u-8326m',8326,'qa_fin_au_mgr', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',        'qa-role-8326m','QA Fin','AU Mgr', 'qa-fin-au-mgr@fin.kinto', 1),
    ('qa-u-8326o',8326,'qa_fin_au_exec','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',       'qa-role-8326o','QA Fin','AU Exec','qa-fin-au-exec@fin.kinto',1),
    ('qa-u-8326a',8326,'qa_fin_au_acct','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-8326a','QA Fin','AU Acct','qa-fin-au-acct@fin.kinto',1)
  ON CONFLICT (id) DO UPDATE SET tenant_id=EXCLUDED.tenant_id,username=EXCLUDED.username,role=EXCLUDED.role,role_id=EXCLUDED.role_id,record_status=EXCLUDED.record_status;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Finance tenants skipped: %', SQLERRM;
END;
$$;
COMMIT;

-- ============================================================
-- E-COMMERCE TENANTS (8400–8426)
-- ============================================================
BEGIN;
DO $$
BEGIN
  INSERT INTO tenants (id,name,slug,plan,country,currency,timezone,tax_regime,default_locale,created_at) VALUES
    (8400,'QA Ecomm Enterprise IN',  'qa-eco-e', 'ecommerce_enterprise',  'India',    'INR','Asia/Kolkata',    'gst',      'en',NOW()),
    (8420,'QA Ecomm Starter IN',     'qa-eco-s', 'ecommerce_starter',     'India',    'INR','Asia/Kolkata',    'gst',      'en',NOW()),
    (8421,'QA Ecomm Professional IN','qa-eco-p', 'ecommerce_professional','India',    'INR','Asia/Kolkata',    'gst',      'en',NOW()),
    (8422,'QA Ecomm UAE',            'qa-eco-ae','ecommerce_enterprise',  'UAE',      'AED','Asia/Dubai',      'vat',      'en',NOW()),
    (8423,'QA Ecomm USA',            'qa-eco-us','ecommerce_enterprise',  'USA',      'USD','America/New_York','sales_tax','en',NOW()),
    (8424,'QA Ecomm Europe',         'qa-eco-eu','ecommerce_enterprise',  'Germany',  'EUR','Europe/Berlin',   'vat',      'en',NOW()),
    (8425,'QA Ecomm Singapore',      'qa-eco-sg','ecommerce_enterprise',  'Singapore','SGD','Asia/Singapore',  'gst',      'en',NOW()),
    (8426,'QA Ecomm Australia',      'qa-eco-au','ecommerce_enterprise',  'Australia','AUD','Australia/Sydney','gst',      'en',NOW())
  ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,slug=EXCLUDED.slug,plan=EXCLUDED.plan,currency=EXCLUDED.currency,timezone=EXCLUDED.timezone,tax_regime=EXCLUDED.tax_regime;

  INSERT INTO roles (id,name,description,tenant_id,record_status) VALUES
    ('qa-role-8400', 'admin',          'Owner/CEO — Eco Ent',       8400,1),
    ('qa-role-8400m','manager',        'Ops Manager — Eco Ent',     8400,1),
    ('qa-role-8400o','operator',       'Order Processor — Eco Ent', 8400,1),
    ('qa-role-8400r','reviewer',       'Catalog Mgr — Eco Ent',     8400,1),
    ('qa-role-8400a','accountsmanager','Finance — Eco Ent',         8400,1),
    ('qa-role-8400h','manager',        'HR Mgr — Eco Ent',          8400,1),
    ('qa-role-8420', 'admin',          'Owner — Eco Starter',       8420,1),
    ('qa-role-8420m','manager',        'Ops Mgr — Eco Starter',     8420,1),
    ('qa-role-8420o','operator',       'Order Proc — Eco Starter',  8420,1),
    ('qa-role-8420r','reviewer',       'Catalog Mgr — Eco Starter', 8420,1),
    ('qa-role-8421', 'admin',          'Owner — Eco Pro',           8421,1),
    ('qa-role-8421m','manager',        'Ops Mgr — Eco Pro',         8421,1),
    ('qa-role-8421o','operator',       'Order Proc — Eco Pro',      8421,1),
    ('qa-role-8421r','reviewer',       'Catalog Mgr — Eco Pro',     8421,1),
    ('qa-role-8421a','accountsmanager','Finance — Eco Pro',         8421,1),
    ('qa-role-8422', 'admin','Owner — Eco UAE',8422,1),('qa-role-8422m','manager','Ops — Eco UAE',8422,1),
    ('qa-role-8422o','operator','Order Proc — Eco UAE',8422,1),('qa-role-8422a','accountsmanager','Finance — Eco UAE',8422,1),
    ('qa-role-8423', 'admin','Owner — Eco USA',8423,1),('qa-role-8423m','manager','Ops — Eco USA',8423,1),
    ('qa-role-8423o','operator','Order Proc — Eco USA',8423,1),('qa-role-8423a','accountsmanager','Finance — Eco USA',8423,1),
    ('qa-role-8424', 'admin','Owner — Eco EU',8424,1),('qa-role-8424m','manager','Ops — Eco EU',8424,1),
    ('qa-role-8424o','operator','Order Proc — Eco EU',8424,1),('qa-role-8424a','accountsmanager','Finance — Eco EU',8424,1),
    ('qa-role-8425', 'admin','Owner — Eco SG',8425,1),('qa-role-8425m','manager','Ops — Eco SG',8425,1),
    ('qa-role-8425o','operator','Order Proc — Eco SG',8425,1),('qa-role-8425a','accountsmanager','Finance — Eco SG',8425,1),
    ('qa-role-8426', 'admin','Owner — Eco AU',8426,1),('qa-role-8426m','manager','Ops — Eco AU',8426,1),
    ('qa-role-8426o','operator','Order Proc — Eco AU',8426,1),('qa-role-8426a','accountsmanager','Finance — Eco AU',8426,1)
  ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,tenant_id=EXCLUDED.tenant_id;

  INSERT INTO users (id,tenant_id,username,password,role,role_id,first_name,last_name,email,record_status) VALUES
    ('qa-u-8400', 8400,'qa_eco_owner',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',          'qa-role-8400', 'QA Eco','E Owner','qa-eco-e-owner@eco.kinto',  1),
    ('qa-u-8400m',8400,'qa_eco_ops',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',        'qa-role-8400m','QA Eco','E Ops',  'qa-eco-e-ops@eco.kinto',    1),
    ('qa-u-8400o',8400,'qa_eco_order',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',       'qa-role-8400o','QA Eco','E Order','qa-eco-e-order@eco.kinto',  1),
    ('qa-u-8400r',8400,'qa_eco_catalog','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','reviewer',       'qa-role-8400r','QA Eco','E Cat',  'qa-eco-e-cat@eco.kinto',    1),
    ('qa-u-8400a',8400,'qa_eco_fin',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-8400a','QA Eco','E Fin',  'qa-eco-e-fin@eco.kinto',    1),
    ('qa-u-8400h',8400,'qa_eco_hr',     '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',        'qa-role-8400h','QA Eco','E HR',   'qa-eco-e-hr@eco.kinto',     1),
    ('qa-u-8420', 8420,'qa_eco_s_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',   'qa-role-8420', 'QA Eco','S Owner','qa-eco-s-owner@eco.kinto',  1),
    ('qa-u-8420m',8420,'qa_eco_s_ops',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager', 'qa-role-8420m','QA Eco','S Ops',  'qa-eco-s-ops@eco.kinto',    1),
    ('qa-u-8420o',8420,'qa_eco_s_order','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator','qa-role-8420o','QA Eco','S Order','qa-eco-s-order@eco.kinto',  1),
    ('qa-u-8420r',8420,'qa_eco_s_cat',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','reviewer','qa-role-8420r','QA Eco','S Cat',  'qa-eco-s-cat@eco.kinto',    1),
    ('qa-u-8421', 8421,'qa_eco_p_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',          'qa-role-8421', 'QA Eco','P Owner','qa-eco-p-owner@eco.kinto',  1),
    ('qa-u-8421m',8421,'qa_eco_p_ops',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',        'qa-role-8421m','QA Eco','P Ops',  'qa-eco-p-ops@eco.kinto',    1),
    ('qa-u-8421o',8421,'qa_eco_p_order','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',       'qa-role-8421o','QA Eco','P Order','qa-eco-p-order@eco.kinto',  1),
    ('qa-u-8421r',8421,'qa_eco_p_cat',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','reviewer',       'qa-role-8421r','QA Eco','P Cat',  'qa-eco-p-cat@eco.kinto',    1),
    ('qa-u-8421a',8421,'qa_eco_p_fin',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-8421a','QA Eco','P Fin',  'qa-eco-p-fin@eco.kinto',    1),
    ('qa-u-8422', 8422,'qa_eco_ae_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',          'qa-role-8422', 'QA Eco','AE Owner','qa-eco-ae-owner@eco.kinto', 1),
    ('qa-u-8422m',8422,'qa_eco_ae_ops',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',        'qa-role-8422m','QA Eco','AE Ops',  'qa-eco-ae-ops@eco.kinto',   1),
    ('qa-u-8422o',8422,'qa_eco_ae_order','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',       'qa-role-8422o','QA Eco','AE Order','qa-eco-ae-order@eco.kinto', 1),
    ('qa-u-8422a',8422,'qa_eco_ae_acct', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-8422a','QA Eco','AE Acct', 'qa-eco-ae-acct@eco.kinto',  1),
    ('qa-u-8423', 8423,'qa_eco_us_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',          'qa-role-8423', 'QA Eco','US Owner','qa-eco-us-owner@eco.kinto', 1),
    ('qa-u-8423m',8423,'qa_eco_us_ops',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',        'qa-role-8423m','QA Eco','US Ops',  'qa-eco-us-ops@eco.kinto',   1),
    ('qa-u-8423o',8423,'qa_eco_us_order','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',       'qa-role-8423o','QA Eco','US Order','qa-eco-us-order@eco.kinto', 1),
    ('qa-u-8423a',8423,'qa_eco_us_acct', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-8423a','QA Eco','US Acct', 'qa-eco-us-acct@eco.kinto',  1),
    ('qa-u-8424', 8424,'qa_eco_eu_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',          'qa-role-8424', 'QA Eco','EU Owner','qa-eco-eu-owner@eco.kinto', 1),
    ('qa-u-8424m',8424,'qa_eco_eu_ops',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',        'qa-role-8424m','QA Eco','EU Ops',  'qa-eco-eu-ops@eco.kinto',   1),
    ('qa-u-8424o',8424,'qa_eco_eu_order','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',       'qa-role-8424o','QA Eco','EU Order','qa-eco-eu-order@eco.kinto', 1),
    ('qa-u-8424a',8424,'qa_eco_eu_acct', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-8424a','QA Eco','EU Acct', 'qa-eco-eu-acct@eco.kinto',  1),
    ('qa-u-8425', 8425,'qa_eco_sg_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',          'qa-role-8425', 'QA Eco','SG Owner','qa-eco-sg-owner@eco.kinto', 1),
    ('qa-u-8425m',8425,'qa_eco_sg_ops',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',        'qa-role-8425m','QA Eco','SG Ops',  'qa-eco-sg-ops@eco.kinto',   1),
    ('qa-u-8425o',8425,'qa_eco_sg_order','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',       'qa-role-8425o','QA Eco','SG Order','qa-eco-sg-order@eco.kinto', 1),
    ('qa-u-8425a',8425,'qa_eco_sg_acct', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-8425a','QA Eco','SG Acct', 'qa-eco-sg-acct@eco.kinto',  1),
    ('qa-u-8426', 8426,'qa_eco_au_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',          'qa-role-8426', 'QA Eco','AU Owner','qa-eco-au-owner@eco.kinto', 1),
    ('qa-u-8426m',8426,'qa_eco_au_ops',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',        'qa-role-8426m','QA Eco','AU Ops',  'qa-eco-au-ops@eco.kinto',   1),
    ('qa-u-8426o',8426,'qa_eco_au_order','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',       'qa-role-8426o','QA Eco','AU Order','qa-eco-au-order@eco.kinto', 1),
    ('qa-u-8426a',8426,'qa_eco_au_acct', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-8426a','QA Eco','AU Acct', 'qa-eco-au-acct@eco.kinto',  1)
  ON CONFLICT (id) DO UPDATE SET tenant_id=EXCLUDED.tenant_id,username=EXCLUDED.username,role=EXCLUDED.role,role_id=EXCLUDED.role_id,record_status=EXCLUDED.record_status;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Ecomm tenants skipped: %', SQLERRM;
END;
$$;
COMMIT;

-- ============================================================
-- HR/PAYROLL TENANTS (8500–8526)
-- ============================================================
BEGIN;
DO $$
BEGIN
  INSERT INTO tenants (id,name,slug,plan,country,currency,timezone,tax_regime,default_locale,created_at) VALUES
    (8500,'QA HR Enterprise IN',  'qa-hr-e', 'hr_enterprise',  'India',    'INR','Asia/Kolkata',    'gst',      'en',NOW()),
    (8520,'QA HR Starter IN',     'qa-hr-s', 'hr_starter',     'India',    'INR','Asia/Kolkata',    'gst',      'en',NOW()),
    (8521,'QA HR Professional IN','qa-hr-p', 'hr_professional','India',    'INR','Asia/Kolkata',    'gst',      'en',NOW()),
    (8522,'QA HR UAE',            'qa-hr-ae','hr_enterprise',  'UAE',      'AED','Asia/Dubai',      'vat',      'en',NOW()),
    (8523,'QA HR USA',            'qa-hr-us','hr_enterprise',  'USA',      'USD','America/New_York','sales_tax','en',NOW()),
    (8524,'QA HR Europe',         'qa-hr-eu','hr_enterprise',  'Germany',  'EUR','Europe/Berlin',   'vat',      'en',NOW()),
    (8525,'QA HR Singapore',      'qa-hr-sg','hr_enterprise',  'Singapore','SGD','Asia/Singapore',  'gst',      'en',NOW()),
    (8526,'QA HR Australia',      'qa-hr-au','hr_enterprise',  'Australia','AUD','Australia/Sydney','gst',      'en',NOW())
  ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,slug=EXCLUDED.slug,plan=EXCLUDED.plan,currency=EXCLUDED.currency,timezone=EXCLUDED.timezone,tax_regime=EXCLUDED.tax_regime;

  INSERT INTO roles (id,name,description,tenant_id,record_status) VALUES
    ('qa-role-8500', 'admin',          'HR Director — HR Ent',      8500,1),
    ('qa-role-8500m','manager',        'HR Manager — HR Ent',       8500,1),
    ('qa-role-8500o','operator',       'HR Executive — HR Ent',     8500,1),
    ('qa-role-8500r','reviewer',       'Dept Head — HR Ent',        8500,1),
    ('qa-role-8500a','accountsmanager','Payroll Acct — HR Ent',     8500,1),
    ('qa-role-8520', 'admin',          'HR Director — HR Starter',  8520,1),
    ('qa-role-8520m','manager',        'HR Manager — HR Starter',   8520,1),
    ('qa-role-8520o','operator',       'HR Executive — HR Starter', 8520,1),
    ('qa-role-8520r','reviewer',       'Dept Head — HR Starter',    8520,1),
    ('qa-role-8521', 'admin',          'HR Director — HR Pro',      8521,1),
    ('qa-role-8521m','manager',        'HR Manager — HR Pro',       8521,1),
    ('qa-role-8521o','operator',       'HR Executive — HR Pro',     8521,1),
    ('qa-role-8521r','reviewer',       'Dept Head — HR Pro',        8521,1),
    ('qa-role-8521a','accountsmanager','Payroll Acct — HR Pro',     8521,1),
    ('qa-role-8522', 'admin','HR Dir — HR UAE',8522,1),('qa-role-8522m','manager','HR Mgr — HR UAE',8522,1),
    ('qa-role-8522o','operator','HR Exec — HR UAE',8522,1),('qa-role-8522a','accountsmanager','Payroll — HR UAE',8522,1),
    ('qa-role-8523', 'admin','HR Dir — HR USA',8523,1),('qa-role-8523m','manager','HR Mgr — HR USA',8523,1),
    ('qa-role-8523o','operator','HR Exec — HR USA',8523,1),('qa-role-8523a','accountsmanager','Payroll — HR USA',8523,1),
    ('qa-role-8524', 'admin','HR Dir — HR EU',8524,1),('qa-role-8524m','manager','HR Mgr — HR EU',8524,1),
    ('qa-role-8524o','operator','HR Exec — HR EU',8524,1),('qa-role-8524a','accountsmanager','Payroll — HR EU',8524,1),
    ('qa-role-8525', 'admin','HR Dir — HR SG',8525,1),('qa-role-8525m','manager','HR Mgr — HR SG',8525,1),
    ('qa-role-8525o','operator','HR Exec — HR SG',8525,1),('qa-role-8525a','accountsmanager','Payroll — HR SG',8525,1),
    ('qa-role-8526', 'admin','HR Dir — HR AU',8526,1),('qa-role-8526m','manager','HR Mgr — HR AU',8526,1),
    ('qa-role-8526o','operator','HR Exec — HR AU',8526,1),('qa-role-8526a','accountsmanager','Payroll — HR AU',8526,1)
  ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,tenant_id=EXCLUDED.tenant_id;

  INSERT INTO users (id,tenant_id,username,password,role,role_id,first_name,last_name,email,record_status) VALUES
    ('qa-u-8500', 8500,'qa_hr_dir',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',          'qa-role-8500', 'QA HR','E Dir',  'qa-hr-e-dir@hr.kinto',   1),
    ('qa-u-8500m',8500,'qa_hr_mgr',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',        'qa-role-8500m','QA HR','E Mgr',  'qa-hr-e-mgr@hr.kinto',   1),
    ('qa-u-8500o',8500,'qa_hr_exec',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',       'qa-role-8500o','QA HR','E Exec', 'qa-hr-e-exec@hr.kinto',  1),
    ('qa-u-8500r',8500,'qa_hr_dept',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','reviewer',       'qa-role-8500r','QA HR','E Dept', 'qa-hr-e-dept@hr.kinto',  1),
    ('qa-u-8500a',8500,'qa_hr_pay',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-8500a','QA HR','E Pay',  'qa-hr-e-pay@hr.kinto',   1),
    ('qa-u-8520', 8520,'qa_hr_s_dir',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',   'qa-role-8520', 'QA HR','S Dir',  'qa-hr-s-dir@hr.kinto',   1),
    ('qa-u-8520m',8520,'qa_hr_s_mgr',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager', 'qa-role-8520m','QA HR','S Mgr',  'qa-hr-s-mgr@hr.kinto',   1),
    ('qa-u-8520o',8520,'qa_hr_s_exec', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator','qa-role-8520o','QA HR','S Exec', 'qa-hr-s-exec@hr.kinto',  1),
    ('qa-u-8520r',8520,'qa_hr_s_dept', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','reviewer','qa-role-8520r','QA HR','S Dept', 'qa-hr-s-dept@hr.kinto',  1),
    ('qa-u-8521', 8521,'qa_hr_p_dir',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',          'qa-role-8521', 'QA HR','P Dir',  'qa-hr-p-dir@hr.kinto',   1),
    ('qa-u-8521m',8521,'qa_hr_p_mgr',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',        'qa-role-8521m','QA HR','P Mgr',  'qa-hr-p-mgr@hr.kinto',   1),
    ('qa-u-8521o',8521,'qa_hr_p_exec', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',       'qa-role-8521o','QA HR','P Exec', 'qa-hr-p-exec@hr.kinto',  1),
    ('qa-u-8521r',8521,'qa_hr_p_dept', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','reviewer',       'qa-role-8521r','QA HR','P Dept', 'qa-hr-p-dept@hr.kinto',  1),
    ('qa-u-8521a',8521,'qa_hr_p_pay',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-8521a','QA HR','P Pay',  'qa-hr-p-pay@hr.kinto',   1),
    ('qa-u-8522', 8522,'qa_hr_ae_dir', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',          'qa-role-8522', 'QA HR','AE Dir', 'qa-hr-ae-dir@hr.kinto',  1),
    ('qa-u-8522m',8522,'qa_hr_ae_mgr', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',        'qa-role-8522m','QA HR','AE Mgr', 'qa-hr-ae-mgr@hr.kinto',  1),
    ('qa-u-8522o',8522,'qa_hr_ae_exec','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',       'qa-role-8522o','QA HR','AE Exec','qa-hr-ae-exec@hr.kinto', 1),
    ('qa-u-8522a',8522,'qa_hr_ae_pay', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-8522a','QA HR','AE Pay', 'qa-hr-ae-pay@hr.kinto',  1),
    ('qa-u-8523', 8523,'qa_hr_us_dir', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',          'qa-role-8523', 'QA HR','US Dir', 'qa-hr-us-dir@hr.kinto',  1),
    ('qa-u-8523m',8523,'qa_hr_us_mgr', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',        'qa-role-8523m','QA HR','US Mgr', 'qa-hr-us-mgr@hr.kinto',  1),
    ('qa-u-8523o',8523,'qa_hr_us_exec','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',       'qa-role-8523o','QA HR','US Exec','qa-hr-us-exec@hr.kinto', 1),
    ('qa-u-8523a',8523,'qa_hr_us_pay', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-8523a','QA HR','US Pay', 'qa-hr-us-pay@hr.kinto',  1),
    ('qa-u-8524', 8524,'qa_hr_eu_dir', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',          'qa-role-8524', 'QA HR','EU Dir', 'qa-hr-eu-dir@hr.kinto',  1),
    ('qa-u-8524m',8524,'qa_hr_eu_mgr', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',        'qa-role-8524m','QA HR','EU Mgr', 'qa-hr-eu-mgr@hr.kinto',  1),
    ('qa-u-8524o',8524,'qa_hr_eu_exec','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',       'qa-role-8524o','QA HR','EU Exec','qa-hr-eu-exec@hr.kinto', 1),
    ('qa-u-8524a',8524,'qa_hr_eu_pay', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-8524a','QA HR','EU Pay', 'qa-hr-eu-pay@hr.kinto',  1),
    ('qa-u-8525', 8525,'qa_hr_sg_dir', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',          'qa-role-8525', 'QA HR','SG Dir', 'qa-hr-sg-dir@hr.kinto',  1),
    ('qa-u-8525m',8525,'qa_hr_sg_mgr', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',        'qa-role-8525m','QA HR','SG Mgr', 'qa-hr-sg-mgr@hr.kinto',  1),
    ('qa-u-8525o',8525,'qa_hr_sg_exec','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',       'qa-role-8525o','QA HR','SG Exec','qa-hr-sg-exec@hr.kinto', 1),
    ('qa-u-8525a',8525,'qa_hr_sg_pay', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-8525a','QA HR','SG Pay', 'qa-hr-sg-pay@hr.kinto',  1),
    ('qa-u-8526', 8526,'qa_hr_au_dir', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',          'qa-role-8526', 'QA HR','AU Dir', 'qa-hr-au-dir@hr.kinto',  1),
    ('qa-u-8526m',8526,'qa_hr_au_mgr', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',        'qa-role-8526m','QA HR','AU Mgr', 'qa-hr-au-mgr@hr.kinto',  1),
    ('qa-u-8526o',8526,'qa_hr_au_exec','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',       'qa-role-8526o','QA HR','AU Exec','qa-hr-au-exec@hr.kinto', 1),
    ('qa-u-8526a',8526,'qa_hr_au_pay', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-8526a','QA HR','AU Pay', 'qa-hr-au-pay@hr.kinto',  1)
  ON CONFLICT (id) DO UPDATE SET tenant_id=EXCLUDED.tenant_id,username=EXCLUDED.username,role=EXCLUDED.role,role_id=EXCLUDED.role_id,record_status=EXCLUDED.record_status;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'HR tenants skipped: %', SQLERRM;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- Username aliases: users expected by functional/smoke tests (27-39)
-- ─────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  INSERT INTO users (id, tenant_id, username, password, role, role_id, first_name, last_name, email, record_status) VALUES
  ('qa-alias-qa_agr_acct',9900,'qa_agr_acct','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_agr_acct','QA','Agr Acct','qa_agr_acct@qa.kinto',1),
  ('qa-alias-qa_agr_assets',9900,'qa_agr_assets','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_agr_assets','QA','Agr Assets','qa_agr_assets@qa.kinto',1),
  ('qa-alias-qa_agr_crm',9900,'qa_agr_crm','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_agr_crm','QA','Agr Crm','qa_agr_crm@qa.kinto',1),
  ('qa-alias-qa_agr_e_crm',9900,'qa_agr_e_crm','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_agr_e_crm','QA','Agr E Crm','qa_agr_e_crm@qa.kinto',1),
  ('qa-alias-qa_agr_e_hr',9900,'qa_agr_e_hr','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_agr_e_hr','QA','Agr E Hr','qa_agr_e_hr@qa.kinto',1),
  ('qa-alias-qa_agr_e_mis',9900,'qa_agr_e_mis','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_agr_e_mis','QA','Agr E Mis','qa_agr_e_mis@qa.kinto',1),
  ('qa-alias-qa_agr_e_sales',9900,'qa_agr_e_sales','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_agr_e_sales','QA','Agr E Sales','qa_agr_e_sales@qa.kinto',1),
  ('qa-alias-qa_agr_e_wh',9900,'qa_agr_e_wh','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_agr_e_wh','QA','Agr E Wh','qa_agr_e_wh@qa.kinto',1),
  ('qa-alias-qa_agr_hr',9900,'qa_agr_hr','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_agr_hr','QA','Agr Hr','qa_agr_hr@qa.kinto',1),
  ('qa-alias-qa_agr_manager',9900,'qa_agr_manager','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager','qa-role-qa_agr_manager','QA','Agr Manager','qa_agr_manager@qa.kinto',1),
  ('qa-alias-qa_agr_mis',9900,'qa_agr_mis','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_agr_mis','QA','Agr Mis','qa_agr_mis@qa.kinto',1),
  ('qa-alias-qa_agr_owner',9900,'qa_agr_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin','qa-role-qa_agr_owner','QA','Agr Owner','qa_agr_owner@qa.kinto',1),
  ('qa-alias-qa_agr_p_crm',9921,'qa_agr_p_crm','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_agr_p_crm','QA','Agr P Crm','qa_agr_p_crm@qa.kinto',1),
  ('qa-alias-qa_agr_p_hr',9921,'qa_agr_p_hr','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_agr_p_hr','QA','Agr P Hr','qa_agr_p_hr@qa.kinto',1),
  ('qa-alias-qa_agr_p_mis',9921,'qa_agr_p_mis','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_agr_p_mis','QA','Agr P Mis','qa_agr_p_mis@qa.kinto',1),
  ('qa-alias-qa_agr_prod',9900,'qa_agr_prod','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_agr_prod','QA','Agr Prod','qa_agr_prod@qa.kinto',1),
  ('qa-alias-qa_agr_qc',9900,'qa_agr_qc','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','reviewer','qa-role-qa_agr_qc','QA','Agr Qc','qa_agr_qc@qa.kinto',1),
  ('qa-alias-qa_agr_s_billing',9920,'qa_agr_s_billing','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_agr_s_billing','QA','Agr S Billing','qa_agr_s_billing@qa.kinto',1),
  ('qa-alias-qa_agr_s_purchase',9920,'qa_agr_s_purchase','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_agr_s_purchase','QA','Agr S Purchase','qa_agr_s_purchase@qa.kinto',1),
  ('qa-alias-qa_agr_s_supervisor',9920,'qa_agr_s_supervisor','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager','qa-role-qa_agr_s_supervisor','QA','Agr S Supervisor','qa_agr_s_supervisor@qa.kinto',1),
  ('qa-alias-qa_agr_sales',9900,'qa_agr_sales','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_agr_sales','QA','Agr Sales','qa_agr_sales@qa.kinto',1),
  ('qa-alias-qa_agr_supervisor',9900,'qa_agr_supervisor','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager','qa-role-qa_agr_supervisor','QA','Agr Supervisor','qa_agr_supervisor@qa.kinto',1),
  ('qa-alias-qa_agr_wh',9900,'qa_agr_wh','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_agr_wh','QA','Agr Wh','qa_agr_wh@qa.kinto',1),
  ('qa-alias-qa_crm_acct',9600,'qa_crm_acct','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_crm_acct','QA','Crm Acct','qa_crm_acct@qa.kinto',1),
  ('qa-alias-qa_crm_assets',9600,'qa_crm_assets','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_crm_assets','QA','Crm Assets','qa_crm_assets@qa.kinto',1),
  ('qa-alias-qa_crm_crm',9600,'qa_crm_crm','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_crm_crm','QA','Crm Crm','qa_crm_crm@qa.kinto',1),
  ('qa-alias-qa_crm_hr',9600,'qa_crm_hr','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_crm_hr','QA','Crm Hr','qa_crm_hr@qa.kinto',1),
  ('qa-alias-qa_crm_manager',9600,'qa_crm_manager','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager','qa-role-qa_crm_manager','QA','Crm Manager','qa_crm_manager@qa.kinto',1),
  ('qa-alias-qa_crm_mis',9600,'qa_crm_mis','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_crm_mis','QA','Crm Mis','qa_crm_mis@qa.kinto',1),
  ('qa-alias-qa_crm_mkt',9600,'qa_crm_mkt','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_crm_mkt','QA','Crm Mkt','qa_crm_mkt@qa.kinto',1),
  ('qa-alias-qa_crm_owner',9600,'qa_crm_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin','qa-role-qa_crm_owner','QA','Crm Owner','qa_crm_owner@qa.kinto',1),
  ('qa-alias-qa_crm_p_acct',9621,'qa_crm_p_acct','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_crm_p_acct','QA','Crm P Acct','qa_crm_p_acct@qa.kinto',1),
  ('qa-alias-qa_crm_p_manager',9621,'qa_crm_p_manager','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager','qa-role-qa_crm_p_manager','QA','Crm P Manager','qa_crm_p_manager@qa.kinto',1),
  ('qa-alias-qa_crm_p_mis',9621,'qa_crm_p_mis','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_crm_p_mis','QA','Crm P Mis','qa_crm_p_mis@qa.kinto',1),
  ('qa-alias-qa_crm_p_owner',9621,'qa_crm_p_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin','qa-role-qa_crm_p_owner','QA','Crm P Owner','qa_crm_p_owner@qa.kinto',1),
  ('qa-alias-qa_crm_p_sales_exec',9621,'qa_crm_p_sales_exec','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_crm_p_sales_exec','QA','Crm P Sales Exec','qa_crm_p_sales_exec@qa.kinto',1),
  ('qa-alias-qa_crm_prod',9600,'qa_crm_prod','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_crm_prod','QA','Crm Prod','qa_crm_prod@qa.kinto',1),
  ('qa-alias-qa_crm_s_billing',9620,'qa_crm_s_billing','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_crm_s_billing','QA','Crm S Billing','qa_crm_s_billing@qa.kinto',1),
  ('qa-alias-qa_crm_s_owner',9620,'qa_crm_s_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin','qa-role-qa_crm_s_owner','QA','Crm S Owner','qa_crm_s_owner@qa.kinto',1),
  ('qa-alias-qa_crm_s_sales_exec',9620,'qa_crm_s_sales_exec','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_crm_s_sales_exec','QA','Crm S Sales Exec','qa_crm_s_sales_exec@qa.kinto',1),
  ('qa-alias-qa_crm_s_support',9620,'qa_crm_s_support','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_crm_s_support','QA','Crm S Support','qa_crm_s_support@qa.kinto',1),
  ('qa-alias-qa_crm_sales',9600,'qa_crm_sales','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_crm_sales','QA','Crm Sales','qa_crm_sales@qa.kinto',1),
  ('qa-alias-qa_crm_sales_exec',9600,'qa_crm_sales_exec','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_crm_sales_exec','QA','Crm Sales Exec','qa_crm_sales_exec@qa.kinto',1),
  ('qa-alias-qa_crm_support',9600,'qa_crm_support','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_crm_support','QA','Crm Support','qa_crm_support@qa.kinto',1),
  ('qa-alias-qa_crm_wh',9600,'qa_crm_wh','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_crm_wh','QA','Crm Wh','qa_crm_wh@qa.kinto',1),
  ('qa-alias-qa_eco_acct',8400,'qa_eco_acct','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_eco_acct','QA','Eco Acct','qa_eco_acct@qa.kinto',1),
  ('qa-alias-qa_eco_assets',8400,'qa_eco_assets','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_eco_assets','QA','Eco Assets','qa_eco_assets@qa.kinto',1),
  ('qa-alias-qa_eco_crm',8400,'qa_eco_crm','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_eco_crm','QA','Eco Crm','qa_eco_crm@qa.kinto',1),
  ('qa-alias-qa_eco_manager',8400,'qa_eco_manager','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager','qa-role-qa_eco_manager','QA','Eco Manager','qa_eco_manager@qa.kinto',1),
  ('qa-alias-qa_eco_mis',8400,'qa_eco_mis','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_eco_mis','QA','Eco Mis','qa_eco_mis@qa.kinto',1),
  ('qa-alias-qa_eco_p_acct',8421,'qa_eco_p_acct','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_eco_p_acct','QA','Eco P Acct','qa_eco_p_acct@qa.kinto',1),
  ('qa-alias-qa_eco_p_crm',8421,'qa_eco_p_crm','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_eco_p_crm','QA','Eco P Crm','qa_eco_p_crm@qa.kinto',1),
  ('qa-alias-qa_eco_p_hr',8421,'qa_eco_p_hr','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_eco_p_hr','QA','Eco P Hr','qa_eco_p_hr@qa.kinto',1),
  ('qa-alias-qa_eco_p_manager',8421,'qa_eco_p_manager','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager','qa-role-qa_eco_p_manager','QA','Eco P Manager','qa_eco_p_manager@qa.kinto',1),
  ('qa-alias-qa_eco_p_mis',8421,'qa_eco_p_mis','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_eco_p_mis','QA','Eco P Mis','qa_eco_p_mis@qa.kinto',1),
  ('qa-alias-qa_eco_prod',8400,'qa_eco_prod','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_eco_prod','QA','Eco Prod','qa_eco_prod@qa.kinto',1),
  ('qa-alias-qa_eco_s_billing',8420,'qa_eco_s_billing','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_eco_s_billing','QA','Eco S Billing','qa_eco_s_billing@qa.kinto',1),
  ('qa-alias-qa_eco_s_catalog',8420,'qa_eco_s_catalog','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_eco_s_catalog','QA','Eco S Catalog','qa_eco_s_catalog@qa.kinto',1),
  ('qa-alias-qa_eco_sales',8400,'qa_eco_sales','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_eco_sales','QA','Eco Sales','qa_eco_sales@qa.kinto',1),
  ('qa-alias-qa_eco_wh',8400,'qa_eco_wh','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_eco_wh','QA','Eco Wh','qa_eco_wh@qa.kinto',1),
  ('qa-alias-qa_edu_acct',9950,'qa_edu_acct','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_edu_acct','QA','Edu Acct','qa_edu_acct@qa.kinto',1),
  ('qa-alias-qa_edu_admin',9950,'qa_edu_admin','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin','qa-role-qa_edu_admin','QA','Edu Admin','qa_edu_admin@qa.kinto',1),
  ('qa-alias-qa_edu_e_crm',9950,'qa_edu_e_crm','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_edu_e_crm','QA','Edu E Crm','qa_edu_e_crm@qa.kinto',1),
  ('qa-alias-qa_edu_e_exam',9950,'qa_edu_e_exam','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','reviewer','qa-role-qa_edu_e_exam','QA','Edu E Exam','qa_edu_e_exam@qa.kinto',1),
  ('qa-alias-qa_edu_e_hr',9950,'qa_edu_e_hr','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_edu_e_hr','QA','Edu E Hr','qa_edu_e_hr@qa.kinto',1),
  ('qa-alias-qa_edu_e_lib',9950,'qa_edu_e_lib','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','reviewer','qa-role-qa_edu_e_lib','QA','Edu E Lib','qa_edu_e_lib@qa.kinto',1),
  ('qa-alias-qa_edu_e_mis',9950,'qa_edu_e_mis','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_edu_e_mis','QA','Edu E Mis','qa_edu_e_mis@qa.kinto',1),
  ('qa-alias-qa_edu_fee_collector',9950,'qa_edu_fee_collector','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator','qa-role-qa_edu_fee_collector','QA','Edu Fee Collector','qa_edu_fee_collector@qa.kinto',1),
  ('qa-alias-qa_edu_hr',9950,'qa_edu_hr','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_edu_hr','QA','Edu Hr','qa_edu_hr@qa.kinto',1),
  ('qa-alias-qa_edu_mis',9950,'qa_edu_mis','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_edu_mis','QA','Edu Mis','qa_edu_mis@qa.kinto',1),
  ('qa-alias-qa_edu_owner',9950,'qa_edu_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin','qa-role-qa_edu_owner','QA','Edu Owner','qa_edu_owner@qa.kinto',1),
  ('qa-alias-qa_edu_p_acct',9971,'qa_edu_p_acct','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_edu_p_acct','QA','Edu P Acct','qa_edu_p_acct@qa.kinto',1),
  ('qa-alias-qa_edu_p_hr',9971,'qa_edu_p_hr','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_edu_p_hr','QA','Edu P Hr','qa_edu_p_hr@qa.kinto',1),
  ('qa-alias-qa_edu_p_mis',9971,'qa_edu_p_mis','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_edu_p_mis','QA','Edu P Mis','qa_edu_p_mis@qa.kinto',1),
  ('qa-alias-qa_edu_p_principal',9971,'qa_edu_p_principal','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager','qa-role-qa_edu_p_principal','QA','Edu P Principal','qa_edu_p_principal@qa.kinto',1),
  ('qa-alias-qa_edu_principal',9950,'qa_edu_principal','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager','qa-role-qa_edu_principal','QA','Edu Principal','qa_edu_principal@qa.kinto',1),
  ('qa-alias-qa_edu_s_billing',9970,'qa_edu_s_billing','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_edu_s_billing','QA','Edu S Billing','qa_edu_s_billing@qa.kinto',1),
  ('qa-alias-qa_edu_s_fee_collector',9970,'qa_edu_s_fee_collector','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator','qa-role-qa_edu_s_fee_collector','QA','Edu S Fee Collector','qa_edu_s_fee_collector@qa.kinto',1),
  ('qa-alias-qa_edu_s_purchase',9970,'qa_edu_s_purchase','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_edu_s_purchase','QA','Edu S Purchase','qa_edu_s_purchase@qa.kinto',1),
  ('qa-alias-qa_edu_teacher',9950,'qa_edu_teacher','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','reviewer','qa-role-qa_edu_teacher','QA','Edu Teacher','qa_edu_teacher@qa.kinto',1),
  ('qa-alias-qa_fin_accountant',8300,'qa_fin_accountant','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_fin_accountant','QA','Fin Accountant','qa_fin_accountant@qa.kinto',1),
  ('qa-alias-qa_fin_ap_clerk',8300,'qa_fin_ap_clerk','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_fin_ap_clerk','QA','Fin Ap Clerk','qa_fin_ap_clerk@qa.kinto',1),
  ('qa-alias-qa_fin_ar_clerk',8300,'qa_fin_ar_clerk','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_fin_ar_clerk','QA','Fin Ar Clerk','qa_fin_ar_clerk@qa.kinto',1),
  ('qa-alias-qa_fin_assets',8300,'qa_fin_assets','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_fin_assets','QA','Fin Assets','qa_fin_assets@qa.kinto',1),
  ('qa-alias-qa_fin_crm',8300,'qa_fin_crm','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_fin_crm','QA','Fin Crm','qa_fin_crm@qa.kinto',1),
  ('qa-alias-qa_fin_mis',8300,'qa_fin_mis','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_fin_mis','QA','Fin Mis','qa_fin_mis@qa.kinto',1),
  ('qa-alias-qa_fin_owner',8300,'qa_fin_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin','qa-role-qa_fin_owner','QA','Fin Owner','qa_fin_owner@qa.kinto',1),
  ('qa-alias-qa_fin_p_accountant',8321,'qa_fin_p_accountant','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_fin_p_accountant','QA','Fin P Accountant','qa_fin_p_accountant@qa.kinto',1),
  ('qa-alias-qa_fin_p_crm',8321,'qa_fin_p_crm','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_fin_p_crm','QA','Fin P Crm','qa_fin_p_crm@qa.kinto',1),
  ('qa-alias-qa_fin_p_hr',8321,'qa_fin_p_hr','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_fin_p_hr','QA','Fin P Hr','qa_fin_p_hr@qa.kinto',1),
  ('qa-alias-qa_fin_p_mis',8321,'qa_fin_p_mis','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_fin_p_mis','QA','Fin P Mis','qa_fin_p_mis@qa.kinto',1),
  ('qa-alias-qa_fin_p_owner',8321,'qa_fin_p_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin','qa-role-qa_fin_p_owner','QA','Fin P Owner','qa_fin_p_owner@qa.kinto',1),
  ('qa-alias-qa_fin_s_accountant',8320,'qa_fin_s_accountant','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_fin_s_accountant','QA','Fin S Accountant','qa_fin_s_accountant@qa.kinto',1),
  ('qa-alias-qa_fin_s_billing',8320,'qa_fin_s_billing','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_fin_s_billing','QA','Fin S Billing','qa_fin_s_billing@qa.kinto',1),
  ('qa-alias-qa_fin_s_owner',8320,'qa_fin_s_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin','qa-role-qa_fin_s_owner','QA','Fin S Owner','qa_fin_s_owner@qa.kinto',1),
  ('qa-alias-qa_fin_sales',8300,'qa_fin_sales','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_fin_sales','QA','Fin Sales','qa_fin_sales@qa.kinto',1),
  ('qa-alias-qa_fin_wh',8300,'qa_fin_wh','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_fin_wh','QA','Fin Wh','qa_fin_wh@qa.kinto',1),
  ('qa-alias-qa_gld_acct',8000,'qa_gld_acct','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_gld_acct','QA','Gld Acct','qa_gld_acct@qa.kinto',1),
  ('qa-alias-qa_gld_hr',8000,'qa_gld_hr','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_gld_hr','QA','Gld Hr','qa_gld_hr@qa.kinto',1),
  ('qa-alias-qa_gld_karigar',8000,'qa_gld_karigar','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','reviewer','qa-role-qa_gld_karigar','QA','Gld Karigar','qa_gld_karigar@qa.kinto',1),
  ('qa-alias-qa_gld_manager',8000,'qa_gld_manager','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager','qa-role-qa_gld_manager','QA','Gld Manager','qa_gld_manager@qa.kinto',1),
  ('qa-alias-qa_gld_mis',8000,'qa_gld_mis','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_gld_mis','QA','Gld Mis','qa_gld_mis@qa.kinto',1),
  ('qa-alias-qa_gld_owner',8000,'qa_gld_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin','qa-role-qa_gld_owner','QA','Gld Owner','qa_gld_owner@qa.kinto',1),
  ('qa-alias-qa_gld_p_acct',8021,'qa_gld_p_acct','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_gld_p_acct','QA','Gld P Acct','qa_gld_p_acct@qa.kinto',1),
  ('qa-alias-qa_gld_p_manager',8021,'qa_gld_p_manager','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager','qa-role-qa_gld_p_manager','QA','Gld P Manager','qa_gld_p_manager@qa.kinto',1),
  ('qa-alias-qa_gld_p_mis',8021,'qa_gld_p_mis','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_gld_p_mis','QA','Gld P Mis','qa_gld_p_mis@qa.kinto',1),
  ('qa-alias-qa_gld_p_owner',8021,'qa_gld_p_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin','qa-role-qa_gld_p_owner','QA','Gld P Owner','qa_gld_p_owner@qa.kinto',1),
  ('qa-alias-qa_gld_qc',8000,'qa_gld_qc','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','reviewer','qa-role-qa_gld_qc','QA','Gld Qc','qa_gld_qc@qa.kinto',1),
  ('qa-alias-qa_gld_s_manager',8020,'qa_gld_s_manager','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager','qa-role-qa_gld_s_manager','QA','Gld S Manager','qa_gld_s_manager@qa.kinto',1),
  ('qa-alias-qa_gld_s_owner',8020,'qa_gld_s_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin','qa-role-qa_gld_s_owner','QA','Gld S Owner','qa_gld_s_owner@qa.kinto',1),
  ('qa-alias-qa_gld_s_sales_staff',8020,'qa_gld_s_sales_staff','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','reviewer','qa-role-qa_gld_s_sales_staff','QA','Gld S Sales Staff','qa_gld_s_sales_staff@qa.kinto',1),
  ('qa-alias-qa_gld_sales_staff',8000,'qa_gld_sales_staff','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','reviewer','qa-role-qa_gld_sales_staff','QA','Gld Sales Staff','qa_gld_sales_staff@qa.kinto',1),
  ('qa-alias-qa_gold_e_crm',8000,'qa_gold_e_crm','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_gold_e_crm','QA','Gold E Crm','qa_gold_e_crm@qa.kinto',1),
  ('qa-alias-qa_gold_e_hr',8000,'qa_gold_e_hr','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_gold_e_hr','QA','Gold E Hr','qa_gold_e_hr@qa.kinto',1),
  ('qa-alias-qa_gold_e_mis',8000,'qa_gold_e_mis','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_gold_e_mis','QA','Gold E Mis','qa_gold_e_mis@qa.kinto',1),
  ('qa-alias-qa_gold_e_wh',8000,'qa_gold_e_wh','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_gold_e_wh','QA','Gold E Wh','qa_gold_e_wh@qa.kinto',1),
  ('qa-alias-qa_gold_p_mis',8021,'qa_gold_p_mis','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_gold_p_mis','QA','Gold P Mis','qa_gold_p_mis@qa.kinto',1),
  ('qa-alias-qa_gold_s_billing',8020,'qa_gold_s_billing','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_gold_s_billing','QA','Gold S Billing','qa_gold_s_billing@qa.kinto',1),
  ('qa-alias-qa_gold_s_purchase',8020,'qa_gold_s_purchase','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_gold_s_purchase','QA','Gold S Purchase','qa_gold_s_purchase@qa.kinto',1),
  ('qa-alias-qa_hc_acct',9200,'qa_hc_acct','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_hc_acct','QA','Hc Acct','qa_hc_acct@qa.kinto',1),
  ('qa-alias-qa_hc_assets',9200,'qa_hc_assets','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_hc_assets','QA','Hc Assets','qa_hc_assets@qa.kinto',1),
  ('qa-alias-qa_hc_owner',9200,'qa_hc_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin','qa-role-qa_hc_owner','QA','Hc Owner','qa_hc_owner@qa.kinto',1),
  ('qa-alias-qa_hc_p_acct',9221,'qa_hc_p_acct','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_hc_p_acct','QA','Hc P Acct','qa_hc_p_acct@qa.kinto',1),
  ('qa-alias-qa_hc_p_doctor',9221,'qa_hc_p_doctor','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','reviewer','qa-role-qa_hc_p_doctor','QA','Hc P Doctor','qa_hc_p_doctor@qa.kinto',1),
  ('qa-alias-qa_hc_p_mis',9221,'qa_hc_p_mis','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_hc_p_mis','QA','Hc P Mis','qa_hc_p_mis@qa.kinto',1),
  ('qa-alias-qa_hc_p_owner',9221,'qa_hc_p_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin','qa-role-qa_hc_p_owner','QA','Hc P Owner','qa_hc_p_owner@qa.kinto',1),
  ('qa-alias-qa_hc_p_receptionist',9221,'qa_hc_p_receptionist','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator','qa-role-qa_hc_p_receptionist','QA','Hc P Receptionist','qa_hc_p_receptionist@qa.kinto',1),
  ('qa-alias-qa_hc_prod',9200,'qa_hc_prod','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_hc_prod','QA','Hc Prod','qa_hc_prod@qa.kinto',1),
  ('qa-alias-qa_hc_receptionist',9200,'qa_hc_receptionist','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator','qa-role-qa_hc_receptionist','QA','Hc Receptionist','qa_hc_receptionist@qa.kinto',1),
  ('qa-alias-qa_hc_s_billing',9220,'qa_hc_s_billing','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_hc_s_billing','QA','Hc S Billing','qa_hc_s_billing@qa.kinto',1),
  ('qa-alias-qa_hc_s_doctor',9220,'qa_hc_s_doctor','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','reviewer','qa-role-qa_hc_s_doctor','QA','Hc S Doctor','qa_hc_s_doctor@qa.kinto',1),
  ('qa-alias-qa_hc_s_owner',9220,'qa_hc_s_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin','qa-role-qa_hc_s_owner','QA','Hc S Owner','qa_hc_s_owner@qa.kinto',1),
  ('qa-alias-qa_hc_s_receptionist',9220,'qa_hc_s_receptionist','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator','qa-role-qa_hc_s_receptionist','QA','Hc S Receptionist','qa_hc_s_receptionist@qa.kinto',1),
  ('qa-alias-qa_hc_sales',9200,'qa_hc_sales','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_hc_sales','QA','Hc Sales','qa_hc_sales@qa.kinto',1),
  ('qa-alias-qa_hc_wh',9200,'qa_hc_wh','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_hc_wh','QA','Hc Wh','qa_hc_wh@qa.kinto',1),
  ('qa-alias-qa_hr_acct',8500,'qa_hr_acct','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_hr_acct','QA','Hr Acct','qa_hr_acct@qa.kinto',1),
  ('qa-alias-qa_hr_assets',8500,'qa_hr_assets','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_hr_assets','QA','Hr Assets','qa_hr_assets@qa.kinto',1),
  ('qa-alias-qa_hr_crm',8500,'qa_hr_crm','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_hr_crm','QA','Hr Crm','qa_hr_crm@qa.kinto',1),
  ('qa-alias-qa_hr_hr',8500,'qa_hr_hr','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_hr_hr','QA','Hr Hr','qa_hr_hr@qa.kinto',1),
  ('qa-alias-qa_hr_manager',8500,'qa_hr_manager','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager','qa-role-qa_hr_manager','QA','Hr Manager','qa_hr_manager@qa.kinto',1),
  ('qa-alias-qa_hr_mis',8500,'qa_hr_mis','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_hr_mis','QA','Hr Mis','qa_hr_mis@qa.kinto',1),
  ('qa-alias-qa_hr_owner',8500,'qa_hr_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin','qa-role-qa_hr_owner','QA','Hr Owner','qa_hr_owner@qa.kinto',1),
  ('qa-alias-qa_hr_p_acct',8521,'qa_hr_p_acct','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_hr_p_acct','QA','Hr P Acct','qa_hr_p_acct@qa.kinto',1),
  ('qa-alias-qa_hr_p_crm',8521,'qa_hr_p_crm','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_hr_p_crm','QA','Hr P Crm','qa_hr_p_crm@qa.kinto',1),
  ('qa-alias-qa_hr_p_hr',8521,'qa_hr_p_hr','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_hr_p_hr','QA','Hr P Hr','qa_hr_p_hr@qa.kinto',1),
  ('qa-alias-qa_hr_p_manager',8521,'qa_hr_p_manager','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager','qa-role-qa_hr_p_manager','QA','Hr P Manager','qa_hr_p_manager@qa.kinto',1),
  ('qa-alias-qa_hr_p_mis',8521,'qa_hr_p_mis','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_hr_p_mis','QA','Hr P Mis','qa_hr_p_mis@qa.kinto',1),
  ('qa-alias-qa_hr_p_owner',8521,'qa_hr_p_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin','qa-role-qa_hr_p_owner','QA','Hr P Owner','qa_hr_p_owner@qa.kinto',1),
  ('qa-alias-qa_hr_p_payroll_exec',8521,'qa_hr_p_payroll_exec','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_hr_p_payroll_exec','QA','Hr P Payroll Exec','qa_hr_p_payroll_exec@qa.kinto',1),
  ('qa-alias-qa_hr_payroll_exec',8500,'qa_hr_payroll_exec','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_hr_payroll_exec','QA','Hr Payroll Exec','qa_hr_payroll_exec@qa.kinto',1),
  ('qa-alias-qa_hr_prod',8500,'qa_hr_prod','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_hr_prod','QA','Hr Prod','qa_hr_prod@qa.kinto',1),
  ('qa-alias-qa_hr_recruiter',8500,'qa_hr_recruiter','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager','qa-role-qa_hr_recruiter','QA','Hr Recruiter','qa_hr_recruiter@qa.kinto',1),
  ('qa-alias-qa_hr_s_billing',8520,'qa_hr_s_billing','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_hr_s_billing','QA','Hr S Billing','qa_hr_s_billing@qa.kinto',1),
  ('qa-alias-qa_hr_s_manager',8520,'qa_hr_s_manager','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager','qa-role-qa_hr_s_manager','QA','Hr S Manager','qa_hr_s_manager@qa.kinto',1),
  ('qa-alias-qa_hr_s_owner',8520,'qa_hr_s_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin','qa-role-qa_hr_s_owner','QA','Hr S Owner','qa_hr_s_owner@qa.kinto',1),
  ('qa-alias-qa_hr_s_payroll_exec',8520,'qa_hr_s_payroll_exec','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_hr_s_payroll_exec','QA','Hr S Payroll Exec','qa_hr_s_payroll_exec@qa.kinto',1),
  ('qa-alias-qa_hr_sales',8500,'qa_hr_sales','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_hr_sales','QA','Hr Sales','qa_hr_sales@qa.kinto',1),
  ('qa-alias-qa_hr_wh',8500,'qa_hr_wh','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_hr_wh','QA','Hr Wh','qa_hr_wh@qa.kinto',1),
  ('qa-alias-qa_htl_acct',9100,'qa_htl_acct','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_htl_acct','QA','Htl Acct','qa_htl_acct@qa.kinto',1),
  ('qa-alias-qa_htl_assets',9100,'qa_htl_assets','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_htl_assets','QA','Htl Assets','qa_htl_assets@qa.kinto',1),
  ('qa-alias-qa_htl_crm',9100,'qa_htl_crm','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_htl_crm','QA','Htl Crm','qa_htl_crm@qa.kinto',1),
  ('qa-alias-qa_htl_housekeeping',9100,'qa_htl_housekeeping','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','reviewer','qa-role-qa_htl_housekeeping','QA','Htl Housekeeping','qa_htl_housekeeping@qa.kinto',1),
  ('qa-alias-qa_htl_hr',9100,'qa_htl_hr','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_htl_hr','QA','Htl Hr','qa_htl_hr@qa.kinto',1),
  ('qa-alias-qa_htl_manager',9100,'qa_htl_manager','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager','qa-role-qa_htl_manager','QA','Htl Manager','qa_htl_manager@qa.kinto',1),
  ('qa-alias-qa_htl_mis',9100,'qa_htl_mis','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_htl_mis','QA','Htl Mis','qa_htl_mis@qa.kinto',1),
  ('qa-alias-qa_htl_owner',9100,'qa_htl_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin','qa-role-qa_htl_owner','QA','Htl Owner','qa_htl_owner@qa.kinto',1),
  ('qa-alias-qa_htl_p_acct',9121,'qa_htl_p_acct','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_htl_p_acct','QA','Htl P Acct','qa_htl_p_acct@qa.kinto',1),
  ('qa-alias-qa_htl_p_front_desk',9121,'qa_htl_p_front_desk','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator','qa-role-qa_htl_p_front_desk','QA','Htl P Front Desk','qa_htl_p_front_desk@qa.kinto',1),
  ('qa-alias-qa_htl_p_manager',9121,'qa_htl_p_manager','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager','qa-role-qa_htl_p_manager','QA','Htl P Manager','qa_htl_p_manager@qa.kinto',1),
  ('qa-alias-qa_htl_p_mis',9121,'qa_htl_p_mis','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_htl_p_mis','QA','Htl P Mis','qa_htl_p_mis@qa.kinto',1),
  ('qa-alias-qa_htl_p_owner',9121,'qa_htl_p_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin','qa-role-qa_htl_p_owner','QA','Htl P Owner','qa_htl_p_owner@qa.kinto',1),
  ('qa-alias-qa_htl_prod',9100,'qa_htl_prod','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_htl_prod','QA','Htl Prod','qa_htl_prod@qa.kinto',1),
  ('qa-alias-qa_htl_receptionist',9100,'qa_htl_receptionist','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator','qa-role-qa_htl_receptionist','QA','Htl Receptionist','qa_htl_receptionist@qa.kinto',1),
  ('qa-alias-qa_htl_s_billing',9120,'qa_htl_s_billing','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_htl_s_billing','QA','Htl S Billing','qa_htl_s_billing@qa.kinto',1),
  ('qa-alias-qa_htl_s_front_desk',9120,'qa_htl_s_front_desk','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator','qa-role-qa_htl_s_front_desk','QA','Htl S Front Desk','qa_htl_s_front_desk@qa.kinto',1),
  ('qa-alias-qa_htl_s_manager',9120,'qa_htl_s_manager','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager','qa-role-qa_htl_s_manager','QA','Htl S Manager','qa_htl_s_manager@qa.kinto',1),
  ('qa-alias-qa_htl_s_owner',9120,'qa_htl_s_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin','qa-role-qa_htl_s_owner','QA','Htl S Owner','qa_htl_s_owner@qa.kinto',1),
  ('qa-alias-qa_htl_sales',9100,'qa_htl_sales','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_htl_sales','QA','Htl Sales','qa_htl_sales@qa.kinto',1),
  ('qa-alias-qa_htl_wh',9100,'qa_htl_wh','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_htl_wh','QA','Htl Wh','qa_htl_wh@qa.kinto',1),
  ('qa-alias-qa_lgs_acct',9700,'qa_lgs_acct','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_lgs_acct','QA','Lgs Acct','qa_lgs_acct@qa.kinto',1),
  ('qa-alias-qa_lgs_assets',9700,'qa_lgs_assets','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_lgs_assets','QA','Lgs Assets','qa_lgs_assets@qa.kinto',1),
  ('qa-alias-qa_lgs_crm',9700,'qa_lgs_crm','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_lgs_crm','QA','Lgs Crm','qa_lgs_crm@qa.kinto',1),
  ('qa-alias-qa_lgs_dispatcher',9700,'qa_lgs_dispatcher','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator','qa-role-qa_lgs_dispatcher','QA','Lgs Dispatcher','qa_lgs_dispatcher@qa.kinto',1),
  ('qa-alias-qa_lgs_driver',9700,'qa_lgs_driver','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','reviewer','qa-role-qa_lgs_driver','QA','Lgs Driver','qa_lgs_driver@qa.kinto',1),
  ('qa-alias-qa_lgs_hr',9700,'qa_lgs_hr','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_lgs_hr','QA','Lgs Hr','qa_lgs_hr@qa.kinto',1),
  ('qa-alias-qa_lgs_manager',9700,'qa_lgs_manager','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager','qa-role-qa_lgs_manager','QA','Lgs Manager','qa_lgs_manager@qa.kinto',1),
  ('qa-alias-qa_lgs_mis',9700,'qa_lgs_mis','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_lgs_mis','QA','Lgs Mis','qa_lgs_mis@qa.kinto',1),
  ('qa-alias-qa_lgs_owner',9700,'qa_lgs_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin','qa-role-qa_lgs_owner','QA','Lgs Owner','qa_lgs_owner@qa.kinto',1),
  ('qa-alias-qa_lgs_p_acct',9721,'qa_lgs_p_acct','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_lgs_p_acct','QA','Lgs P Acct','qa_lgs_p_acct@qa.kinto',1),
  ('qa-alias-qa_lgs_p_crm',9721,'qa_lgs_p_crm','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_lgs_p_crm','QA','Lgs P Crm','qa_lgs_p_crm@qa.kinto',1),
  ('qa-alias-qa_lgs_p_dispatcher',9721,'qa_lgs_p_dispatcher','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator','qa-role-qa_lgs_p_dispatcher','QA','Lgs P Dispatcher','qa_lgs_p_dispatcher@qa.kinto',1),
  ('qa-alias-qa_lgs_p_hr',9721,'qa_lgs_p_hr','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_lgs_p_hr','QA','Lgs P Hr','qa_lgs_p_hr@qa.kinto',1),
  ('qa-alias-qa_lgs_p_manager',9721,'qa_lgs_p_manager','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager','qa-role-qa_lgs_p_manager','QA','Lgs P Manager','qa_lgs_p_manager@qa.kinto',1),
  ('qa-alias-qa_lgs_p_mis',9721,'qa_lgs_p_mis','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_lgs_p_mis','QA','Lgs P Mis','qa_lgs_p_mis@qa.kinto',1),
  ('qa-alias-qa_lgs_p_owner',9721,'qa_lgs_p_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin','qa-role-qa_lgs_p_owner','QA','Lgs P Owner','qa_lgs_p_owner@qa.kinto',1),
  ('qa-alias-qa_lgs_prod',9700,'qa_lgs_prod','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_lgs_prod','QA','Lgs Prod','qa_lgs_prod@qa.kinto',1),
  ('qa-alias-qa_lgs_s_billing',9720,'qa_lgs_s_billing','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_lgs_s_billing','QA','Lgs S Billing','qa_lgs_s_billing@qa.kinto',1),
  ('qa-alias-qa_lgs_s_dispatcher',9720,'qa_lgs_s_dispatcher','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator','qa-role-qa_lgs_s_dispatcher','QA','Lgs S Dispatcher','qa_lgs_s_dispatcher@qa.kinto',1),
  ('qa-alias-qa_lgs_s_manager',9720,'qa_lgs_s_manager','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager','qa-role-qa_lgs_s_manager','QA','Lgs S Manager','qa_lgs_s_manager@qa.kinto',1),
  ('qa-alias-qa_lgs_s_owner',9720,'qa_lgs_s_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin','qa-role-qa_lgs_s_owner','QA','Lgs S Owner','qa_lgs_s_owner@qa.kinto',1),
  ('qa-alias-qa_lgs_sales',9700,'qa_lgs_sales','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_lgs_sales','QA','Lgs Sales','qa_lgs_sales@qa.kinto',1),
  ('qa-alias-qa_lgs_wh',9700,'qa_lgs_wh','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_lgs_wh','QA','Lgs Wh','qa_lgs_wh@qa.kinto',1),
  ('qa-alias-qa_mfg_acct',8200,'qa_mfg_acct','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_mfg_acct','QA','Mfg Acct','qa_mfg_acct@qa.kinto',1),
  ('qa-alias-qa_mfg_assets',8200,'qa_mfg_assets','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_mfg_assets','QA','Mfg Assets','qa_mfg_assets@qa.kinto',1),
  ('qa-alias-qa_mfg_crm',8200,'qa_mfg_crm','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_mfg_crm','QA','Mfg Crm','qa_mfg_crm@qa.kinto',1),
  ('qa-alias-qa_mfg_manager',8200,'qa_mfg_manager','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager','qa-role-qa_mfg_manager','QA','Mfg Manager','qa_mfg_manager@qa.kinto',1),
  ('qa-alias-qa_mfg_mis',8200,'qa_mfg_mis','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_mfg_mis','QA','Mfg Mis','qa_mfg_mis@qa.kinto',1),
  ('qa-alias-qa_mfg_operator',8200,'qa_mfg_operator','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator','qa-role-qa_mfg_operator','QA','Mfg Operator','qa_mfg_operator@qa.kinto',1),
  ('qa-alias-qa_mfg_p_acct',8221,'qa_mfg_p_acct','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_mfg_p_acct','QA','Mfg P Acct','qa_mfg_p_acct@qa.kinto',1),
  ('qa-alias-qa_mfg_p_manager',8221,'qa_mfg_p_manager','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager','qa-role-qa_mfg_p_manager','QA','Mfg P Manager','qa_mfg_p_manager@qa.kinto',1),
  ('qa-alias-qa_mfg_p_mis',8221,'qa_mfg_p_mis','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_mfg_p_mis','QA','Mfg P Mis','qa_mfg_p_mis@qa.kinto',1),
  ('qa-alias-qa_mfg_p_operator',8221,'qa_mfg_p_operator','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator','qa-role-qa_mfg_p_operator','QA','Mfg P Operator','qa_mfg_p_operator@qa.kinto',1),
  ('qa-alias-qa_mfg_planner',8200,'qa_mfg_planner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','reviewer','qa-role-qa_mfg_planner','QA','Mfg Planner','qa_mfg_planner@qa.kinto',1),
  ('qa-alias-qa_mfg_qc',8200,'qa_mfg_qc','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','reviewer','qa-role-qa_mfg_qc','QA','Mfg Qc','qa_mfg_qc@qa.kinto',1),
  ('qa-alias-qa_mfg_s_billing',8220,'qa_mfg_s_billing','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_mfg_s_billing','QA','Mfg S Billing','qa_mfg_s_billing@qa.kinto',1),
  ('qa-alias-qa_mfg_s_manager',8220,'qa_mfg_s_manager','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager','qa-role-qa_mfg_s_manager','QA','Mfg S Manager','qa_mfg_s_manager@qa.kinto',1),
  ('qa-alias-qa_mfg_s_operator',8220,'qa_mfg_s_operator','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator','qa-role-qa_mfg_s_operator','QA','Mfg S Operator','qa_mfg_s_operator@qa.kinto',1),
  ('qa-alias-qa_mfg_s_purchase',8220,'qa_mfg_s_purchase','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_mfg_s_purchase','QA','Mfg S Purchase','qa_mfg_s_purchase@qa.kinto',1),
  ('qa-alias-qa_mfg_sales',8200,'qa_mfg_sales','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_mfg_sales','QA','Mfg Sales','qa_mfg_sales@qa.kinto',1),
  ('qa-alias-qa_mfg_store',8200,'qa_mfg_store','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator','qa-role-qa_mfg_store','QA','Mfg Store','qa_mfg_store@qa.kinto',1),
  ('qa-alias-qa_ndh_acct',9500,'qa_ndh_acct','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_ndh_acct','QA','Ndh Acct','qa_ndh_acct@qa.kinto',1),
  ('qa-alias-qa_ndh_audit',9500,'qa_ndh_audit','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','reviewer','qa-role-qa_ndh_audit','QA','Ndh Audit','qa_ndh_audit@qa.kinto',1),
  ('qa-alias-qa_ndh_collector',9500,'qa_ndh_collector','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator','qa-role-qa_ndh_collector','QA','Ndh Collector','qa_ndh_collector@qa.kinto',1),
  ('qa-alias-qa_ndh_hr',9500,'qa_ndh_hr','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_ndh_hr','QA','Ndh Hr','qa_ndh_hr@qa.kinto',1),
  ('qa-alias-qa_ndh_loan_officer',9500,'qa_ndh_loan_officer','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_ndh_loan_officer','QA','Ndh Loan Officer','qa_ndh_loan_officer@qa.kinto',1),
  ('qa-alias-qa_ndh_manager',9500,'qa_ndh_manager','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager','qa-role-qa_ndh_manager','QA','Ndh Manager','qa_ndh_manager@qa.kinto',1),
  ('qa-alias-qa_ndh_mis',9500,'qa_ndh_mis','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_ndh_mis','QA','Ndh Mis','qa_ndh_mis@qa.kinto',1),
  ('qa-alias-qa_ndh_owner',9500,'qa_ndh_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin','qa-role-qa_ndh_owner','QA','Ndh Owner','qa_ndh_owner@qa.kinto',1),
  ('qa-alias-qa_ndh_p_acct',9521,'qa_ndh_p_acct','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_ndh_p_acct','QA','Ndh P Acct','qa_ndh_p_acct@qa.kinto',1),
  ('qa-alias-qa_ndh_p_collector',9521,'qa_ndh_p_collector','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator','qa-role-qa_ndh_p_collector','QA','Ndh P Collector','qa_ndh_p_collector@qa.kinto',1),
  ('qa-alias-qa_ndh_p_manager',9521,'qa_ndh_p_manager','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager','qa-role-qa_ndh_p_manager','QA','Ndh P Manager','qa_ndh_p_manager@qa.kinto',1),
  ('qa-alias-qa_ndh_p_mis',9521,'qa_ndh_p_mis','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_ndh_p_mis','QA','Ndh P Mis','qa_ndh_p_mis@qa.kinto',1),
  ('qa-alias-qa_ndh_p_owner',9521,'qa_ndh_p_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin','qa-role-qa_ndh_p_owner','QA','Ndh P Owner','qa_ndh_p_owner@qa.kinto',1),
  ('qa-alias-qa_ndh_s_billing',9520,'qa_ndh_s_billing','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_ndh_s_billing','QA','Ndh S Billing','qa_ndh_s_billing@qa.kinto',1),
  ('qa-alias-qa_ndh_s_collector',9520,'qa_ndh_s_collector','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator','qa-role-qa_ndh_s_collector','QA','Ndh S Collector','qa_ndh_s_collector@qa.kinto',1),
  ('qa-alias-qa_ndh_s_manager',9520,'qa_ndh_s_manager','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager','qa-role-qa_ndh_s_manager','QA','Ndh S Manager','qa_ndh_s_manager@qa.kinto',1),
  ('qa-alias-qa_ndh_s_owner',9520,'qa_ndh_s_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin','qa-role-qa_ndh_s_owner','QA','Ndh S Owner','qa_ndh_s_owner@qa.kinto',1),
  ('qa-alias-qa_ngo_acct',9400,'qa_ngo_acct','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_ngo_acct','QA','Ngo Acct','qa_ngo_acct@qa.kinto',1),
  ('qa-alias-qa_ngo_assets',9400,'qa_ngo_assets','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_ngo_assets','QA','Ngo Assets','qa_ngo_assets@qa.kinto',1),
  ('qa-alias-qa_ngo_crm',9400,'qa_ngo_crm','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_ngo_crm','QA','Ngo Crm','qa_ngo_crm@qa.kinto',1),
  ('qa-alias-qa_ngo_donor_mgr',9400,'qa_ngo_donor_mgr','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager','qa-role-qa_ngo_donor_mgr','QA','Ngo Donor Mgr','qa_ngo_donor_mgr@qa.kinto',1),
  ('qa-alias-qa_ngo_field_worker',9400,'qa_ngo_field_worker','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','reviewer','qa-role-qa_ngo_field_worker','QA','Ngo Field Worker','qa_ngo_field_worker@qa.kinto',1),
  ('qa-alias-qa_ngo_hr',9400,'qa_ngo_hr','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_ngo_hr','QA','Ngo Hr','qa_ngo_hr@qa.kinto',1),
  ('qa-alias-qa_ngo_manager',9400,'qa_ngo_manager','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager','qa-role-qa_ngo_manager','QA','Ngo Manager','qa_ngo_manager@qa.kinto',1),
  ('qa-alias-qa_ngo_mis',9400,'qa_ngo_mis','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_ngo_mis','QA','Ngo Mis','qa_ngo_mis@qa.kinto',1),
  ('qa-alias-qa_ngo_owner',9400,'qa_ngo_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin','qa-role-qa_ngo_owner','QA','Ngo Owner','qa_ngo_owner@qa.kinto',1),
  ('qa-alias-qa_ngo_p_acct',9421,'qa_ngo_p_acct','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_ngo_p_acct','QA','Ngo P Acct','qa_ngo_p_acct@qa.kinto',1),
  ('qa-alias-qa_ngo_p_crm',9421,'qa_ngo_p_crm','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_ngo_p_crm','QA','Ngo P Crm','qa_ngo_p_crm@qa.kinto',1),
  ('qa-alias-qa_ngo_p_hr',9421,'qa_ngo_p_hr','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_ngo_p_hr','QA','Ngo P Hr','qa_ngo_p_hr@qa.kinto',1),
  ('qa-alias-qa_ngo_p_manager',9421,'qa_ngo_p_manager','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager','qa-role-qa_ngo_p_manager','QA','Ngo P Manager','qa_ngo_p_manager@qa.kinto',1),
  ('qa-alias-qa_ngo_p_mis',9421,'qa_ngo_p_mis','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_ngo_p_mis','QA','Ngo P Mis','qa_ngo_p_mis@qa.kinto',1),
  ('qa-alias-qa_ngo_p_owner',9421,'qa_ngo_p_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin','qa-role-qa_ngo_p_owner','QA','Ngo P Owner','qa_ngo_p_owner@qa.kinto',1),
  ('qa-alias-qa_ngo_prod',9400,'qa_ngo_prod','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_ngo_prod','QA','Ngo Prod','qa_ngo_prod@qa.kinto',1),
  ('qa-alias-qa_ngo_s_billing',9420,'qa_ngo_s_billing','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_ngo_s_billing','QA','Ngo S Billing','qa_ngo_s_billing@qa.kinto',1),
  ('qa-alias-qa_ngo_s_field_worker',9420,'qa_ngo_s_field_worker','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','reviewer','qa-role-qa_ngo_s_field_worker','QA','Ngo S Field Worker','qa_ngo_s_field_worker@qa.kinto',1),
  ('qa-alias-qa_ngo_s_manager',9420,'qa_ngo_s_manager','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager','qa-role-qa_ngo_s_manager','QA','Ngo S Manager','qa_ngo_s_manager@qa.kinto',1),
  ('qa-alias-qa_ngo_s_owner',9420,'qa_ngo_s_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin','qa-role-qa_ngo_s_owner','QA','Ngo S Owner','qa_ngo_s_owner@qa.kinto',1),
  ('qa-alias-qa_ngo_sales',9400,'qa_ngo_sales','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_ngo_sales','QA','Ngo Sales','qa_ngo_sales@qa.kinto',1),
  ('qa-alias-qa_ngo_wh',9400,'qa_ngo_wh','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_ngo_wh','QA','Ngo Wh','qa_ngo_wh@qa.kinto',1),
  ('qa-alias-qa_ph_assets',9300,'qa_ph_assets','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_ph_assets','QA','Ph Assets','qa_ph_assets@qa.kinto',1),
  ('qa-alias-qa_ph_cashier',9300,'qa_ph_cashier','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator','qa-role-qa_ph_cashier','QA','Ph Cashier','qa_ph_cashier@qa.kinto',1),
  ('qa-alias-qa_ph_crm',9300,'qa_ph_crm','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_ph_crm','QA','Ph Crm','qa_ph_crm@qa.kinto',1),
  ('qa-alias-qa_ph_p_acct',9321,'qa_ph_p_acct','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_ph_p_acct','QA','Ph P Acct','qa_ph_p_acct@qa.kinto',1),
  ('qa-alias-qa_ph_p_cashier',9321,'qa_ph_p_cashier','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator','qa-role-qa_ph_p_cashier','QA','Ph P Cashier','qa_ph_p_cashier@qa.kinto',1),
  ('qa-alias-qa_ph_p_mis',9321,'qa_ph_p_mis','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_ph_p_mis','QA','Ph P Mis','qa_ph_p_mis@qa.kinto',1),
  ('qa-alias-qa_ph_p_owner',9321,'qa_ph_p_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin','qa-role-qa_ph_p_owner','QA','Ph P Owner','qa_ph_p_owner@qa.kinto',1),
  ('qa-alias-qa_ph_p_pharmacist',9321,'qa_ph_p_pharmacist','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','reviewer','qa-role-qa_ph_p_pharmacist','QA','Ph P Pharmacist','qa_ph_p_pharmacist@qa.kinto',1),
  ('qa-alias-qa_ph_pharmacist',9300,'qa_ph_pharmacist','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','reviewer','qa-role-qa_ph_pharmacist','QA','Ph Pharmacist','qa_ph_pharmacist@qa.kinto',1),
  ('qa-alias-qa_ph_prod',9300,'qa_ph_prod','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_ph_prod','QA','Ph Prod','qa_ph_prod@qa.kinto',1),
  ('qa-alias-qa_ph_purchase',9300,'qa_ph_purchase','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_ph_purchase','QA','Ph Purchase','qa_ph_purchase@qa.kinto',1),
  ('qa-alias-qa_ph_s_billing',9320,'qa_ph_s_billing','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_ph_s_billing','QA','Ph S Billing','qa_ph_s_billing@qa.kinto',1),
  ('qa-alias-qa_ph_s_cashier',9320,'qa_ph_s_cashier','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator','qa-role-qa_ph_s_cashier','QA','Ph S Cashier','qa_ph_s_cashier@qa.kinto',1),
  ('qa-alias-qa_ph_s_owner',9320,'qa_ph_s_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin','qa-role-qa_ph_s_owner','QA','Ph S Owner','qa_ph_s_owner@qa.kinto',1),
  ('qa-alias-qa_ph_s_pharmacist',9320,'qa_ph_s_pharmacist','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','reviewer','qa-role-qa_ph_s_pharmacist','QA','Ph S Pharmacist','qa_ph_s_pharmacist@qa.kinto',1),
  ('qa-alias-qa_ph_wh',9300,'qa_ph_wh','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_ph_wh','QA','Ph Wh','qa_ph_wh@qa.kinto',1),
  ('qa-alias-qa_re_acct',9800,'qa_re_acct','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_re_acct','QA','Re Acct','qa_re_acct@qa.kinto',1),
  ('qa-alias-qa_re_assets',9800,'qa_re_assets','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_re_assets','QA','Re Assets','qa_re_assets@qa.kinto',1),
  ('qa-alias-qa_re_crm',9800,'qa_re_crm','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_re_crm','QA','Re Crm','qa_re_crm@qa.kinto',1),
  ('qa-alias-qa_re_hr',9800,'qa_re_hr','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_re_hr','QA','Re Hr','qa_re_hr@qa.kinto',1),
  ('qa-alias-qa_re_manager',9800,'qa_re_manager','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager','qa-role-qa_re_manager','QA','Re Manager','qa_re_manager@qa.kinto',1),
  ('qa-alias-qa_re_mis',9800,'qa_re_mis','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_re_mis','QA','Re Mis','qa_re_mis@qa.kinto',1),
  ('qa-alias-qa_re_owner',9800,'qa_re_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin','qa-role-qa_re_owner','QA','Re Owner','qa_re_owner@qa.kinto',1),
  ('qa-alias-qa_re_p_acct',9821,'qa_re_p_acct','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_re_p_acct','QA','Re P Acct','qa_re_p_acct@qa.kinto',1),
  ('qa-alias-qa_re_p_crm',9821,'qa_re_p_crm','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_re_p_crm','QA','Re P Crm','qa_re_p_crm@qa.kinto',1),
  ('qa-alias-qa_re_p_hr',9821,'qa_re_p_hr','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_re_p_hr','QA','Re P Hr','qa_re_p_hr@qa.kinto',1),
  ('qa-alias-qa_re_p_mis',9821,'qa_re_p_mis','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_re_p_mis','QA','Re P Mis','qa_re_p_mis@qa.kinto',1),
  ('qa-alias-qa_re_p_sales_exec',9821,'qa_re_p_sales_exec','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_re_p_sales_exec','QA','Re P Sales Exec','qa_re_p_sales_exec@qa.kinto',1),
  ('qa-alias-qa_re_prod',9800,'qa_re_prod','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_re_prod','QA','Re Prod','qa_re_prod@qa.kinto',1),
  ('qa-alias-qa_re_s_billing',9820,'qa_re_s_billing','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_re_s_billing','QA','Re S Billing','qa_re_s_billing@qa.kinto',1),
  ('qa-alias-qa_re_s_sales_exec',9820,'qa_re_s_sales_exec','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_re_s_sales_exec','QA','Re S Sales Exec','qa_re_s_sales_exec@qa.kinto',1),
  ('qa-alias-qa_re_sales',9800,'qa_re_sales','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_re_sales','QA','Re Sales','qa_re_sales@qa.kinto',1),
  ('qa-alias-qa_re_sales_exec',9800,'qa_re_sales_exec','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_re_sales_exec','QA','Re Sales Exec','qa_re_sales_exec@qa.kinto',1),
  ('qa-alias-qa_re_site_engineer',9800,'qa_re_site_engineer','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','reviewer','qa-role-qa_re_site_engineer','QA','Re Site Engineer','qa_re_site_engineer@qa.kinto',1),
  ('qa-alias-qa_re_wh',9800,'qa_re_wh','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_re_wh','QA','Re Wh','qa_re_wh@qa.kinto',1),
  ('qa-alias-qa_rtl_acct',8100,'qa_rtl_acct','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_rtl_acct','QA','Rtl Acct','qa_rtl_acct@qa.kinto',1),
  ('qa-alias-qa_rtl_assets',8100,'qa_rtl_assets','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_rtl_assets','QA','Rtl Assets','qa_rtl_assets@qa.kinto',1),
  ('qa-alias-qa_rtl_cashier',8100,'qa_rtl_cashier','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator','qa-role-qa_rtl_cashier','QA','Rtl Cashier','qa_rtl_cashier@qa.kinto',1),
  ('qa-alias-qa_rtl_crm',8100,'qa_rtl_crm','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_rtl_crm','QA','Rtl Crm','qa_rtl_crm@qa.kinto',1),
  ('qa-alias-qa_rtl_hr',8100,'qa_rtl_hr','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_rtl_hr','QA','Rtl Hr','qa_rtl_hr@qa.kinto',1),
  ('qa-alias-qa_rtl_manager',8100,'qa_rtl_manager','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager','qa-role-qa_rtl_manager','QA','Rtl Manager','qa_rtl_manager@qa.kinto',1),
  ('qa-alias-qa_rtl_mis',8100,'qa_rtl_mis','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_rtl_mis','QA','Rtl Mis','qa_rtl_mis@qa.kinto',1),
  ('qa-alias-qa_rtl_owner',8100,'qa_rtl_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin','qa-role-qa_rtl_owner','QA','Rtl Owner','qa_rtl_owner@qa.kinto',1),
  ('qa-alias-qa_rtl_p_acct',8121,'qa_rtl_p_acct','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_rtl_p_acct','QA','Rtl P Acct','qa_rtl_p_acct@qa.kinto',1),
  ('qa-alias-qa_rtl_p_cashier',8121,'qa_rtl_p_cashier','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator','qa-role-qa_rtl_p_cashier','QA','Rtl P Cashier','qa_rtl_p_cashier@qa.kinto',1),
  ('qa-alias-qa_rtl_p_crm',8121,'qa_rtl_p_crm','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_rtl_p_crm','QA','Rtl P Crm','qa_rtl_p_crm@qa.kinto',1),
  ('qa-alias-qa_rtl_p_hr',8121,'qa_rtl_p_hr','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_rtl_p_hr','QA','Rtl P Hr','qa_rtl_p_hr@qa.kinto',1),
  ('qa-alias-qa_rtl_p_manager',8121,'qa_rtl_p_manager','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager','qa-role-qa_rtl_p_manager','QA','Rtl P Manager','qa_rtl_p_manager@qa.kinto',1),
  ('qa-alias-qa_rtl_p_mis',8121,'qa_rtl_p_mis','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_rtl_p_mis','QA','Rtl P Mis','qa_rtl_p_mis@qa.kinto',1),
  ('qa-alias-qa_rtl_p_owner',8121,'qa_rtl_p_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin','qa-role-qa_rtl_p_owner','QA','Rtl P Owner','qa_rtl_p_owner@qa.kinto',1),
  ('qa-alias-qa_rtl_prod',8100,'qa_rtl_prod','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_rtl_prod','QA','Rtl Prod','qa_rtl_prod@qa.kinto',1),
  ('qa-alias-qa_rtl_s_billing',8120,'qa_rtl_s_billing','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_rtl_s_billing','QA','Rtl S Billing','qa_rtl_s_billing@qa.kinto',1),
  ('qa-alias-qa_rtl_s_cashier',8120,'qa_rtl_s_cashier','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator','qa-role-qa_rtl_s_cashier','QA','Rtl S Cashier','qa_rtl_s_cashier@qa.kinto',1),
  ('qa-alias-qa_rtl_s_manager',8120,'qa_rtl_s_manager','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager','qa-role-qa_rtl_s_manager','QA','Rtl S Manager','qa_rtl_s_manager@qa.kinto',1),
  ('qa-alias-qa_rtl_s_owner',8120,'qa_rtl_s_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin','qa-role-qa_rtl_s_owner','QA','Rtl S Owner','qa_rtl_s_owner@qa.kinto',1),
  ('qa-alias-qa_rtl_sales',8100,'qa_rtl_sales','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_rtl_sales','QA','Rtl Sales','qa_rtl_sales@qa.kinto',1),
  ('qa-alias-qa_rtl_stock_clerk',8100,'qa_rtl_stock_clerk','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator','qa-role-qa_rtl_stock_clerk','QA','Rtl Stock Clerk','qa_rtl_stock_clerk@qa.kinto',1),
  ('qa-alias-qa_rtl_wh',8100,'qa_rtl_wh','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_rtl_wh','QA','Rtl Wh','qa_rtl_wh@qa.kinto',1),
  -- Nidhi regional (28c)
  ('qa-alias-qa_ndh_ae_owner',9522,'qa_ndh_ae_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin','qa-role-qa_ndh_ae_owner','QA','Ndh Ae Owner','qa_ndh_ae_owner@qa.kinto',1),
  ('qa-alias-qa_ndh_ae_manager',9522,'qa_ndh_ae_manager','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager','qa-role-qa_ndh_ae_manager','QA','Ndh Ae Manager','qa_ndh_ae_manager@qa.kinto',1),
  ('qa-alias-qa_ndh_ae_collector',9522,'qa_ndh_ae_collector','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator','qa-role-qa_ndh_ae_collector','QA','Ndh Ae Collector','qa_ndh_ae_collector@qa.kinto',1),
  ('qa-alias-qa_ndh_ae_acct',9522,'qa_ndh_ae_acct','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_ndh_ae_acct','QA','Ndh Ae Acct','qa_ndh_ae_acct@qa.kinto',1),
  ('qa-alias-qa_ndh_us_owner',9523,'qa_ndh_us_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin','qa-role-qa_ndh_us_owner','QA','Ndh Us Owner','qa_ndh_us_owner@qa.kinto',1),
  ('qa-alias-qa_ndh_us_manager',9523,'qa_ndh_us_manager','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager','qa-role-qa_ndh_us_manager','QA','Ndh Us Manager','qa_ndh_us_manager@qa.kinto',1),
  ('qa-alias-qa_ndh_us_collector',9523,'qa_ndh_us_collector','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator','qa-role-qa_ndh_us_collector','QA','Ndh Us Collector','qa_ndh_us_collector@qa.kinto',1),
  ('qa-alias-qa_ndh_us_acct',9523,'qa_ndh_us_acct','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_ndh_us_acct','QA','Ndh Us Acct','qa_ndh_us_acct@qa.kinto',1),
  ('qa-alias-qa_ndh_eu_owner',9524,'qa_ndh_eu_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin','qa-role-qa_ndh_eu_owner','QA','Ndh Eu Owner','qa_ndh_eu_owner@qa.kinto',1),
  ('qa-alias-qa_ndh_eu_manager',9524,'qa_ndh_eu_manager','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager','qa-role-qa_ndh_eu_manager','QA','Ndh Eu Manager','qa_ndh_eu_manager@qa.kinto',1),
  ('qa-alias-qa_ndh_eu_collector',9524,'qa_ndh_eu_collector','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator','qa-role-qa_ndh_eu_collector','QA','Ndh Eu Collector','qa_ndh_eu_collector@qa.kinto',1),
  ('qa-alias-qa_ndh_eu_acct',9524,'qa_ndh_eu_acct','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_ndh_eu_acct','QA','Ndh Eu Acct','qa_ndh_eu_acct@qa.kinto',1),
  ('qa-alias-qa_ndh_sg_owner',9525,'qa_ndh_sg_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin','qa-role-qa_ndh_sg_owner','QA','Ndh Sg Owner','qa_ndh_sg_owner@qa.kinto',1),
  ('qa-alias-qa_ndh_sg_manager',9525,'qa_ndh_sg_manager','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager','qa-role-qa_ndh_sg_manager','QA','Ndh Sg Manager','qa_ndh_sg_manager@qa.kinto',1),
  ('qa-alias-qa_ndh_sg_collector',9525,'qa_ndh_sg_collector','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator','qa-role-qa_ndh_sg_collector','QA','Ndh Sg Collector','qa_ndh_sg_collector@qa.kinto',1),
  ('qa-alias-qa_ndh_sg_acct',9525,'qa_ndh_sg_acct','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_ndh_sg_acct','QA','Ndh Sg Acct','qa_ndh_sg_acct@qa.kinto',1),
  ('qa-alias-qa_ndh_au_owner',9526,'qa_ndh_au_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin','qa-role-qa_ndh_au_owner','QA','Ndh Au Owner','qa_ndh_au_owner@qa.kinto',1),
  ('qa-alias-qa_ndh_au_manager',9526,'qa_ndh_au_manager','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager','qa-role-qa_ndh_au_manager','QA','Ndh Au Manager','qa_ndh_au_manager@qa.kinto',1),
  ('qa-alias-qa_ndh_au_collector',9526,'qa_ndh_au_collector','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator','qa-role-qa_ndh_au_collector','QA','Ndh Au Collector','qa_ndh_au_collector@qa.kinto',1),
  ('qa-alias-qa_ndh_au_acct',9526,'qa_ndh_au_acct','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_ndh_au_acct','QA','Ndh Au Acct','qa_ndh_au_acct@qa.kinto',1),
  -- CRM regional (29c)
  ('qa-alias-qa_crm_ae_owner',9622,'qa_crm_ae_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin','qa-role-qa_crm_ae_owner','QA','Crm Ae Owner','qa_crm_ae_owner@qa.kinto',1),
  ('qa-alias-qa_crm_ae_manager',9622,'qa_crm_ae_manager','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager','qa-role-qa_crm_ae_manager','QA','Crm Ae Manager','qa_crm_ae_manager@qa.kinto',1),
  ('qa-alias-qa_crm_ae_sales_exec',9622,'qa_crm_ae_sales_exec','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator','qa-role-qa_crm_ae_sales_exec','QA','Crm Ae Sales Exec','qa_crm_ae_sales_exec@qa.kinto',1),
  ('qa-alias-qa_crm_ae_acct',9622,'qa_crm_ae_acct','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_crm_ae_acct','QA','Crm Ae Acct','qa_crm_ae_acct@qa.kinto',1),
  ('qa-alias-qa_crm_us_owner',9623,'qa_crm_us_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin','qa-role-qa_crm_us_owner','QA','Crm Us Owner','qa_crm_us_owner@qa.kinto',1),
  ('qa-alias-qa_crm_us_manager',9623,'qa_crm_us_manager','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager','qa-role-qa_crm_us_manager','QA','Crm Us Manager','qa_crm_us_manager@qa.kinto',1),
  ('qa-alias-qa_crm_us_sales_exec',9623,'qa_crm_us_sales_exec','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator','qa-role-qa_crm_us_sales_exec','QA','Crm Us Sales Exec','qa_crm_us_sales_exec@qa.kinto',1),
  ('qa-alias-qa_crm_us_acct',9623,'qa_crm_us_acct','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_crm_us_acct','QA','Crm Us Acct','qa_crm_us_acct@qa.kinto',1),
  ('qa-alias-qa_crm_eu_owner',9624,'qa_crm_eu_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin','qa-role-qa_crm_eu_owner','QA','Crm Eu Owner','qa_crm_eu_owner@qa.kinto',1),
  ('qa-alias-qa_crm_eu_manager',9624,'qa_crm_eu_manager','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager','qa-role-qa_crm_eu_manager','QA','Crm Eu Manager','qa_crm_eu_manager@qa.kinto',1),
  ('qa-alias-qa_crm_eu_sales_exec',9624,'qa_crm_eu_sales_exec','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator','qa-role-qa_crm_eu_sales_exec','QA','Crm Eu Sales Exec','qa_crm_eu_sales_exec@qa.kinto',1),
  ('qa-alias-qa_crm_eu_acct',9624,'qa_crm_eu_acct','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_crm_eu_acct','QA','Crm Eu Acct','qa_crm_eu_acct@qa.kinto',1),
  ('qa-alias-qa_crm_sg_owner',9625,'qa_crm_sg_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin','qa-role-qa_crm_sg_owner','QA','Crm Sg Owner','qa_crm_sg_owner@qa.kinto',1),
  ('qa-alias-qa_crm_sg_manager',9625,'qa_crm_sg_manager','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager','qa-role-qa_crm_sg_manager','QA','Crm Sg Manager','qa_crm_sg_manager@qa.kinto',1),
  ('qa-alias-qa_crm_sg_sales_exec',9625,'qa_crm_sg_sales_exec','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator','qa-role-qa_crm_sg_sales_exec','QA','Crm Sg Sales Exec','qa_crm_sg_sales_exec@qa.kinto',1),
  ('qa-alias-qa_crm_sg_acct',9625,'qa_crm_sg_acct','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_crm_sg_acct','QA','Crm Sg Acct','qa_crm_sg_acct@qa.kinto',1),
  ('qa-alias-qa_crm_au_owner',9626,'qa_crm_au_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin','qa-role-qa_crm_au_owner','QA','Crm Au Owner','qa_crm_au_owner@qa.kinto',1),
  ('qa-alias-qa_crm_au_manager',9626,'qa_crm_au_manager','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager','qa-role-qa_crm_au_manager','QA','Crm Au Manager','qa_crm_au_manager@qa.kinto',1),
  ('qa-alias-qa_crm_au_sales_exec',9626,'qa_crm_au_sales_exec','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator','qa-role-qa_crm_au_sales_exec','QA','Crm Au Sales Exec','qa_crm_au_sales_exec@qa.kinto',1),
  ('qa-alias-qa_crm_au_acct',9626,'qa_crm_au_acct','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_crm_au_acct','QA','Crm Au Acct','qa_crm_au_acct@qa.kinto',1),
  -- Logistics regional (30c)
  ('qa-alias-qa_lgs_ae_owner',9722,'qa_lgs_ae_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin','qa-role-qa_lgs_ae_owner','QA','Lgs Ae Owner','qa_lgs_ae_owner@qa.kinto',1),
  ('qa-alias-qa_lgs_ae_manager',9722,'qa_lgs_ae_manager','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager','qa-role-qa_lgs_ae_manager','QA','Lgs Ae Manager','qa_lgs_ae_manager@qa.kinto',1),
  ('qa-alias-qa_lgs_ae_dispatcher',9722,'qa_lgs_ae_dispatcher','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator','qa-role-qa_lgs_ae_dispatcher','QA','Lgs Ae Dispatcher','qa_lgs_ae_dispatcher@qa.kinto',1),
  ('qa-alias-qa_lgs_ae_acct',9722,'qa_lgs_ae_acct','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_lgs_ae_acct','QA','Lgs Ae Acct','qa_lgs_ae_acct@qa.kinto',1),
  ('qa-alias-qa_lgs_us_owner',9723,'qa_lgs_us_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin','qa-role-qa_lgs_us_owner','QA','Lgs Us Owner','qa_lgs_us_owner@qa.kinto',1),
  ('qa-alias-qa_lgs_us_manager',9723,'qa_lgs_us_manager','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager','qa-role-qa_lgs_us_manager','QA','Lgs Us Manager','qa_lgs_us_manager@qa.kinto',1),
  ('qa-alias-qa_lgs_us_dispatcher',9723,'qa_lgs_us_dispatcher','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator','qa-role-qa_lgs_us_dispatcher','QA','Lgs Us Dispatcher','qa_lgs_us_dispatcher@qa.kinto',1),
  ('qa-alias-qa_lgs_us_acct',9723,'qa_lgs_us_acct','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_lgs_us_acct','QA','Lgs Us Acct','qa_lgs_us_acct@qa.kinto',1),
  ('qa-alias-qa_lgs_eu_owner',9724,'qa_lgs_eu_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin','qa-role-qa_lgs_eu_owner','QA','Lgs Eu Owner','qa_lgs_eu_owner@qa.kinto',1),
  ('qa-alias-qa_lgs_eu_manager',9724,'qa_lgs_eu_manager','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager','qa-role-qa_lgs_eu_manager','QA','Lgs Eu Manager','qa_lgs_eu_manager@qa.kinto',1),
  ('qa-alias-qa_lgs_eu_dispatcher',9724,'qa_lgs_eu_dispatcher','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator','qa-role-qa_lgs_eu_dispatcher','QA','Lgs Eu Dispatcher','qa_lgs_eu_dispatcher@qa.kinto',1),
  ('qa-alias-qa_lgs_eu_acct',9724,'qa_lgs_eu_acct','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_lgs_eu_acct','QA','Lgs Eu Acct','qa_lgs_eu_acct@qa.kinto',1),
  ('qa-alias-qa_lgs_sg_owner',9725,'qa_lgs_sg_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin','qa-role-qa_lgs_sg_owner','QA','Lgs Sg Owner','qa_lgs_sg_owner@qa.kinto',1),
  ('qa-alias-qa_lgs_sg_manager',9725,'qa_lgs_sg_manager','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager','qa-role-qa_lgs_sg_manager','QA','Lgs Sg Manager','qa_lgs_sg_manager@qa.kinto',1),
  ('qa-alias-qa_lgs_sg_dispatcher',9725,'qa_lgs_sg_dispatcher','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator','qa-role-qa_lgs_sg_dispatcher','QA','Lgs Sg Dispatcher','qa_lgs_sg_dispatcher@qa.kinto',1),
  ('qa-alias-qa_lgs_sg_acct',9725,'qa_lgs_sg_acct','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_lgs_sg_acct','QA','Lgs Sg Acct','qa_lgs_sg_acct@qa.kinto',1),
  ('qa-alias-qa_lgs_au_owner',9726,'qa_lgs_au_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin','qa-role-qa_lgs_au_owner','QA','Lgs Au Owner','qa_lgs_au_owner@qa.kinto',1),
  ('qa-alias-qa_lgs_au_manager',9726,'qa_lgs_au_manager','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager','qa-role-qa_lgs_au_manager','QA','Lgs Au Manager','qa_lgs_au_manager@qa.kinto',1),
  ('qa-alias-qa_lgs_au_dispatcher',9726,'qa_lgs_au_dispatcher','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator','qa-role-qa_lgs_au_dispatcher','QA','Lgs Au Dispatcher','qa_lgs_au_dispatcher@qa.kinto',1),
  ('qa-alias-qa_lgs_au_acct',9726,'qa_lgs_au_acct','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_lgs_au_acct','QA','Lgs Au Acct','qa_lgs_au_acct@qa.kinto',1),
  -- Real Estate regional (31b)
  ('qa-alias-qa_re_ae_owner',9822,'qa_re_ae_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin','qa-role-qa_re_ae_owner','QA','Re Ae Owner','qa_re_ae_owner@qa.kinto',1),
  ('qa-alias-qa_re_ae_manager',9822,'qa_re_ae_manager','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager','qa-role-qa_re_ae_manager','QA','Re Ae Manager','qa_re_ae_manager@qa.kinto',1),
  ('qa-alias-qa_re_ae_sales_exec',9822,'qa_re_ae_sales_exec','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator','qa-role-qa_re_ae_sales_exec','QA','Re Ae Sales Exec','qa_re_ae_sales_exec@qa.kinto',1),
  ('qa-alias-qa_re_ae_acct',9822,'qa_re_ae_acct','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_re_ae_acct','QA','Re Ae Acct','qa_re_ae_acct@qa.kinto',1),
  ('qa-alias-qa_re_us_owner',9823,'qa_re_us_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin','qa-role-qa_re_us_owner','QA','Re Us Owner','qa_re_us_owner@qa.kinto',1),
  ('qa-alias-qa_re_us_manager',9823,'qa_re_us_manager','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager','qa-role-qa_re_us_manager','QA','Re Us Manager','qa_re_us_manager@qa.kinto',1),
  ('qa-alias-qa_re_us_sales_exec',9823,'qa_re_us_sales_exec','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator','qa-role-qa_re_us_sales_exec','QA','Re Us Sales Exec','qa_re_us_sales_exec@qa.kinto',1),
  ('qa-alias-qa_re_us_acct',9823,'qa_re_us_acct','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_re_us_acct','QA','Re Us Acct','qa_re_us_acct@qa.kinto',1),
  ('qa-alias-qa_re_eu_owner',9824,'qa_re_eu_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin','qa-role-qa_re_eu_owner','QA','Re Eu Owner','qa_re_eu_owner@qa.kinto',1),
  ('qa-alias-qa_re_eu_manager',9824,'qa_re_eu_manager','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager','qa-role-qa_re_eu_manager','QA','Re Eu Manager','qa_re_eu_manager@qa.kinto',1),
  ('qa-alias-qa_re_eu_sales_exec',9824,'qa_re_eu_sales_exec','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator','qa-role-qa_re_eu_sales_exec','QA','Re Eu Sales Exec','qa_re_eu_sales_exec@qa.kinto',1),
  ('qa-alias-qa_re_eu_acct',9824,'qa_re_eu_acct','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_re_eu_acct','QA','Re Eu Acct','qa_re_eu_acct@qa.kinto',1),
  ('qa-alias-qa_re_sg_owner',9825,'qa_re_sg_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin','qa-role-qa_re_sg_owner','QA','Re Sg Owner','qa_re_sg_owner@qa.kinto',1),
  ('qa-alias-qa_re_sg_manager',9825,'qa_re_sg_manager','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager','qa-role-qa_re_sg_manager','QA','Re Sg Manager','qa_re_sg_manager@qa.kinto',1),
  ('qa-alias-qa_re_sg_sales_exec',9825,'qa_re_sg_sales_exec','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator','qa-role-qa_re_sg_sales_exec','QA','Re Sg Sales Exec','qa_re_sg_sales_exec@qa.kinto',1),
  ('qa-alias-qa_re_sg_acct',9825,'qa_re_sg_acct','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_re_sg_acct','QA','Re Sg Acct','qa_re_sg_acct@qa.kinto',1),
  ('qa-alias-qa_re_au_owner',9826,'qa_re_au_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin','qa-role-qa_re_au_owner','QA','Re Au Owner','qa_re_au_owner@qa.kinto',1),
  ('qa-alias-qa_re_au_manager',9826,'qa_re_au_manager','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager','qa-role-qa_re_au_manager','QA','Re Au Manager','qa_re_au_manager@qa.kinto',1),
  ('qa-alias-qa_re_au_sales_exec',9826,'qa_re_au_sales_exec','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator','qa-role-qa_re_au_sales_exec','QA','Re Au Sales Exec','qa_re_au_sales_exec@qa.kinto',1),
  ('qa-alias-qa_re_au_acct',9826,'qa_re_au_acct','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-qa_re_au_acct','QA','Re Au Acct','qa_re_au_acct@qa.kinto',1)
  ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Username aliases skipped: %', SQLERRM;
END;
$$;

-- ── Regional users: Hotel, Healthcare, Pharmacy, NGO (24b/25b/26b/27c) ───────
DO $$
BEGIN
  INSERT INTO users (id, tenant_id, username, password, role, role_id, first_name, last_name, email, is_active) VALUES
  -- Hotel UAE (9122)
  ('qa-u-htl-ae-owner',        9122, 'qa_htl_ae_owner',        '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin',           'qa-role-htl-ae-owner',        'QA', 'Htl Ae Owner',        'qa_htl_ae_owner@qa.kinto',        1),
  ('qa-u-htl-ae-mgr',          9122, 'qa_htl_ae_mgr',          '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'manager',         'qa-role-htl-ae-mgr',          'QA', 'Htl Ae Mgr',          'qa_htl_ae_mgr@qa.kinto',          1),
  ('qa-u-htl-ae-recep',        9122, 'qa_htl_ae_receptionist', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'operator',        'qa-role-htl-ae-recep',        'QA', 'Htl Ae Receptionist', 'qa_htl_ae_receptionist@qa.kinto', 1),
  ('qa-u-htl-ae-acct',         9122, 'qa_htl_ae_acct',         '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'accountsmanager', 'qa-role-htl-ae-acct',         'QA', 'Htl Ae Acct',         'qa_htl_ae_acct@qa.kinto',         1),
  -- Hotel USA (9123)
  ('qa-u-htl-us-owner',        9123, 'qa_htl_us_owner',        '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin',           'qa-role-htl-us-owner',        'QA', 'Htl Us Owner',        'qa_htl_us_owner@qa.kinto',        1),
  ('qa-u-htl-us-mgr',          9123, 'qa_htl_us_mgr',          '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'manager',         'qa-role-htl-us-mgr',          'QA', 'Htl Us Mgr',          'qa_htl_us_mgr@qa.kinto',          1),
  ('qa-u-htl-us-recep',        9123, 'qa_htl_us_receptionist', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'operator',        'qa-role-htl-us-recep',        'QA', 'Htl Us Receptionist', 'qa_htl_us_receptionist@qa.kinto', 1),
  ('qa-u-htl-us-acct',         9123, 'qa_htl_us_acct',         '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'accountsmanager', 'qa-role-htl-us-acct',         'QA', 'Htl Us Acct',         'qa_htl_us_acct@qa.kinto',         1),
  -- Hotel EU (9124)
  ('qa-u-htl-eu-owner',        9124, 'qa_htl_eu_owner',        '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin',           'qa-role-htl-eu-owner',        'QA', 'Htl Eu Owner',        'qa_htl_eu_owner@qa.kinto',        1),
  ('qa-u-htl-eu-mgr',          9124, 'qa_htl_eu_mgr',          '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'manager',         'qa-role-htl-eu-mgr',          'QA', 'Htl Eu Mgr',          'qa_htl_eu_mgr@qa.kinto',          1),
  ('qa-u-htl-eu-recep',        9124, 'qa_htl_eu_receptionist', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'operator',        'qa-role-htl-eu-recep',        'QA', 'Htl Eu Receptionist', 'qa_htl_eu_receptionist@qa.kinto', 1),
  ('qa-u-htl-eu-acct',         9124, 'qa_htl_eu_acct',         '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'accountsmanager', 'qa-role-htl-eu-acct',         'QA', 'Htl Eu Acct',         'qa_htl_eu_acct@qa.kinto',         1),
  -- Hotel SG (9125)
  ('qa-u-htl-sg-owner',        9125, 'qa_htl_sg_owner',        '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin',           'qa-role-htl-sg-owner',        'QA', 'Htl Sg Owner',        'qa_htl_sg_owner@qa.kinto',        1),
  ('qa-u-htl-sg-mgr',          9125, 'qa_htl_sg_mgr',          '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'manager',         'qa-role-htl-sg-mgr',          'QA', 'Htl Sg Mgr',          'qa_htl_sg_mgr@qa.kinto',          1),
  ('qa-u-htl-sg-recep',        9125, 'qa_htl_sg_receptionist', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'operator',        'qa-role-htl-sg-recep',        'QA', 'Htl Sg Receptionist', 'qa_htl_sg_receptionist@qa.kinto', 1),
  ('qa-u-htl-sg-acct',         9125, 'qa_htl_sg_acct',         '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'accountsmanager', 'qa-role-htl-sg-acct',         'QA', 'Htl Sg Acct',         'qa_htl_sg_acct@qa.kinto',         1),
  -- Hotel AU (9126)
  ('qa-u-htl-au-owner',        9126, 'qa_htl_au_owner',        '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin',           'qa-role-htl-au-owner',        'QA', 'Htl Au Owner',        'qa_htl_au_owner@qa.kinto',        1),
  ('qa-u-htl-au-mgr',          9126, 'qa_htl_au_mgr',          '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'manager',         'qa-role-htl-au-mgr',          'QA', 'Htl Au Mgr',          'qa_htl_au_mgr@qa.kinto',          1),
  ('qa-u-htl-au-recep',        9126, 'qa_htl_au_receptionist', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'operator',        'qa-role-htl-au-recep',        'QA', 'Htl Au Receptionist', 'qa_htl_au_receptionist@qa.kinto', 1),
  ('qa-u-htl-au-acct',         9126, 'qa_htl_au_acct',         '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'accountsmanager', 'qa-role-htl-au-acct',         'QA', 'Htl Au Acct',         'qa_htl_au_acct@qa.kinto',         1),
  -- Healthcare UAE (9222)
  ('qa-u-hc-ae-owner',         9222, 'qa_hc_ae_owner',         '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin',           'qa-role-hc-ae-owner',         'QA', 'Hc Ae Owner',         'qa_hc_ae_owner@qa.kinto',         1),
  ('qa-u-hc-ae-doctor',        9222, 'qa_hc_ae_doctor',        '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'manager',         'qa-role-hc-ae-doctor',        'QA', 'Hc Ae Doctor',        'qa_hc_ae_doctor@qa.kinto',        1),
  ('qa-u-hc-ae-recep',         9222, 'qa_hc_ae_receptionist',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'operator',        'qa-role-hc-ae-recep',         'QA', 'Hc Ae Receptionist',  'qa_hc_ae_receptionist@qa.kinto',  1),
  ('qa-u-hc-ae-acct',          9222, 'qa_hc_ae_acct',          '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'accountsmanager', 'qa-role-hc-ae-acct',          'QA', 'Hc Ae Acct',          'qa_hc_ae_acct@qa.kinto',          1),
  -- Healthcare USA (9223)
  ('qa-u-hc-us-owner',         9223, 'qa_hc_us_owner',         '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin',           'qa-role-hc-us-owner',         'QA', 'Hc Us Owner',         'qa_hc_us_owner@qa.kinto',         1),
  ('qa-u-hc-us-doctor',        9223, 'qa_hc_us_doctor',        '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'manager',         'qa-role-hc-us-doctor',        'QA', 'Hc Us Doctor',        'qa_hc_us_doctor@qa.kinto',        1),
  ('qa-u-hc-us-recep',         9223, 'qa_hc_us_receptionist',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'operator',        'qa-role-hc-us-recep',         'QA', 'Hc Us Receptionist',  'qa_hc_us_receptionist@qa.kinto',  1),
  ('qa-u-hc-us-acct',          9223, 'qa_hc_us_acct',          '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'accountsmanager', 'qa-role-hc-us-acct',          'QA', 'Hc Us Acct',          'qa_hc_us_acct@qa.kinto',          1),
  -- Healthcare EU (9224)
  ('qa-u-hc-eu-owner',         9224, 'qa_hc_eu_owner',         '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin',           'qa-role-hc-eu-owner',         'QA', 'Hc Eu Owner',         'qa_hc_eu_owner@qa.kinto',         1),
  ('qa-u-hc-eu-doctor',        9224, 'qa_hc_eu_doctor',        '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'manager',         'qa-role-hc-eu-doctor',        'QA', 'Hc Eu Doctor',        'qa_hc_eu_doctor@qa.kinto',        1),
  ('qa-u-hc-eu-recep',         9224, 'qa_hc_eu_receptionist',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'operator',        'qa-role-hc-eu-recep',         'QA', 'Hc Eu Receptionist',  'qa_hc_eu_receptionist@qa.kinto',  1),
  ('qa-u-hc-eu-acct',          9224, 'qa_hc_eu_acct',          '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'accountsmanager', 'qa-role-hc-eu-acct',          'QA', 'Hc Eu Acct',          'qa_hc_eu_acct@qa.kinto',          1),
  -- Healthcare SG (9225)
  ('qa-u-hc-sg-owner',         9225, 'qa_hc_sg_owner',         '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin',           'qa-role-hc-sg-owner',         'QA', 'Hc Sg Owner',         'qa_hc_sg_owner@qa.kinto',         1),
  ('qa-u-hc-sg-doctor',        9225, 'qa_hc_sg_doctor',        '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'manager',         'qa-role-hc-sg-doctor',        'QA', 'Hc Sg Doctor',        'qa_hc_sg_doctor@qa.kinto',        1),
  ('qa-u-hc-sg-recep',         9225, 'qa_hc_sg_receptionist',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'operator',        'qa-role-hc-sg-recep',         'QA', 'Hc Sg Receptionist',  'qa_hc_sg_receptionist@qa.kinto',  1),
  ('qa-u-hc-sg-acct',          9225, 'qa_hc_sg_acct',          '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'accountsmanager', 'qa-role-hc-sg-acct',          'QA', 'Hc Sg Acct',          'qa_hc_sg_acct@qa.kinto',          1),
  -- Healthcare AU (9226)
  ('qa-u-hc-au-owner',         9226, 'qa_hc_au_owner',         '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin',           'qa-role-hc-au-owner',         'QA', 'Hc Au Owner',         'qa_hc_au_owner@qa.kinto',         1),
  ('qa-u-hc-au-doctor',        9226, 'qa_hc_au_doctor',        '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'manager',         'qa-role-hc-au-doctor',        'QA', 'Hc Au Doctor',        'qa_hc_au_doctor@qa.kinto',        1),
  ('qa-u-hc-au-recep',         9226, 'qa_hc_au_receptionist',  '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'operator',        'qa-role-hc-au-recep',         'QA', 'Hc Au Receptionist',  'qa_hc_au_receptionist@qa.kinto',  1),
  ('qa-u-hc-au-acct',          9226, 'qa_hc_au_acct',          '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'accountsmanager', 'qa-role-hc-au-acct',          'QA', 'Hc Au Acct',          'qa_hc_au_acct@qa.kinto',          1),
  -- Pharmacy UAE (9322)
  ('qa-u-ph-ae-owner',         9322, 'qa_ph_ae_owner',         '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin',           'qa-role-ph-ae-owner',         'QA', 'Ph Ae Owner',         'qa_ph_ae_owner@qa.kinto',         1),
  ('qa-u-ph-ae-pharm',         9322, 'qa_ph_ae_pharmacist',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'manager',         'qa-role-ph-ae-pharm',         'QA', 'Ph Ae Pharmacist',    'qa_ph_ae_pharmacist@qa.kinto',    1),
  ('qa-u-ph-ae-cashier',       9322, 'qa_ph_ae_cashier',       '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'operator',        'qa-role-ph-ae-cashier',       'QA', 'Ph Ae Cashier',       'qa_ph_ae_cashier@qa.kinto',       1),
  ('qa-u-ph-ae-acct',          9322, 'qa_ph_ae_acct',          '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'accountsmanager', 'qa-role-ph-ae-acct',          'QA', 'Ph Ae Acct',          'qa_ph_ae_acct@qa.kinto',          1),
  -- Pharmacy USA (9323)
  ('qa-u-ph-us-owner',         9323, 'qa_ph_us_owner',         '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin',           'qa-role-ph-us-owner',         'QA', 'Ph Us Owner',         'qa_ph_us_owner@qa.kinto',         1),
  ('qa-u-ph-us-pharm',         9323, 'qa_ph_us_pharmacist',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'manager',         'qa-role-ph-us-pharm',         'QA', 'Ph Us Pharmacist',    'qa_ph_us_pharmacist@qa.kinto',    1),
  ('qa-u-ph-us-cashier',       9323, 'qa_ph_us_cashier',       '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'operator',        'qa-role-ph-us-cashier',       'QA', 'Ph Us Cashier',       'qa_ph_us_cashier@qa.kinto',       1),
  ('qa-u-ph-us-acct',          9323, 'qa_ph_us_acct',          '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'accountsmanager', 'qa-role-ph-us-acct',          'QA', 'Ph Us Acct',          'qa_ph_us_acct@qa.kinto',          1),
  -- Pharmacy EU (9324)
  ('qa-u-ph-eu-owner',         9324, 'qa_ph_eu_owner',         '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin',           'qa-role-ph-eu-owner',         'QA', 'Ph Eu Owner',         'qa_ph_eu_owner@qa.kinto',         1),
  ('qa-u-ph-eu-pharm',         9324, 'qa_ph_eu_pharmacist',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'manager',         'qa-role-ph-eu-pharm',         'QA', 'Ph Eu Pharmacist',    'qa_ph_eu_pharmacist@qa.kinto',    1),
  ('qa-u-ph-eu-cashier',       9324, 'qa_ph_eu_cashier',       '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'operator',        'qa-role-ph-eu-cashier',       'QA', 'Ph Eu Cashier',       'qa_ph_eu_cashier@qa.kinto',       1),
  ('qa-u-ph-eu-acct',          9324, 'qa_ph_eu_acct',          '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'accountsmanager', 'qa-role-ph-eu-acct',          'QA', 'Ph Eu Acct',          'qa_ph_eu_acct@qa.kinto',          1),
  -- Pharmacy SG (9325)
  ('qa-u-ph-sg-owner',         9325, 'qa_ph_sg_owner',         '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin',           'qa-role-ph-sg-owner',         'QA', 'Ph Sg Owner',         'qa_ph_sg_owner@qa.kinto',         1),
  ('qa-u-ph-sg-pharm',         9325, 'qa_ph_sg_pharmacist',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'manager',         'qa-role-ph-sg-pharm',         'QA', 'Ph Sg Pharmacist',    'qa_ph_sg_pharmacist@qa.kinto',    1),
  ('qa-u-ph-sg-cashier',       9325, 'qa_ph_sg_cashier',       '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'operator',        'qa-role-ph-sg-cashier',       'QA', 'Ph Sg Cashier',       'qa_ph_sg_cashier@qa.kinto',       1),
  ('qa-u-ph-sg-acct',          9325, 'qa_ph_sg_acct',          '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'accountsmanager', 'qa-role-ph-sg-acct',          'QA', 'Ph Sg Acct',          'qa_ph_sg_acct@qa.kinto',          1),
  -- Pharmacy AU (9326)
  ('qa-u-ph-au-owner',         9326, 'qa_ph_au_owner',         '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin',           'qa-role-ph-au-owner',         'QA', 'Ph Au Owner',         'qa_ph_au_owner@qa.kinto',         1),
  ('qa-u-ph-au-pharm',         9326, 'qa_ph_au_pharmacist',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'manager',         'qa-role-ph-au-pharm',         'QA', 'Ph Au Pharmacist',    'qa_ph_au_pharmacist@qa.kinto',    1),
  ('qa-u-ph-au-cashier',       9326, 'qa_ph_au_cashier',       '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'operator',        'qa-role-ph-au-cashier',       'QA', 'Ph Au Cashier',       'qa_ph_au_cashier@qa.kinto',       1),
  ('qa-u-ph-au-acct',          9326, 'qa_ph_au_acct',          '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'accountsmanager', 'qa-role-ph-au-acct',          'QA', 'Ph Au Acct',          'qa_ph_au_acct@qa.kinto',          1),
  -- NGO UAE (9422)
  ('qa-u-ngo-ae-owner',        9422, 'qa_ngo_ae_owner',        '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin',           'qa-role-ngo-ae-owner',        'QA', 'Ngo Ae Owner',        'qa_ngo_ae_owner@qa.kinto',        1),
  ('qa-u-ngo-ae-mgr',          9422, 'qa_ngo_ae_manager',      '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'manager',         'qa-role-ngo-ae-mgr',          'QA', 'Ngo Ae Manager',      'qa_ngo_ae_manager@qa.kinto',      1),
  ('qa-u-ngo-ae-fw',           9422, 'qa_ngo_ae_field_worker', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'operator',        'qa-role-ngo-ae-fw',           'QA', 'Ngo Ae Field Worker', 'qa_ngo_ae_field_worker@qa.kinto', 1),
  ('qa-u-ngo-ae-acct',         9422, 'qa_ngo_ae_acct',         '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'accountsmanager', 'qa-role-ngo-ae-acct',         'QA', 'Ngo Ae Acct',         'qa_ngo_ae_acct@qa.kinto',         1),
  -- NGO USA (9423)
  ('qa-u-ngo-us-owner',        9423, 'qa_ngo_us_owner',        '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin',           'qa-role-ngo-us-owner',        'QA', 'Ngo Us Owner',        'qa_ngo_us_owner@qa.kinto',        1),
  ('qa-u-ngo-us-mgr',          9423, 'qa_ngo_us_manager',      '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'manager',         'qa-role-ngo-us-mgr',          'QA', 'Ngo Us Manager',      'qa_ngo_us_manager@qa.kinto',      1),
  ('qa-u-ngo-us-fw',           9423, 'qa_ngo_us_field_worker', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'operator',        'qa-role-ngo-us-fw',           'QA', 'Ngo Us Field Worker', 'qa_ngo_us_field_worker@qa.kinto', 1),
  ('qa-u-ngo-us-acct',         9423, 'qa_ngo_us_acct',         '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'accountsmanager', 'qa-role-ngo-us-acct',         'QA', 'Ngo Us Acct',         'qa_ngo_us_acct@qa.kinto',         1),
  -- NGO EU (9424)
  ('qa-u-ngo-eu-owner',        9424, 'qa_ngo_eu_owner',        '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin',           'qa-role-ngo-eu-owner',        'QA', 'Ngo Eu Owner',        'qa_ngo_eu_owner@qa.kinto',        1),
  ('qa-u-ngo-eu-mgr',          9424, 'qa_ngo_eu_manager',      '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'manager',         'qa-role-ngo-eu-mgr',          'QA', 'Ngo Eu Manager',      'qa_ngo_eu_manager@qa.kinto',      1),
  ('qa-u-ngo-eu-fw',           9424, 'qa_ngo_eu_field_worker', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'operator',        'qa-role-ngo-eu-fw',           'QA', 'Ngo Eu Field Worker', 'qa_ngo_eu_field_worker@qa.kinto', 1),
  ('qa-u-ngo-eu-acct',         9424, 'qa_ngo_eu_acct',         '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'accountsmanager', 'qa-role-ngo-eu-acct',         'QA', 'Ngo Eu Acct',         'qa_ngo_eu_acct@qa.kinto',         1),
  -- NGO SG (9425)
  ('qa-u-ngo-sg-owner',        9425, 'qa_ngo_sg_owner',        '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin',           'qa-role-ngo-sg-owner',        'QA', 'Ngo Sg Owner',        'qa_ngo_sg_owner@qa.kinto',        1),
  ('qa-u-ngo-sg-mgr',          9425, 'qa_ngo_sg_manager',      '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'manager',         'qa-role-ngo-sg-mgr',          'QA', 'Ngo Sg Manager',      'qa_ngo_sg_manager@qa.kinto',      1),
  ('qa-u-ngo-sg-fw',           9425, 'qa_ngo_sg_field_worker', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'operator',        'qa-role-ngo-sg-fw',           'QA', 'Ngo Sg Field Worker', 'qa_ngo_sg_field_worker@qa.kinto', 1),
  ('qa-u-ngo-sg-acct',         9425, 'qa_ngo_sg_acct',         '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'accountsmanager', 'qa-role-ngo-sg-acct',         'QA', 'Ngo Sg Acct',         'qa_ngo_sg_acct@qa.kinto',         1),
  -- NGO AU (9426)
  ('qa-u-ngo-au-owner',        9426, 'qa_ngo_au_owner',        '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'admin',           'qa-role-ngo-au-owner',        'QA', 'Ngo Au Owner',        'qa_ngo_au_owner@qa.kinto',        1),
  ('qa-u-ngo-au-mgr',          9426, 'qa_ngo_au_manager',      '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'manager',         'qa-role-ngo-au-mgr',          'QA', 'Ngo Au Manager',      'qa_ngo_au_manager@qa.kinto',      1),
  ('qa-u-ngo-au-fw',           9426, 'qa_ngo_au_field_worker', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'operator',        'qa-role-ngo-au-fw',           'QA', 'Ngo Au Field Worker', 'qa_ngo_au_field_worker@qa.kinto', 1),
  ('qa-u-ngo-au-acct',         9426, 'qa_ngo_au_acct',         '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.', 'accountsmanager', 'qa-role-ngo-au-acct',         'QA', 'Ngo Au Acct',         'qa_ngo_au_acct@qa.kinto',         1)
  ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Regional users (24b/25b/26b/27c) skipped: %', SQLERRM;
END;
$$;

-- ── Regional users: Agriculture (32b), Education (33b), Gold (34b), Retail (35b) ─
DO $$
BEGIN
  INSERT INTO users (id, tenant_id, username, password, role, role_id, first_name, last_name, email, record_status) VALUES
  -- Agriculture regional (32b) tenants 9922-9926
  ('qa-u-agr-ae-owner',      9922,'qa_agr_ae_owner',      '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',           'qa-role-agr-ae-owner',      'QA','Agr Ae Owner',      'qa_agr_ae_owner@qa.kinto',      1),
  ('qa-u-agr-ae-mgr',        9922,'qa_agr_ae_manager',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',         'qa-role-agr-ae-mgr',        'QA','Agr Ae Manager',    'qa_agr_ae_manager@qa.kinto',    1),
  ('qa-u-agr-ae-sup',        9922,'qa_agr_ae_supervisor', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',        'qa-role-agr-ae-sup',        'QA','Agr Ae Supervisor', 'qa_agr_ae_supervisor@qa.kinto', 1),
  ('qa-u-agr-ae-acct',       9922,'qa_agr_ae_acct',       '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager', 'qa-role-agr-ae-acct',       'QA','Agr Ae Acct',       'qa_agr_ae_acct@qa.kinto',       1),
  ('qa-u-agr-us-owner',      9923,'qa_agr_us_owner',      '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',           'qa-role-agr-us-owner',      'QA','Agr Us Owner',      'qa_agr_us_owner@qa.kinto',      1),
  ('qa-u-agr-us-mgr',        9923,'qa_agr_us_manager',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',         'qa-role-agr-us-mgr',        'QA','Agr Us Manager',    'qa_agr_us_manager@qa.kinto',    1),
  ('qa-u-agr-us-sup',        9923,'qa_agr_us_supervisor', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',        'qa-role-agr-us-sup',        'QA','Agr Us Supervisor', 'qa_agr_us_supervisor@qa.kinto', 1),
  ('qa-u-agr-us-acct',       9923,'qa_agr_us_acct',       '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager', 'qa-role-agr-us-acct',       'QA','Agr Us Acct',       'qa_agr_us_acct@qa.kinto',       1),
  ('qa-u-agr-eu-owner',      9924,'qa_agr_eu_owner',      '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',           'qa-role-agr-eu-owner',      'QA','Agr Eu Owner',      'qa_agr_eu_owner@qa.kinto',      1),
  ('qa-u-agr-eu-mgr',        9924,'qa_agr_eu_manager',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',         'qa-role-agr-eu-mgr',        'QA','Agr Eu Manager',    'qa_agr_eu_manager@qa.kinto',    1),
  ('qa-u-agr-eu-sup',        9924,'qa_agr_eu_supervisor', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',        'qa-role-agr-eu-sup',        'QA','Agr Eu Supervisor', 'qa_agr_eu_supervisor@qa.kinto', 1),
  ('qa-u-agr-eu-acct',       9924,'qa_agr_eu_acct',       '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager', 'qa-role-agr-eu-acct',       'QA','Agr Eu Acct',       'qa_agr_eu_acct@qa.kinto',       1),
  ('qa-u-agr-sg-owner',      9925,'qa_agr_sg_owner',      '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',           'qa-role-agr-sg-owner',      'QA','Agr Sg Owner',      'qa_agr_sg_owner@qa.kinto',      1),
  ('qa-u-agr-sg-mgr',        9925,'qa_agr_sg_manager',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',         'qa-role-agr-sg-mgr',        'QA','Agr Sg Manager',    'qa_agr_sg_manager@qa.kinto',    1),
  ('qa-u-agr-sg-sup',        9925,'qa_agr_sg_supervisor', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',        'qa-role-agr-sg-sup',        'QA','Agr Sg Supervisor', 'qa_agr_sg_supervisor@qa.kinto', 1),
  ('qa-u-agr-sg-acct',       9925,'qa_agr_sg_acct',       '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager', 'qa-role-agr-sg-acct',       'QA','Agr Sg Acct',       'qa_agr_sg_acct@qa.kinto',       1),
  ('qa-u-agr-au-owner',      9926,'qa_agr_au_owner',      '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',           'qa-role-agr-au-owner',      'QA','Agr Au Owner',      'qa_agr_au_owner@qa.kinto',      1),
  ('qa-u-agr-au-mgr',        9926,'qa_agr_au_manager',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',         'qa-role-agr-au-mgr',        'QA','Agr Au Manager',    'qa_agr_au_manager@qa.kinto',    1),
  ('qa-u-agr-au-sup',        9926,'qa_agr_au_supervisor', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',        'qa-role-agr-au-sup',        'QA','Agr Au Supervisor', 'qa_agr_au_supervisor@qa.kinto', 1),
  ('qa-u-agr-au-acct',       9926,'qa_agr_au_acct',       '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager', 'qa-role-agr-au-acct',       'QA','Agr Au Acct',       'qa_agr_au_acct@qa.kinto',       1),
  -- Education regional (33b) tenants 9972-9976
  ('qa-u-edu-ae-owner',      9972,'qa_edu_ae_owner',         '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',           'qa-role-edu-ae-owner',      'QA','Edu Ae Owner',         'qa_edu_ae_owner@qa.kinto',         1),
  ('qa-u-edu-ae-principal',  9972,'qa_edu_ae_principal',     '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',         'qa-role-edu-ae-principal',  'QA','Edu Ae Principal',     'qa_edu_ae_principal@qa.kinto',     1),
  ('qa-u-edu-ae-fee',        9972,'qa_edu_ae_fee_collector', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',        'qa-role-edu-ae-fee',        'QA','Edu Ae Fee Collector', 'qa_edu_ae_fee_collector@qa.kinto', 1),
  ('qa-u-edu-ae-acct',       9972,'qa_edu_ae_acct',          '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager', 'qa-role-edu-ae-acct',       'QA','Edu Ae Acct',          'qa_edu_ae_acct@qa.kinto',          1),
  ('qa-u-edu-us-owner',      9973,'qa_edu_us_owner',         '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',           'qa-role-edu-us-owner',      'QA','Edu Us Owner',         'qa_edu_us_owner@qa.kinto',         1),
  ('qa-u-edu-us-principal',  9973,'qa_edu_us_principal',     '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',         'qa-role-edu-us-principal',  'QA','Edu Us Principal',     'qa_edu_us_principal@qa.kinto',     1),
  ('qa-u-edu-us-fee',        9973,'qa_edu_us_fee_collector', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',        'qa-role-edu-us-fee',        'QA','Edu Us Fee Collector', 'qa_edu_us_fee_collector@qa.kinto', 1),
  ('qa-u-edu-us-acct',       9973,'qa_edu_us_acct',          '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager', 'qa-role-edu-us-acct',       'QA','Edu Us Acct',          'qa_edu_us_acct@qa.kinto',          1),
  ('qa-u-edu-eu-owner',      9974,'qa_edu_eu_owner',         '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',           'qa-role-edu-eu-owner',      'QA','Edu Eu Owner',         'qa_edu_eu_owner@qa.kinto',         1),
  ('qa-u-edu-eu-principal',  9974,'qa_edu_eu_principal',     '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',         'qa-role-edu-eu-principal',  'QA','Edu Eu Principal',     'qa_edu_eu_principal@qa.kinto',     1),
  ('qa-u-edu-eu-fee',        9974,'qa_edu_eu_fee_collector', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',        'qa-role-edu-eu-fee',        'QA','Edu Eu Fee Collector', 'qa_edu_eu_fee_collector@qa.kinto', 1),
  ('qa-u-edu-eu-acct',       9974,'qa_edu_eu_acct',          '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager', 'qa-role-edu-eu-acct',       'QA','Edu Eu Acct',          'qa_edu_eu_acct@qa.kinto',          1),
  ('qa-u-edu-sg-owner',      9975,'qa_edu_sg_owner',         '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',           'qa-role-edu-sg-owner',      'QA','Edu Sg Owner',         'qa_edu_sg_owner@qa.kinto',         1),
  ('qa-u-edu-sg-principal',  9975,'qa_edu_sg_principal',     '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',         'qa-role-edu-sg-principal',  'QA','Edu Sg Principal',     'qa_edu_sg_principal@qa.kinto',     1),
  ('qa-u-edu-sg-fee',        9975,'qa_edu_sg_fee_collector', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',        'qa-role-edu-sg-fee',        'QA','Edu Sg Fee Collector', 'qa_edu_sg_fee_collector@qa.kinto', 1),
  ('qa-u-edu-sg-acct',       9975,'qa_edu_sg_acct',          '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager', 'qa-role-edu-sg-acct',       'QA','Edu Sg Acct',          'qa_edu_sg_acct@qa.kinto',          1),
  ('qa-u-edu-au-owner',      9976,'qa_edu_au_owner',         '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',           'qa-role-edu-au-owner',      'QA','Edu Au Owner',         'qa_edu_au_owner@qa.kinto',         1),
  ('qa-u-edu-au-principal',  9976,'qa_edu_au_principal',     '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',         'qa-role-edu-au-principal',  'QA','Edu Au Principal',     'qa_edu_au_principal@qa.kinto',     1),
  ('qa-u-edu-au-fee',        9976,'qa_edu_au_fee_collector', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',        'qa-role-edu-au-fee',        'QA','Edu Au Fee Collector', 'qa_edu_au_fee_collector@qa.kinto', 1),
  ('qa-u-edu-au-acct',       9976,'qa_edu_au_acct',          '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager', 'qa-role-edu-au-acct',       'QA','Edu Au Acct',          'qa_edu_au_acct@qa.kinto',          1),
  -- Gold regional (34b) tenants 8022-8026
  ('qa-u-gld-ae-owner',      8022,'qa_gld_ae_owner',      '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',           'qa-role-gld-ae-owner',      'QA','Gld Ae Owner',      'qa_gld_ae_owner@qa.kinto',      1),
  ('qa-u-gld-ae-mgr',        8022,'qa_gld_ae_manager',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',         'qa-role-gld-ae-mgr',        'QA','Gld Ae Manager',    'qa_gld_ae_manager@qa.kinto',    1),
  ('qa-u-gld-ae-staff',      8022,'qa_gld_ae_sales_staff','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',        'qa-role-gld-ae-staff',      'QA','Gld Ae Sales Staff','qa_gld_ae_sales_staff@qa.kinto',1),
  ('qa-u-gld-ae-acct',       8022,'qa_gld_ae_acct',       '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager', 'qa-role-gld-ae-acct',       'QA','Gld Ae Acct',       'qa_gld_ae_acct@qa.kinto',       1),
  ('qa-u-gld-us-owner',      8023,'qa_gld_us_owner',      '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',           'qa-role-gld-us-owner',      'QA','Gld Us Owner',      'qa_gld_us_owner@qa.kinto',      1),
  ('qa-u-gld-us-mgr',        8023,'qa_gld_us_manager',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',         'qa-role-gld-us-mgr',        'QA','Gld Us Manager',    'qa_gld_us_manager@qa.kinto',    1),
  ('qa-u-gld-us-staff',      8023,'qa_gld_us_sales_staff','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',        'qa-role-gld-us-staff',      'QA','Gld Us Sales Staff','qa_gld_us_sales_staff@qa.kinto',1),
  ('qa-u-gld-us-acct',       8023,'qa_gld_us_acct',       '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager', 'qa-role-gld-us-acct',       'QA','Gld Us Acct',       'qa_gld_us_acct@qa.kinto',       1),
  ('qa-u-gld-eu-owner',      8024,'qa_gld_eu_owner',      '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',           'qa-role-gld-eu-owner',      'QA','Gld Eu Owner',      'qa_gld_eu_owner@qa.kinto',      1),
  ('qa-u-gld-eu-mgr',        8024,'qa_gld_eu_manager',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',         'qa-role-gld-eu-mgr',        'QA','Gld Eu Manager',    'qa_gld_eu_manager@qa.kinto',    1),
  ('qa-u-gld-eu-staff',      8024,'qa_gld_eu_sales_staff','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',        'qa-role-gld-eu-staff',      'QA','Gld Eu Sales Staff','qa_gld_eu_sales_staff@qa.kinto',1),
  ('qa-u-gld-eu-acct',       8024,'qa_gld_eu_acct',       '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager', 'qa-role-gld-eu-acct',       'QA','Gld Eu Acct',       'qa_gld_eu_acct@qa.kinto',       1),
  ('qa-u-gld-sg-owner',      8025,'qa_gld_sg_owner',      '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',           'qa-role-gld-sg-owner',      'QA','Gld Sg Owner',      'qa_gld_sg_owner@qa.kinto',      1),
  ('qa-u-gld-sg-mgr',        8025,'qa_gld_sg_manager',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',         'qa-role-gld-sg-mgr',        'QA','Gld Sg Manager',    'qa_gld_sg_manager@qa.kinto',    1),
  ('qa-u-gld-sg-staff',      8025,'qa_gld_sg_sales_staff','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',        'qa-role-gld-sg-staff',      'QA','Gld Sg Sales Staff','qa_gld_sg_sales_staff@qa.kinto',1),
  ('qa-u-gld-sg-acct',       8025,'qa_gld_sg_acct',       '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager', 'qa-role-gld-sg-acct',       'QA','Gld Sg Acct',       'qa_gld_sg_acct@qa.kinto',       1),
  ('qa-u-gld-au-owner',      8026,'qa_gld_au_owner',      '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',           'qa-role-gld-au-owner',      'QA','Gld Au Owner',      'qa_gld_au_owner@qa.kinto',      1),
  ('qa-u-gld-au-mgr',        8026,'qa_gld_au_manager',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',         'qa-role-gld-au-mgr',        'QA','Gld Au Manager',    'qa_gld_au_manager@qa.kinto',    1),
  ('qa-u-gld-au-staff',      8026,'qa_gld_au_sales_staff','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',        'qa-role-gld-au-staff',      'QA','Gld Au Sales Staff','qa_gld_au_sales_staff@qa.kinto',1),
  ('qa-u-gld-au-acct',       8026,'qa_gld_au_acct',       '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager', 'qa-role-gld-au-acct',       'QA','Gld Au Acct',       'qa_gld_au_acct@qa.kinto',       1),
  -- Retail regional (35b) tenants 8122-8126
  ('qa-u-rtl-ae-owner',      8122,'qa_rtl_ae_owner',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',           'qa-role-rtl-ae-owner',   'QA','Rtl Ae Owner',   'qa_rtl_ae_owner@qa.kinto',   1),
  ('qa-u-rtl-ae-mgr',        8122,'qa_rtl_ae_manager', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',         'qa-role-rtl-ae-mgr',     'QA','Rtl Ae Manager', 'qa_rtl_ae_manager@qa.kinto', 1),
  ('qa-u-rtl-ae-cashier',    8122,'qa_rtl_ae_cashier', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',        'qa-role-rtl-ae-cashier', 'QA','Rtl Ae Cashier', 'qa_rtl_ae_cashier@qa.kinto', 1),
  ('qa-u-rtl-ae-acct',       8122,'qa_rtl_ae_acct',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager', 'qa-role-rtl-ae-acct',    'QA','Rtl Ae Acct',    'qa_rtl_ae_acct@qa.kinto',    1),
  ('qa-u-rtl-us-owner',      8123,'qa_rtl_us_owner',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',           'qa-role-rtl-us-owner',   'QA','Rtl Us Owner',   'qa_rtl_us_owner@qa.kinto',   1),
  ('qa-u-rtl-us-mgr',        8123,'qa_rtl_us_manager', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',         'qa-role-rtl-us-mgr',     'QA','Rtl Us Manager', 'qa_rtl_us_manager@qa.kinto', 1),
  ('qa-u-rtl-us-cashier',    8123,'qa_rtl_us_cashier', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',        'qa-role-rtl-us-cashier', 'QA','Rtl Us Cashier', 'qa_rtl_us_cashier@qa.kinto', 1),
  ('qa-u-rtl-us-acct',       8123,'qa_rtl_us_acct',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager', 'qa-role-rtl-us-acct',    'QA','Rtl Us Acct',    'qa_rtl_us_acct@qa.kinto',    1),
  ('qa-u-rtl-eu-owner',      8124,'qa_rtl_eu_owner',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',           'qa-role-rtl-eu-owner',   'QA','Rtl Eu Owner',   'qa_rtl_eu_owner@qa.kinto',   1),
  ('qa-u-rtl-eu-mgr',        8124,'qa_rtl_eu_manager', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',         'qa-role-rtl-eu-mgr',     'QA','Rtl Eu Manager', 'qa_rtl_eu_manager@qa.kinto', 1),
  ('qa-u-rtl-eu-cashier',    8124,'qa_rtl_eu_cashier', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',        'qa-role-rtl-eu-cashier', 'QA','Rtl Eu Cashier', 'qa_rtl_eu_cashier@qa.kinto', 1),
  ('qa-u-rtl-eu-acct',       8124,'qa_rtl_eu_acct',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager', 'qa-role-rtl-eu-acct',    'QA','Rtl Eu Acct',    'qa_rtl_eu_acct@qa.kinto',    1),
  ('qa-u-rtl-sg-owner',      8125,'qa_rtl_sg_owner',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',           'qa-role-rtl-sg-owner',   'QA','Rtl Sg Owner',   'qa_rtl_sg_owner@qa.kinto',   1),
  ('qa-u-rtl-sg-mgr',        8125,'qa_rtl_sg_manager', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',         'qa-role-rtl-sg-mgr',     'QA','Rtl Sg Manager', 'qa_rtl_sg_manager@qa.kinto', 1),
  ('qa-u-rtl-sg-cashier',    8125,'qa_rtl_sg_cashier', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',        'qa-role-rtl-sg-cashier', 'QA','Rtl Sg Cashier', 'qa_rtl_sg_cashier@qa.kinto', 1),
  ('qa-u-rtl-sg-acct',       8125,'qa_rtl_sg_acct',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager', 'qa-role-rtl-sg-acct',    'QA','Rtl Sg Acct',    'qa_rtl_sg_acct@qa.kinto',    1),
  ('qa-u-rtl-au-owner',      8126,'qa_rtl_au_owner',   '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin',           'qa-role-rtl-au-owner',   'QA','Rtl Au Owner',   'qa_rtl_au_owner@qa.kinto',   1),
  ('qa-u-rtl-au-mgr',        8126,'qa_rtl_au_manager', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager',         'qa-role-rtl-au-mgr',     'QA','Rtl Au Manager', 'qa_rtl_au_manager@qa.kinto', 1),
  ('qa-u-rtl-au-cashier',    8126,'qa_rtl_au_cashier', '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator',        'qa-role-rtl-au-cashier', 'QA','Rtl Au Cashier', 'qa_rtl_au_cashier@qa.kinto', 1),
  ('qa-u-rtl-au-acct',       8126,'qa_rtl_au_acct',    '$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager', 'qa-role-rtl-au-acct',    'QA','Rtl Au Acct',    'qa_rtl_au_acct@qa.kinto',    1)
  ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Regional users (32b/33b/34b/35b) skipped: %', SQLERRM;
END;
$$;

-- ── Regional users: Manufacturing (36b), Finance (37b), E-commerce (38b), HR (39b) ─
DO $$
BEGIN
  INSERT INTO users (id, tenant_id, username, password, role, role_id, first_name, last_name, email, record_status) VALUES
  -- Manufacturing regional (36b) — tenants 8222-8226
  ('qa-u-mfg-ae-own',8222,'qa_mfg_ae_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin','qa-role-mfg-ae-own','QA','Mfg AE Owner','qa_mfg_ae_owner@qa.kinto',1),
  ('qa-u-mfg-ae-mgr',8222,'qa_mfg_ae_manager','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager','qa-role-mfg-ae-mgr','QA','Mfg AE Manager','qa_mfg_ae_manager@qa.kinto',1),
  ('qa-u-mfg-ae-op',8222,'qa_mfg_ae_operator','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator','qa-role-mfg-ae-op','QA','Mfg AE Operator','qa_mfg_ae_operator@qa.kinto',1),
  ('qa-u-mfg-ae-acct',8222,'qa_mfg_ae_acct','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-mfg-ae-acct','QA','Mfg AE Acct','qa_mfg_ae_acct@qa.kinto',1),
  ('qa-u-mfg-us-own',8223,'qa_mfg_us_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin','qa-role-mfg-us-own','QA','Mfg US Owner','qa_mfg_us_owner@qa.kinto',1),
  ('qa-u-mfg-us-mgr',8223,'qa_mfg_us_manager','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager','qa-role-mfg-us-mgr','QA','Mfg US Manager','qa_mfg_us_manager@qa.kinto',1),
  ('qa-u-mfg-us-op',8223,'qa_mfg_us_operator','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator','qa-role-mfg-us-op','QA','Mfg US Operator','qa_mfg_us_operator@qa.kinto',1),
  ('qa-u-mfg-us-acct',8223,'qa_mfg_us_acct','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-mfg-us-acct','QA','Mfg US Acct','qa_mfg_us_acct@qa.kinto',1),
  ('qa-u-mfg-eu-own',8224,'qa_mfg_eu_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin','qa-role-mfg-eu-own','QA','Mfg EU Owner','qa_mfg_eu_owner@qa.kinto',1),
  ('qa-u-mfg-eu-mgr',8224,'qa_mfg_eu_manager','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager','qa-role-mfg-eu-mgr','QA','Mfg EU Manager','qa_mfg_eu_manager@qa.kinto',1),
  ('qa-u-mfg-eu-op',8224,'qa_mfg_eu_operator','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator','qa-role-mfg-eu-op','QA','Mfg EU Operator','qa_mfg_eu_operator@qa.kinto',1),
  ('qa-u-mfg-eu-acct',8224,'qa_mfg_eu_acct','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-mfg-eu-acct','QA','Mfg EU Acct','qa_mfg_eu_acct@qa.kinto',1),
  ('qa-u-mfg-sg-own',8225,'qa_mfg_sg_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin','qa-role-mfg-sg-own','QA','Mfg SG Owner','qa_mfg_sg_owner@qa.kinto',1),
  ('qa-u-mfg-sg-mgr',8225,'qa_mfg_sg_manager','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager','qa-role-mfg-sg-mgr','QA','Mfg SG Manager','qa_mfg_sg_manager@qa.kinto',1),
  ('qa-u-mfg-sg-op',8225,'qa_mfg_sg_operator','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator','qa-role-mfg-sg-op','QA','Mfg SG Operator','qa_mfg_sg_operator@qa.kinto',1),
  ('qa-u-mfg-sg-acct',8225,'qa_mfg_sg_acct','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-mfg-sg-acct','QA','Mfg SG Acct','qa_mfg_sg_acct@qa.kinto',1),
  ('qa-u-mfg-au-own',8226,'qa_mfg_au_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin','qa-role-mfg-au-own','QA','Mfg AU Owner','qa_mfg_au_owner@qa.kinto',1),
  ('qa-u-mfg-au-mgr',8226,'qa_mfg_au_manager','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager','qa-role-mfg-au-mgr','QA','Mfg AU Manager','qa_mfg_au_manager@qa.kinto',1),
  ('qa-u-mfg-au-op',8226,'qa_mfg_au_operator','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator','qa-role-mfg-au-op','QA','Mfg AU Operator','qa_mfg_au_operator@qa.kinto',1),
  ('qa-u-mfg-au-acct',8226,'qa_mfg_au_acct','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-mfg-au-acct','QA','Mfg AU Acct','qa_mfg_au_acct@qa.kinto',1),
  -- Finance regional (37b) — tenants 8322-8326
  ('qa-u-fin-ae-own',8322,'qa_fin_ae_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin','qa-role-fin-ae-own','QA','Fin AE Owner','qa_fin_ae_owner@qa.kinto',1),
  ('qa-u-fin-ae-cfo',8322,'qa_fin_ae_cfo','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager','qa-role-fin-ae-cfo','QA','Fin AE Cfo','qa_fin_ae_cfo@qa.kinto',1),
  ('qa-u-fin-ae-ant',8322,'qa_fin_ae_accountant','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator','qa-role-fin-ae-ant','QA','Fin AE Accountant','qa_fin_ae_accountant@qa.kinto',1),
  ('qa-u-fin-ae-acct',8322,'qa_fin_ae_acct','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-fin-ae-acct','QA','Fin AE Acct','qa_fin_ae_acct@qa.kinto',1),
  ('qa-u-fin-us-own',8323,'qa_fin_us_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin','qa-role-fin-us-own','QA','Fin US Owner','qa_fin_us_owner@qa.kinto',1),
  ('qa-u-fin-us-cfo',8323,'qa_fin_us_cfo','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager','qa-role-fin-us-cfo','QA','Fin US Cfo','qa_fin_us_cfo@qa.kinto',1),
  ('qa-u-fin-us-ant',8323,'qa_fin_us_accountant','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator','qa-role-fin-us-ant','QA','Fin US Accountant','qa_fin_us_accountant@qa.kinto',1),
  ('qa-u-fin-us-acct',8323,'qa_fin_us_acct','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-fin-us-acct','QA','Fin US Acct','qa_fin_us_acct@qa.kinto',1),
  ('qa-u-fin-eu-own',8324,'qa_fin_eu_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin','qa-role-fin-eu-own','QA','Fin EU Owner','qa_fin_eu_owner@qa.kinto',1),
  ('qa-u-fin-eu-cfo',8324,'qa_fin_eu_cfo','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager','qa-role-fin-eu-cfo','QA','Fin EU Cfo','qa_fin_eu_cfo@qa.kinto',1),
  ('qa-u-fin-eu-ant',8324,'qa_fin_eu_accountant','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator','qa-role-fin-eu-ant','QA','Fin EU Accountant','qa_fin_eu_accountant@qa.kinto',1),
  ('qa-u-fin-eu-acct',8324,'qa_fin_eu_acct','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-fin-eu-acct','QA','Fin EU Acct','qa_fin_eu_acct@qa.kinto',1),
  ('qa-u-fin-sg-own',8325,'qa_fin_sg_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin','qa-role-fin-sg-own','QA','Fin SG Owner','qa_fin_sg_owner@qa.kinto',1),
  ('qa-u-fin-sg-cfo',8325,'qa_fin_sg_cfo','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager','qa-role-fin-sg-cfo','QA','Fin SG Cfo','qa_fin_sg_cfo@qa.kinto',1),
  ('qa-u-fin-sg-ant',8325,'qa_fin_sg_accountant','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator','qa-role-fin-sg-ant','QA','Fin SG Accountant','qa_fin_sg_accountant@qa.kinto',1),
  ('qa-u-fin-sg-acct',8325,'qa_fin_sg_acct','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-fin-sg-acct','QA','Fin SG Acct','qa_fin_sg_acct@qa.kinto',1),
  ('qa-u-fin-au-own',8326,'qa_fin_au_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin','qa-role-fin-au-own','QA','Fin AU Owner','qa_fin_au_owner@qa.kinto',1),
  ('qa-u-fin-au-cfo',8326,'qa_fin_au_cfo','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager','qa-role-fin-au-cfo','QA','Fin AU Cfo','qa_fin_au_cfo@qa.kinto',1),
  ('qa-u-fin-au-ant',8326,'qa_fin_au_accountant','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator','qa-role-fin-au-ant','QA','Fin AU Accountant','qa_fin_au_accountant@qa.kinto',1),
  ('qa-u-fin-au-acct',8326,'qa_fin_au_acct','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-fin-au-acct','QA','Fin AU Acct','qa_fin_au_acct@qa.kinto',1),
  -- E-commerce regional (38b) — tenants 8422-8426
  ('qa-u-eco-ae-own',8422,'qa_eco_ae_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin','qa-role-eco-ae-own','QA','Eco AE Owner','qa_eco_ae_owner@qa.kinto',1),
  ('qa-u-eco-ae-mgr',8422,'qa_eco_ae_manager','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager','qa-role-eco-ae-mgr','QA','Eco AE Manager','qa_eco_ae_manager@qa.kinto',1),
  ('qa-u-eco-ae-ops',8422,'qa_eco_ae_ops','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator','qa-role-eco-ae-ops','QA','Eco AE Ops','qa_eco_ae_ops@qa.kinto',1),
  ('qa-u-eco-ae-acct',8422,'qa_eco_ae_acct','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-eco-ae-acct','QA','Eco AE Acct','qa_eco_ae_acct@qa.kinto',1),
  ('qa-u-eco-us-own',8423,'qa_eco_us_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin','qa-role-eco-us-own','QA','Eco US Owner','qa_eco_us_owner@qa.kinto',1),
  ('qa-u-eco-us-mgr',8423,'qa_eco_us_manager','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager','qa-role-eco-us-mgr','QA','Eco US Manager','qa_eco_us_manager@qa.kinto',1),
  ('qa-u-eco-us-ops',8423,'qa_eco_us_ops','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator','qa-role-eco-us-ops','QA','Eco US Ops','qa_eco_us_ops@qa.kinto',1),
  ('qa-u-eco-us-acct',8423,'qa_eco_us_acct','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-eco-us-acct','QA','Eco US Acct','qa_eco_us_acct@qa.kinto',1),
  ('qa-u-eco-eu-own',8424,'qa_eco_eu_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin','qa-role-eco-eu-own','QA','Eco EU Owner','qa_eco_eu_owner@qa.kinto',1),
  ('qa-u-eco-eu-mgr',8424,'qa_eco_eu_manager','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager','qa-role-eco-eu-mgr','QA','Eco EU Manager','qa_eco_eu_manager@qa.kinto',1),
  ('qa-u-eco-eu-ops',8424,'qa_eco_eu_ops','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator','qa-role-eco-eu-ops','QA','Eco EU Ops','qa_eco_eu_ops@qa.kinto',1),
  ('qa-u-eco-eu-acct',8424,'qa_eco_eu_acct','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-eco-eu-acct','QA','Eco EU Acct','qa_eco_eu_acct@qa.kinto',1),
  ('qa-u-eco-sg-own',8425,'qa_eco_sg_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin','qa-role-eco-sg-own','QA','Eco SG Owner','qa_eco_sg_owner@qa.kinto',1),
  ('qa-u-eco-sg-mgr',8425,'qa_eco_sg_manager','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager','qa-role-eco-sg-mgr','QA','Eco SG Manager','qa_eco_sg_manager@qa.kinto',1),
  ('qa-u-eco-sg-ops',8425,'qa_eco_sg_ops','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator','qa-role-eco-sg-ops','QA','Eco SG Ops','qa_eco_sg_ops@qa.kinto',1),
  ('qa-u-eco-sg-acct',8425,'qa_eco_sg_acct','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-eco-sg-acct','QA','Eco SG Acct','qa_eco_sg_acct@qa.kinto',1),
  ('qa-u-eco-au-own',8426,'qa_eco_au_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin','qa-role-eco-au-own','QA','Eco AU Owner','qa_eco_au_owner@qa.kinto',1),
  ('qa-u-eco-au-mgr',8426,'qa_eco_au_manager','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager','qa-role-eco-au-mgr','QA','Eco AU Manager','qa_eco_au_manager@qa.kinto',1),
  ('qa-u-eco-au-ops',8426,'qa_eco_au_ops','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator','qa-role-eco-au-ops','QA','Eco AU Ops','qa_eco_au_ops@qa.kinto',1),
  ('qa-u-eco-au-acct',8426,'qa_eco_au_acct','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-eco-au-acct','QA','Eco AU Acct','qa_eco_au_acct@qa.kinto',1),
  -- HR & Payroll regional (39b) — tenants 8522-8526
  ('qa-u-hr-ae-own',8522,'qa_hr_ae_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin','qa-role-hr-ae-own','QA','Hr AE Owner','qa_hr_ae_owner@qa.kinto',1),
  ('qa-u-hr-ae-mgr',8522,'qa_hr_ae_manager','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager','qa-role-hr-ae-mgr','QA','Hr AE Manager','qa_hr_ae_manager@qa.kinto',1),
  ('qa-u-hr-ae-pe',8522,'qa_hr_ae_payroll_exec','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator','qa-role-hr-ae-pe','QA','Hr AE Payroll Exec','qa_hr_ae_payroll_exec@qa.kinto',1),
  ('qa-u-hr-ae-acct',8522,'qa_hr_ae_acct','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-hr-ae-acct','QA','Hr AE Acct','qa_hr_ae_acct@qa.kinto',1),
  ('qa-u-hr-us-own',8523,'qa_hr_us_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin','qa-role-hr-us-own','QA','Hr US Owner','qa_hr_us_owner@qa.kinto',1),
  ('qa-u-hr-us-mgr',8523,'qa_hr_us_manager','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager','qa-role-hr-us-mgr','QA','Hr US Manager','qa_hr_us_manager@qa.kinto',1),
  ('qa-u-hr-us-pe',8523,'qa_hr_us_payroll_exec','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator','qa-role-hr-us-pe','QA','Hr US Payroll Exec','qa_hr_us_payroll_exec@qa.kinto',1),
  ('qa-u-hr-us-acct',8523,'qa_hr_us_acct','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-hr-us-acct','QA','Hr US Acct','qa_hr_us_acct@qa.kinto',1),
  ('qa-u-hr-eu-own',8524,'qa_hr_eu_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin','qa-role-hr-eu-own','QA','Hr EU Owner','qa_hr_eu_owner@qa.kinto',1),
  ('qa-u-hr-eu-mgr',8524,'qa_hr_eu_manager','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager','qa-role-hr-eu-mgr','QA','Hr EU Manager','qa_hr_eu_manager@qa.kinto',1),
  ('qa-u-hr-eu-pe',8524,'qa_hr_eu_payroll_exec','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator','qa-role-hr-eu-pe','QA','Hr EU Payroll Exec','qa_hr_eu_payroll_exec@qa.kinto',1),
  ('qa-u-hr-eu-acct',8524,'qa_hr_eu_acct','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-hr-eu-acct','QA','Hr EU Acct','qa_hr_eu_acct@qa.kinto',1),
  ('qa-u-hr-sg-own',8525,'qa_hr_sg_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin','qa-role-hr-sg-own','QA','Hr SG Owner','qa_hr_sg_owner@qa.kinto',1),
  ('qa-u-hr-sg-mgr',8525,'qa_hr_sg_manager','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager','qa-role-hr-sg-mgr','QA','Hr SG Manager','qa_hr_sg_manager@qa.kinto',1),
  ('qa-u-hr-sg-pe',8525,'qa_hr_sg_payroll_exec','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator','qa-role-hr-sg-pe','QA','Hr SG Payroll Exec','qa_hr_sg_payroll_exec@qa.kinto',1),
  ('qa-u-hr-sg-acct',8525,'qa_hr_sg_acct','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-hr-sg-acct','QA','Hr SG Acct','qa_hr_sg_acct@qa.kinto',1),
  ('qa-u-hr-au-own',8526,'qa_hr_au_owner','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','admin','qa-role-hr-au-own','QA','Hr AU Owner','qa_hr_au_owner@qa.kinto',1),
  ('qa-u-hr-au-mgr',8526,'qa_hr_au_manager','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','manager','qa-role-hr-au-mgr','QA','Hr AU Manager','qa_hr_au_manager@qa.kinto',1),
  ('qa-u-hr-au-pe',8526,'qa_hr_au_payroll_exec','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','operator','qa-role-hr-au-pe','QA','Hr AU Payroll Exec','qa_hr_au_payroll_exec@qa.kinto',1),
  ('qa-u-hr-au-acct',8526,'qa_hr_au_acct','$2b$10$xyco3ZLprr6wtL4ZK0XXEelKq52oWPBvsuI5rgWK8HJSEzsHLTnF.','accountsmanager','qa-role-hr-au-acct','QA','Hr AU Acct','qa_hr_au_acct@qa.kinto',1)
  ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Regional users (36b/37b/38b/39b) skipped: %', SQLERRM;
END;
$$;

COMMIT;
