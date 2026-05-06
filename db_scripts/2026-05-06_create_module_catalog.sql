-- ============================================================
--  SwachERP — Module Catalog DB Table
--  Replaces hardcoded server/module-catalog.ts prices with DB-driven values.
--  Super-admins can now edit prices, names, descriptions from the admin panel.
--  Safe to re-run (IF NOT EXISTS + ON CONFLICT DO NOTHING).
--  Connect: psql "$DATABASE_URL" -f db_scripts/2026-05-06_create_module_catalog.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS public.module_catalog (
    slug            text PRIMARY KEY,
    name            text NOT NULL,
    description     text NOT NULL DEFAULT '',
    category        text NOT NULL DEFAULT 'Core',
    price_monthly   integer NOT NULL DEFAULT 0,
    is_free         boolean NOT NULL DEFAULT false,
    is_popular      boolean NOT NULL DEFAULT false,
    dependencies    text[] NOT NULL DEFAULT '{}',
    sort_order      integer NOT NULL DEFAULT 99,
    is_active       boolean NOT NULL DEFAULT true,
    updated_at      timestamptz DEFAULT now()
);

INSERT INTO public.module_catalog
    (slug, name, description, category, price_monthly, is_free, is_popular, dependencies, sort_order)
VALUES
  -- Core (always free)
  ('user_management',  'User Management',          'Add/manage users and set passwords',                          'Core',       0,   true,  false, '{}',          1),
  ('roles',            'Roles & Permissions',      'Screen-level access control per role',                        'Core',       0,   true,  false, '{}',          2),
  ('company_settings', 'Company Settings',         'Profile, branding, GST details',                              'Core',       0,   true,  false, '{}',          3),
  ('dashboard',        'Dashboard & Reports',      'MIS overview, analytics, KPIs',                               'Core',       0,   true,  false, '{}',          4),
  -- Finance
  ('invoicing',        'GST Invoicing',            'Tax invoices, credit/debit notes, proforma',                  'Finance',    699, false, true,  '{}',          5),
  ('accounting',       'Accounting & Ledger',      'Double-entry, COA, journals, P&L, balance sheet',             'Finance',    899, false, false, '{}',          6),
  ('expense_claims',   'Expense Claims',           'Employee expense submission & approvals',                     'Finance',    299, false, false, '{}',          7),
  ('tds_management',   'TDS Management',           'TDS calculation, challans, Form 26Q',                         'Finance',    399, false, false, '{}',          8),
  -- Inventory
  ('inventory',        'Inventory',                'Stock, batches, FIFO, reorder alerts',                        'Inventory',  599, false, true,  '{}',          9),
  ('purchase',         'Purchase & PO',            'RFQ, PO, GRN, vendor invoices, three-way match',             'Inventory',  499, false, false, '{inventory}', 10),
  ('warehouses',       'Multi-Warehouse',          'Multiple locations, stock transfers, UOM conversions',        'Inventory',  399, false, false, '{inventory}', 11),
  ('gatepasses',       'Gatepasses',               'Outward gatepasses, dispatch, serial/lot tracking',           'Inventory',  299, false, false, '{inventory}', 12),
  -- Production
  ('production',       'Production / BOM',         'Work orders, BOM, FG tracking, routing',                      'Production', 699, false, false, '{}',          13),
  ('quality',          'Quality Assurance',        'QA checklists, inspection, rejection logs',                   'Production', 399, false, false, '{}',          14),
  ('maintenance',      'Preventive Maintenance',   'PM schedules, machine downtime tracking',                     'Production', 349, false, false, '{}',          15),
  ('projects',         'Project Management',       'BOQ, milestones, timesheets, project P&L',                   'Production', 599, false, false, '{}',          16),
  -- HR
  ('hr_payroll',       'HR & Payroll',             'Employee master, payroll, payslips, CTC',                     'HR',         799, false, true,  '{}',          17),
  ('attendance',       'Attendance & Leave',       'Daily attendance, leave requests, holiday calendar',          'HR',         349, false, false, '{}',          18),
  ('ess',              'ESS Portal',               'Employee self-service — claims, leaves, payslips',            'HR',         249, false, false, '{}',          19),
  ('appraisals',       'Performance Appraisals',   'Appraisal cycles, ratings, goals',                           'HR',         299, false, false, '{}',          20),
  -- Sales
  ('crm',              'CRM & Leads',              'Lead pipeline, follow-ups, conversion tracking',              'Sales',      499, false, false, '{}',          21),
  ('sales',            'Sales Orders',             'Quotations, sales orders, delivery challans',                 'Sales',      399, false, false, '{}',          22),
  -- Industry Verticals
  ('healthcare',       'Healthcare',               'Patients, OPD/IPD, wards, appointments',                     'Industry',   999, false, false, '{}',          23),
  ('education',        'Education ERP',            'Students, fees, timetable, assessments',                     'Industry',   999, false, false, '{}',          24),
  ('logistics',        'Logistics & Fleet',        'Vehicles, trips, LR / consignment notes',                    'Industry',   799, false, false, '{}',          25),
  ('real_estate',      'Real Estate',              'Projects, units, bookings, payment schedules',               'Industry',   799, false, false, '{}',          26),
  ('pos',              'Retail / POS',             'POS terminal, sessions, sales history',                      'Industry',   699, false, false, '{}',          27),
  ('agriculture',      'Agriculture',              'Farms, crop cycles, procurement, commodity prices',          'Industry',   699, false, false, '{}',          28)
ON CONFLICT (slug) DO NOTHING;
