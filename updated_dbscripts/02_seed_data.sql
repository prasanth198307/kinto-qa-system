-- ============================================================================
-- KINTO Smart Ops - Seed Data Script (FIXED for Mac)
-- ============================================================================
-- This script populates the database with essential reference data
-- ============================================================================

-- ============================================================================
-- 1. ROLES
-- ============================================================================
INSERT INTO roles (id, name, description, record_status) VALUES
('role-admin', 'Admin', 'Full system access', 1),
('role-manager', 'Manager', 'Operations management access', 1),
('role-operator', 'Operator', 'Data entry and checklist operations', 1),
('role-reviewer', 'Reviewer', 'Review and approval access', 1)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  record_status = EXCLUDED.record_status;

-- ============================================================================
-- 2. DEFAULT ADMIN USER
-- ============================================================================
INSERT INTO users (id, username, password, email, mobile_number, first_name, last_name, role_id, record_status) VALUES
(
  gen_random_uuid(),
  'admin',
  'scrypt:16384:8:1$sMWy8ICZtEVkq6nK$3c8ae8c0e8d4d8e4a2f4e8c0e8d4d8e4a2f4e8c0e8d4d8e4a2f4e8c0e8d4d8e4a2f4e8c0e8d4d8e4a2f4e8c0e8d4d8e4a2f4e8c0e8d4d8e4',
  'admin@kinto.com',
  '9999999999',
  'System',
  'Administrator',
  'role-admin',
  1
)
ON CONFLICT (username) DO UPDATE SET
  email = EXCLUDED.email,
  mobile_number = EXCLUDED.mobile_number,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  role_id = EXCLUDED.role_id
WHERE users.record_status = 1;

-- ============================================================================
-- 3. ROLE PERMISSIONS (Using INTEGER 0/1 instead of BOOLEAN)
-- ============================================================================
INSERT INTO role_permissions (role_id, screen_key, can_view, can_create, can_edit, can_delete, record_status) VALUES
-- Admin: Full access to all screens
('role-admin', 'dashboard', 1, 0, 0, 0, 1),
('role-admin', 'purchase_orders', 1, 1, 1, 1, 1),
('role-admin', 'invoices', 1, 1, 1, 1, 1),
('role-admin', 'pending_payments', 1, 1, 1, 1, 1),
('role-admin', 'gatepasses', 1, 1, 1, 1, 1),
('role-admin', 'dispatch_tracking', 1, 1, 1, 1, 1),
('role-admin', 'sales_returns', 1, 1, 1, 1, 1),
('role-admin', 'credit_notes', 1, 1, 1, 1, 1),
('role-admin', 'raw_material_issuance', 1, 1, 1, 1, 1),
('role-admin', 'production_entry', 1, 1, 1, 1, 1),
('role-admin', 'production_reconciliation', 1, 1, 1, 1, 1),
('role-admin', 'variance_analytics', 1, 0, 0, 0, 1),
('role-admin', 'machine_startup', 1, 1, 1, 1, 1),
('role-admin', 'checklist_templates', 1, 1, 1, 1, 1),
('role-admin', 'checklist_assignments', 1, 1, 1, 1, 1),
('role-admin', 'checklist_review', 1, 0, 1, 0, 1),
('role-admin', 'preventive_maintenance', 1, 1, 1, 1, 1),
('role-admin', 'inventory_vendors', 1, 1, 1, 1, 1),
('role-admin', 'inventory_products', 1, 1, 1, 1, 1),
('role-admin', 'inventory_raw_materials', 1, 1, 1, 1, 1),
('role-admin', 'inventory_finished_goods', 1, 1, 1, 1, 1),
('role-admin', 'master_machines', 1, 1, 1, 1, 1),
('role-admin', 'master_machine_types', 1, 1, 1, 1, 1),
('role-admin', 'master_uom', 1, 1, 1, 1, 1),
('role-admin', 'master_banks', 1, 1, 1, 1, 1),
('role-admin', 'master_invoice_templates', 1, 1, 1, 1, 1),
('role-admin', 'master_gatepass_templates', 1, 1, 1, 1, 1),
('role-admin', 'master_terms_conditions', 1, 1, 1, 1, 1),
('role-admin', 'master_raw_material_types', 1, 1, 1, 1, 1),
('role-admin', 'master_vendor_types', 1, 1, 1, 1, 1),
('role-admin', 'master_product_categories', 1, 1, 1, 1, 1),
('role-admin', 'master_product_types', 1, 1, 1, 1, 1),
('role-admin', 'reports_sales', 1, 0, 0, 0, 1),
('role-admin', 'reports_inventory', 1, 0, 0, 0, 1),
('role-admin', 'reports_production', 1, 0, 0, 0, 1),
('role-admin', 'settings_users', 1, 1, 1, 1, 1),
('role-admin', 'settings_roles', 1, 1, 1, 1, 1),

