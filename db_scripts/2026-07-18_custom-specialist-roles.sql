-- Create specialist roles with module-scoped permissions
-- These replace generic 'manager' for domain-specific users

-- 1. Insert new roles into roles table (ignore if already exist)
INSERT INTO roles (id, name) VALUES
  ('role-hr-manager',           'hr_manager'),
  ('role-sales-manager',        'sales_manager'),
  ('role-warehouse-manager',    'warehouse_manager'),
  ('role-production-supervisor','production_supervisor'),
  ('role-assets-manager',       'assets_manager'),
  ('role-billing-staff',        'billing_staff'),
  ('role-purchase-manager',     'purchase_manager'),
  ('role-crm-executive',        'crm_executive')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 2. Grant permissions per role (module-scoped, can_view+can_create+can_edit)
-- HR Manager: hr_payroll, hr_employees, hr_attendance, hr_leaves
INSERT INTO role_permissions (role_id, screen_key, can_view, can_create, can_edit, can_delete) VALUES
  ('role-hr-manager', 'hr_payroll',    1, 1, 1, 0),
  ('role-hr-manager', 'hr_employees',  1, 1, 1, 0),
  ('role-hr-manager', 'hr_attendance', 1, 1, 1, 0),
  ('role-hr-manager', 'hr_leaves',     1, 1, 1, 0),
  ('role-hr-manager', 'dashboard',     1, 0, 0, 0)
ON CONFLICT (role_id, screen_key) DO UPDATE
  SET can_view=1, can_create=EXCLUDED.can_create, can_edit=EXCLUDED.can_edit;

-- Sales Manager: sales_orders, invoices, customers, crm
INSERT INTO role_permissions (role_id, screen_key, can_view, can_create, can_edit, can_delete) VALUES
  ('role-sales-manager', 'sales_orders', 1, 1, 1, 0),
  ('role-sales-manager', 'invoices',     1, 1, 1, 0),
  ('role-sales-manager', 'customers',    1, 1, 1, 0),
  ('role-sales-manager', 'crm',          1, 1, 0, 0),
  ('role-sales-manager', 'dashboard',    1, 0, 0, 0)
ON CONFLICT (role_id, screen_key) DO UPDATE
  SET can_view=1, can_create=EXCLUDED.can_create, can_edit=EXCLUDED.can_edit;

-- Warehouse Manager: warehouses, products, inventory
INSERT INTO role_permissions (role_id, screen_key, can_view, can_create, can_edit, can_delete) VALUES
  ('role-warehouse-manager', 'warehouses',       1, 1, 1, 0),
  ('role-warehouse-manager', 'products',         1, 1, 1, 0),
  ('role-warehouse-manager', 'inventory',        1, 1, 1, 0),
  ('role-warehouse-manager', 'purchase_orders',  1, 1, 0, 0),
  ('role-warehouse-manager', 'dashboard',        1, 0, 0, 0)
ON CONFLICT (role_id, screen_key) DO UPDATE
  SET can_view=1, can_create=EXCLUDED.can_create, can_edit=EXCLUDED.can_edit;

-- Production Supervisor: production, raw_materials, recipe_costing
INSERT INTO role_permissions (role_id, screen_key, can_view, can_create, can_edit, can_delete) VALUES
  ('role-production-supervisor', 'production',         1, 1, 1, 0),
  ('role-production-supervisor', 'raw_materials',      1, 1, 1, 0),
  ('role-production-supervisor', 'recipe_costing',     1, 1, 1, 0),
  ('role-production-supervisor', 'products',           1, 0, 0, 0),
  ('role-production-supervisor', 'dashboard',          1, 0, 0, 0)
ON CONFLICT (role_id, screen_key) DO UPDATE
  SET can_view=1, can_create=EXCLUDED.can_create, can_edit=EXCLUDED.can_edit;

-- Assets Manager: fixed_assets only
INSERT INTO role_permissions (role_id, screen_key, can_view, can_create, can_edit, can_delete) VALUES
  ('role-assets-manager', 'fixed_assets', 1, 1, 1, 0),
  ('role-assets-manager', 'dashboard',    1, 0, 0, 0)
ON CONFLICT (role_id, screen_key) DO UPDATE
  SET can_view=1, can_create=EXCLUDED.can_create, can_edit=EXCLUDED.can_edit;

-- Billing Staff: invoices only (view + create)
INSERT INTO role_permissions (role_id, screen_key, can_view, can_create, can_edit, can_delete) VALUES
  ('role-billing-staff', 'invoices',   1, 1, 0, 0),
  ('role-billing-staff', 'dashboard',  1, 0, 0, 0)
ON CONFLICT (role_id, screen_key) DO UPDATE
  SET can_view=1, can_create=EXCLUDED.can_create, can_edit=EXCLUDED.can_edit;

-- Purchase Manager: purchase_orders, vendors, products
INSERT INTO role_permissions (role_id, screen_key, can_view, can_create, can_edit, can_delete) VALUES
  ('role-purchase-manager', 'purchase_orders', 1, 1, 1, 0),
  ('role-purchase-manager', 'vendors',         1, 1, 1, 0),
  ('role-purchase-manager', 'products',        1, 0, 0, 0),
  ('role-purchase-manager', 'dashboard',       1, 0, 0, 0)
ON CONFLICT (role_id, screen_key) DO UPDATE
  SET can_view=1, can_create=EXCLUDED.can_create, can_edit=EXCLUDED.can_edit;

-- CRM Executive: crm, customers, leads, campaigns
INSERT INTO role_permissions (role_id, screen_key, can_view, can_create, can_edit, can_delete) VALUES
  ('role-crm-executive', 'crm',       1, 1, 1, 0),
  ('role-crm-executive', 'customers', 1, 1, 1, 0),
  ('role-crm-executive', 'dashboard', 1, 0, 0, 0)
ON CONFLICT (role_id, screen_key) DO UPDATE
  SET can_view=1, can_create=EXCLUDED.can_create, can_edit=EXCLUDED.can_edit;

-- 3. Update users to use the new role IDs and role names
UPDATE users SET role = 'hr_manager',           role_id = 'role-hr-manager'            WHERE username IN ('qa_e_hr', 'qa_p_hr');
UPDATE users SET role = 'sales_manager',         role_id = 'role-sales-manager'          WHERE username IN ('qa_e_sales', 'qa_p_sales');
UPDATE users SET role = 'warehouse_manager',     role_id = 'role-warehouse-manager'      WHERE username IN ('qa_e_wh');
UPDATE users SET role = 'production_supervisor', role_id = 'role-production-supervisor'  WHERE username IN ('qa_e_prod');
UPDATE users SET role = 'assets_manager',        role_id = 'role-assets-manager'         WHERE username IN ('qa_e_assets');
UPDATE users SET role = 'billing_staff',         role_id = 'role-billing-staff'          WHERE username IN ('qa_s_billing');
UPDATE users SET role = 'purchase_manager',      role_id = 'role-purchase-manager'       WHERE username IN ('qa_s_purchase');
UPDATE users SET role = 'crm_executive',         role_id = 'role-crm-executive'          WHERE username IN ('qa_e_crm', 'qa_p_crm');
