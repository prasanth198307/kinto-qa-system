-- KINTO QA Management System - Seed Data
-- Default Roles, Admin User, and Initial Configuration
-- Version: 1.0.0
-- Date: 2025-11-04

-- ===========================================
-- DEFAULT ROLES
-- ===========================================

INSERT INTO roles (id, name, description, permissions, record_status) VALUES
('role-admin', 'admin', 'System Administrator with full access to all features', ARRAY['all'], 1),
('role-manager', 'manager', 'Manager with inventory management, reporting, and approval permissions', ARRAY['machines', 'maintenance', 'inventory', 'reports', 'approvals'], 1),
('role-operator', 'operator', 'Machine Operator who can execute checklists and PM tasks', ARRAY['checklists', 'pm_execution', 'production'], 1),
('role-reviewer', 'reviewer', 'Quality Reviewer who can review and approve checklists', ARRAY['checklist_review', 'quality_reports'], 1)
ON CONFLICT (name) DO NOTHING;

-- ===========================================
-- DEFAULT ADMIN USER
-- ===========================================
-- Password: Admin@123
-- The password hash below is generated using scrypt algorithm
-- IMPORTANT: Change this password immediately after first login!

INSERT INTO users (id, username, password, email, first_name, last_name, role_id, record_status) VALUES
(
    'user-admin',
    'admin',
    'c2NyeXB0AAwAAAAIAAAAAeWwLe7F3HKi8RbNZ3JM3L0mLBSPXNLHJPBJN3VBuaQsVjH8BvJV8DxPxL3BU4v7JQU3n1D3M1mKs0Y4M8H4e7B8',
    'admin@kinto.com',
    'System',
    'Administrator',
    'role-admin',
    1
)
ON CONFLICT (username) DO NOTHING;

-- ===========================================
-- DEFAULT ROLE PERMISSIONS
-- ===========================================
-- Admin has full access to all screens

INSERT INTO role_permissions (role_id, screen_key, can_view, can_create, can_edit, can_delete, record_status) VALUES
-- Admin permissions
('role-admin', 'dashboard', 1, 1, 1, 1, 1),
('role-admin', 'users', 1, 1, 1, 1, 1),
('role-admin', 'roles', 1, 1, 1, 1, 1),
('role-admin', 'machines', 1, 1, 1, 1, 1),
('role-admin', 'machine_types', 1, 1, 1, 1, 1),
('role-admin', 'checklist_templates', 1, 1, 1, 1, 1),
('role-admin', 'checklists', 1, 1, 1, 1, 1),
('role-admin', 'spare_parts', 1, 1, 1, 1, 1),
('role-admin', 'purchase_orders', 1, 1, 1, 1, 1),
('role-admin', 'maintenance_plans', 1, 1, 1, 1, 1),
('role-admin', 'pm_templates', 1, 1, 1, 1, 1),
('role-admin', 'pm_execution', 1, 1, 1, 1, 1),
('role-admin', 'inventory', 1, 1, 1, 1, 1),
('role-admin', 'uom', 1, 1, 1, 1, 1),
('role-admin', 'products', 1, 1, 1, 1, 1),
('role-admin', 'raw_materials', 1, 1, 1, 1, 1),
('role-admin', 'finished_goods', 1, 1, 1, 1, 1),
('role-admin', 'reports', 1, 1, 1, 1, 1),

-- Manager permissions
('role-manager', 'dashboard', 1, 0, 0, 0, 1),
('role-manager', 'machines', 1, 1, 1, 1, 1),
('role-manager', 'machine_types', 1, 1, 1, 1, 1),
('role-manager', 'checklist_templates', 1, 1, 1, 1, 1),
('role-manager', 'checklists', 1, 0, 1, 0, 1),
('role-manager', 'spare_parts', 1, 1, 1, 1, 1),
('role-manager', 'purchase_orders', 1, 1, 1, 1, 1),
('role-manager', 'maintenance_plans', 1, 1, 1, 1, 1),
('role-manager', 'pm_templates', 1, 1, 1, 1, 1),
('role-manager', 'inventory', 1, 1, 1, 1, 1),
('role-manager', 'uom', 1, 1, 1, 1, 1),
('role-manager', 'products', 1, 1, 1, 1, 1),
('role-manager', 'raw_materials', 1, 1, 1, 1, 1),
('role-manager', 'finished_goods', 1, 1, 1, 1, 1),
('role-manager', 'reports', 1, 0, 0, 0, 1),

-- Operator permissions
('role-operator', 'dashboard', 1, 0, 0, 0, 1),
('role-operator', 'checklists', 1, 1, 1, 0, 1),
('role-operator', 'pm_execution', 1, 1, 1, 0, 1),
('role-operator', 'finished_goods', 1, 1, 0, 0, 1),
('role-operator', 'raw_materials', 1, 0, 0, 0, 1),

-- Reviewer permissions
('role-reviewer', 'dashboard', 1, 0, 0, 0, 1),
('role-reviewer', 'checklists', 1, 0, 1, 0, 1),
('role-reviewer', 'reports', 1, 0, 0, 0, 1)
ON CONFLICT DO NOTHING;

-- ===========================================
-- SAMPLE UNITS OF MEASURE
-- ===========================================

INSERT INTO uom (code, name, description, record_status) VALUES
('PCS', 'Pieces', 'Individual units', 1),
('KG', 'Kilograms', 'Weight in kilograms', 1),
('LTR', 'Liters', 'Volume in liters', 1),
('MTR', 'Meters', 'Length in meters', 1),
('BOX', 'Box', 'Boxed units', 1),
('SET', 'Set', 'Set of items', 1),
('ROLL', 'Roll', 'Rolled material', 1),
('BAG', 'Bag', 'Bagged items', 1)
ON CONFLICT (code) DO NOTHING;

-- ===========================================
-- SAMPLE MACHINE TYPES (OPTIONAL)
-- ===========================================

INSERT INTO machine_types (name, description, record_status) VALUES
('CNC Machine', 'Computer Numerical Control machines for precision manufacturing', 1),
('Injection Molding', 'Plastic injection molding equipment', 1),
('Assembly Line', 'Automated assembly line systems', 1),
('Quality Inspection', 'Quality control and inspection equipment', 1),
('Packaging Machine', 'Automated packaging systems', 1)
ON CONFLICT (name) DO NOTHING;

-- ===========================================
-- VERIFICATION QUERIES
-- ===========================================
-- Run these to verify data was inserted correctly

-- Check roles
-- SELECT * FROM roles WHERE record_status = 1;

-- Check admin user
-- SELECT id, username, email, first_name, last_name, role_id FROM users WHERE username = 'admin';

-- Check role permissions count
-- SELECT role_id, COUNT(*) as permission_count FROM role_permissions WHERE record_status = 1 GROUP BY role_id;

-- Check UOM
-- SELECT * FROM uom WHERE record_status = 1;

-- End of seed data