-- Manager: Operations access
('role-manager', 'dashboard', 1, 0, 0, 0, 1),
('role-manager', 'purchase_orders', 1, 1, 1, 0, 1),
('role-manager', 'invoices', 1, 1, 1, 0, 1),
('role-manager', 'pending_payments', 1, 1, 0, 0, 1),
('role-manager', 'gatepasses', 1, 1, 1, 0, 1),
('role-manager', 'dispatch_tracking', 1, 1, 1, 0, 1),
('role-manager', 'sales_returns', 1, 1, 1, 0, 1),
('role-manager', 'raw_material_issuance', 1, 1, 1, 0, 1),
('role-manager', 'production_entry', 1, 1, 1, 0, 1),
('role-manager', 'production_reconciliation', 1, 1, 1, 0, 1),
('role-manager', 'checklist_assignments', 1, 1, 1, 0, 1),
('role-manager', 'checklist_review', 1, 0, 1, 0, 1),
('role-manager', 'inventory_finished_goods', 1, 0, 1, 0, 1),
('role-manager', 'reports_production', 1, 0, 0, 0, 1),

-- Operator: Data entry access
('role-operator', 'dashboard', 1, 0, 0, 0, 1),
('role-operator', 'production_entry', 1, 1, 0, 0, 1),
('role-operator', 'checklist_assignments', 1, 0, 0, 0, 1),

-- Reviewer: Review and approval access
('role-reviewer', 'dashboard', 1, 0, 0, 0, 1),
('role-reviewer', 'checklist_review', 1, 0, 1, 0, 1),
('role-reviewer', 'inventory_finished_goods', 1, 0, 1, 0, 1)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 4. UNITS OF MEASUREMENT (UOM)
-- ============================================================================
INSERT INTO uom (code, name, description, is_active, record_status) VALUES
('PCS', 'Pieces', 'Individual units', 'true', 1),
('KG', 'Kilograms', 'Weight in kilograms', 'true', 1),
('LTR', 'Liters', 'Volume in liters', 'true', 1),
('MTR', 'Meters', 'Length in meters', 'true', 1),
('BOX', 'Box', 'Packaged box', 'true', 1),
('CTN', 'Carton', 'Carton packaging', 'true', 1),
('PKT', 'Packet', 'Small packet', 'true', 1),
('ROLL', 'Roll', 'Roll (for labels, films, etc.)', 'true', 1)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active;

-- ============================================================================
-- 5. MACHINE TYPES
-- ============================================================================
INSERT INTO machine_types (name, description, record_status) VALUES
('Blow Molding', 'Bottle manufacturing machines', 1),
('Filling Machine', 'Water filling machines', 1),
('Capping Machine', 'Bottle capping machines', 1),
('Labeling Machine', 'Label application machines', 1),
('Packing Machine', 'Final packaging machines', 1)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description;

-- ============================================================================
-- 6. VENDOR TYPES
-- ============================================================================
INSERT INTO vendor_types (code, name, description, is_active, record_status) VALUES
('KINTO', 'Kinto', 'Vendors who purchase Kinto brand products', 1, 1),
('HPPANI', 'HPPani', 'Vendors who purchase HPPani brand products', 1, 1),
('PUREJAL', 'Purejal', 'Vendors who purchase Purejal brand products', 1, 1)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active;

-- ============================================================================
-- 7. PRODUCT CATEGORIES
-- ============================================================================
INSERT INTO product_categories (code, name, description, is_active, record_status) VALUES
('BTL', 'Bottles', 'Water bottles of various sizes', 'true', 1),
('CAP', 'Caps', 'Bottle caps and closures', 'true', 1),
('LBL', 'Labels', 'Product labels and stickers', 'true', 1),
('PKG', 'Packaging Materials', 'Boxes, shrink wrap, and packaging', 'true', 1)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active;

-- ============================================================================
-- 8. PRODUCT TYPES
-- ============================================================================
INSERT INTO product_types (code, name, description, is_active, record_status) VALUES
('500ML', '500ML', '500 milliliter capacity products', 'true', 1),
('1LTR', '1LTR', '1 liter capacity products', 'true', 1),
('2LTR', '2LTR', '2 liter capacity products', 'true', 1),
('5LTR', '5LTR', '5 liter capacity products', 'true', 1),
('20LTR', '20LTR', '20 liter capacity products', 'true', 1)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active;

-- ============================================================================
-- VERIFICATION SUMMARY
-- ============================================================================
SELECT 'Seed data loaded successfully!' as status;
SELECT 'Roles: ' || COUNT(*) FROM roles;
SELECT 'Users: ' || COUNT(*) FROM users;
SELECT 'Permissions: ' || COUNT(*) FROM role_permissions;
SELECT 'UOM: ' || COUNT(*) FROM uom;
SELECT 'Machine Types: ' || COUNT(*) FROM machine_types;
SELECT 'Vendor Types: ' || COUNT(*) FROM vendor_types;
SELECT 'Product Categories: ' || COUNT(*) FROM product_categories;
SELECT 'Product Types: ' || COUNT(*) FROM product_types;
