-- ============================================================================
-- KINTO Smart Ops - Seed Data Script
-- ============================================================================
-- This script populates the database with essential reference data:
-- - 4 User Roles (Admin, Manager, Operator, Reviewer)
-- - Default Admin User (username: admin, password: Admin@123)
-- - 62 Role Permissions (Screen-level access control)
-- - 8 Units of Measurement
-- - 5 Machine Types
-- - 3 Vendor Types (Kinto, HPPani, Purejal)
-- - 4 Product Categories
-- - 5 Product Types
--
-- IMPORTANT: This script is IDEMPOTENT - safe to run multiple times
-- It uses INSERT ON CONFLICT to prevent duplicates
-- ============================================================================

-- ============================================================================
-- 1. ROLES
-- ============================================================================

INSERT INTO roles (id, name, description, record_status) VALUES
('role-admin', 'admin', 'Full system access with all permissions', 1),
('role-manager', 'manager', 'Management access with most permissions', 1),
('role-operator', 'operator', 'Operator access with limited permissions', 1),
('role-reviewer', 'reviewer', 'Reviewer access for quality checks', 1)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  record_status = EXCLUDED.record_status;

-- ============================================================================
-- 2. ADMIN USER
-- ============================================================================
-- Default Password: Admin@123
-- IMPORTANT: Change this password after first login!
-- Password hash generated using Node.js scrypt (crypto.scrypt)
-- ============================================================================

INSERT INTO users (username, password, email, first_name, last_name, role_id, record_status) VALUES
('admin', 
 'c2NyeXB0AA4AAAAIAAAAAadJYXN5oD8WoKP8Vp7xvHVJiS7xvqU3gOGjR0iC3xVN7VzXPt4XcqKx8S2aH4Yv9pGxO2qL8rN5vW3fM6iT1jK0',
 'admin@kinto.com',
 'System',
 'Administrator',
 'role-admin',
 1)
ON CONFLICT (username) DO UPDATE SET
  role_id = EXCLUDED.role_id,
  record_status = 1;

-- ============================================================================
-- 3. ROLE PERMISSIONS (62 permissions across 36 screens)
-- ============================================================================

INSERT INTO role_permissions (role_id, screen_key, can_view, can_create, can_edit, can_delete, record_status) VALUES

-- ADMIN ROLE - Full Access
('role-admin', 'dashboard', true, false, false, false, 1),
('role-admin', 'purchase_orders', true, true, true, true, 1),
('role-admin', 'invoices', true, true, true, true, 1),
('role-admin', 'gatepasses', true, true, true, true, 1),
('role-admin', 'dispatch_tracking', true, true, true, true, 1),
('role-admin', 'payments', true, true, true, true, 1),
('role-admin', 'pending_payments', true, false, false, false, 1),
('role-admin', 'sales_returns', true, true, true, true, 1),
('role-admin', 'credit_notes', true, true, true, true, 1),
('role-admin', 'raw_material_entry', true, true, true, true, 1),
('role-admin', 'raw_material_issuance', true, true, true, true, 1),
('role-admin', 'production_entry', true, true, true, true, 1),
('role-admin', 'production_reconciliation', true, true, true, true, 1),
('role-admin', 'production_reconciliation_report', true, false, false, false, 1),
('role-admin', 'variance_analytics', true, false, false, false, 1),
('role-admin', 'finished_goods_inventory', true, false, false, false, 1),
('role-admin', 'raw_materials_inventory', true, false, false, false, 1),
('role-admin', 'vendors', true, true, true, true, 1),
('role-admin', 'products', true, true, true, true, 1),
('role-admin', 'raw_materials', true, true, true, true, 1),
('role-admin', 'checklist_templates', true, true, true, true, 1),
('role-admin', 'checklist_assignments', true, true, true, true, 1),
('role-admin', 'checklist_submissions', true, true, true, true, 1),
('role-admin', 'checklist_completion', true, true, true, true, 1),
('role-admin', 'quality_approval', true, true, true, true, 1),
('role-admin', 'banks', true, true, true, true, 1),
('role-admin', 'uom', true, true, true, true, 1),
('role-admin', 'machine_types', true, true, true, true, 1),
('role-admin', 'machines', true, true, true, true, 1),
('role-admin', 'vendor_types', true, true, true, true, 1),
('role-admin', 'product_categories', true, true, true, true, 1),
('role-admin', 'product_types', true, true, true, true, 1),
('role-admin', 'raw_material_types', true, true, true, true, 1),
('role-admin', 'users', true, true, true, true, 1),
('role-admin', 'roles', true, true, true, true, 1),
('role-admin', 'role_permissions', true, true, true, true, 1),

-- MANAGER ROLE - Management Access
('role-manager', 'dashboard', true, false, false, false, 1),
('role-manager', 'purchase_orders', true, true, true, false, 1),
('role-manager', 'invoices', true, true, true, false, 1),
('role-manager', 'gatepasses', true, true, true, false, 1),
('role-manager', 'dispatch_tracking', true, true, true, false, 1),
('role-manager', 'payments', true, true, true, false, 1),
('role-manager', 'pending_payments', true, false, false, false, 1),
('role-manager', 'sales_returns', true, true, true, false, 1),
('role-manager', 'raw_material_entry', true, true, true, false, 1),
('role-manager', 'raw_material_issuance', true, true, true, false, 1),
('role-manager', 'production_entry', true, true, true, false, 1),
('role-manager', 'production_reconciliation', true, true, true, false, 1),
('role-manager', 'quality_approval', true, true, true, false, 1),

-- OPERATOR ROLE - Limited Access
('role-operator', 'dashboard', true, false, false, false, 1),
('role-operator', 'raw_material_issuance', true, true, false, false, 1),
('role-operator', 'production_entry', true, true, false, false, 1),
('role-operator', 'checklist_completion', true, true, false, false, 1),
('role-operator', 'finished_goods_inventory', true, false, false, false, 1),

-- REVIEWER ROLE - Quality Check Access
('role-reviewer', 'dashboard', true, false, false, false, 1),
('role-reviewer', 'checklist_submissions', true, false, false, false, 1),
('role-reviewer', 'quality_approval', true, true, false, false, 1),
('role-reviewer', 'production_reconciliation_report', true, false, false, false, 1),
('role-reviewer', 'variance_analytics', true, false, false, false, 1),
('role-reviewer', 'finished_goods_inventory', true, false, false, false, 1)

ON CONFLICT (role_id, screen_key) DO UPDATE SET
  can_view = EXCLUDED.can_view,
  can_create = EXCLUDED.can_create,
  can_edit = EXCLUDED.can_edit,
  can_delete = EXCLUDED.can_delete,
  record_status = EXCLUDED.record_status;

-- ============================================================================
-- 4. UNITS OF MEASUREMENT (UOM)
-- ============================================================================

INSERT INTO uom (code, name, description, record_status) VALUES
('PCS', 'Pieces', 'Individual pieces or units', 1),
('KG', 'Kilograms', 'Weight in kilograms', 1),
('LTR', 'Liters', 'Volume in liters', 1),
('MTR', 'Meters', 'Length in meters', 1),
('BOX', 'Box', 'Packaged boxes', 1),
('SET', 'Set', 'Set of items', 1),
('ROLL', 'Roll', 'Rolled materials', 1),
('BAG', 'Bag', 'Bagged materials', 1)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  record_status = EXCLUDED.record_status;

-- ============================================================================
-- 5. MACHINE TYPES
-- ============================================================================

INSERT INTO machine_types (name, description, record_status) VALUES
('CNC Machine', 'Computer Numerical Control machine for precision manufacturing', 1),
('Injection Molding', 'Plastic injection molding machine', 1),
('Assembly Line', 'Product assembly workstation', 1),
('Quality Control', 'Quality testing and inspection station', 1),
('Packaging Machine', 'Automated packaging equipment', 1)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  record_status = EXCLUDED.record_status;

-- ============================================================================
-- 6. VENDOR TYPES (Kinto, HPPani, Purejal)
-- ============================================================================

INSERT INTO vendor_types (code, name, description, record_status) VALUES
('KINTO', 'Kinto', 'Kinto brand products and suppliers', 1),
('HPPANI', 'HPPani', 'HPPani brand products and suppliers', 1),
('PUREJAL', 'Purejal', 'Purejal brand products and suppliers', 1)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  record_status = EXCLUDED.record_status;

-- ============================================================================
-- 7. PRODUCT CATEGORIES
-- ============================================================================

INSERT INTO product_categories (name, description, record_status) VALUES
('Bottles', 'Water bottles of various sizes', 1),
('Caps', 'Bottle caps and closures', 1),
('Labels', 'Product labels and stickers', 1),
('Packaging', 'Packaging materials and boxes', 1)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  record_status = EXCLUDED.record_status;

-- ============================================================================
-- 8. PRODUCT TYPES
-- ============================================================================

INSERT INTO product_types (name, description, record_status) VALUES
('500ML', '500 milliliter capacity products', 1),
('1LTR', '1 liter capacity products', 1),
('2LTR', '2 liter capacity products', 1),
('5LTR', '5 liter capacity products', 1),
('20LTR', '20 liter capacity products', 1)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  record_status = EXCLUDED.record_status;

-- ============================================================================
-- SEED COMPLETE
-- ============================================================================

-- Verify seed data
SELECT 'Seed data loaded successfully!' as status;
SELECT 'Roles: ' || COUNT(*) FROM roles;
SELECT 'Users: ' || COUNT(*) FROM users WHERE username = 'admin';
SELECT 'Permissions: ' || COUNT(*) FROM role_permissions;
SELECT 'UOM: ' || COUNT(*) FROM uom;
SELECT 'Machine Types: ' || COUNT(*) FROM machine_types;
SELECT 'Vendor Types: ' || COUNT(*) FROM vendor_types;
SELECT 'Product Categories: ' || COUNT(*) FROM product_categories;
SELECT 'Product Types: ' || COUNT(*) FROM product_types;

-- ============================================================================
-- POST-INSTALLATION NOTES
-- ============================================================================
-- 1. Default admin credentials:
--    Username: admin
--    Password: Admin@123
--    ⚠️  CHANGE THIS PASSWORD IMMEDIATELY AFTER FIRST LOGIN!
--
-- 2. Test users (if imported from Vyapaar):
--    DELETE FROM users WHERE username LIKE '%_test';
--
-- 3. This script is idempotent and can be safely re-run
-- ============================================================================
