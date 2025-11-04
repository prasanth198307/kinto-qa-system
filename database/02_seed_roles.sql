-- KINTO QA Management System - Roles Seed Data
-- Insert default system roles with permissions

INSERT INTO roles (name, description, permissions) VALUES
(
    'admin',
    'System Administrator - Full access to all features',
    ARRAY[
        'user_management',
        'role_management',
        'checklist_management',
        'review',
        'approval',
        'pm_management',
        'spare_parts_management',
        'purchase_orders',
        'reports',
        'system_settings'
    ]
),
(
    'operator',
    'Machine Operator - Can execute checklists and PM tasks',
    ARRAY[
        'checklist_execution',
        'pm_execution',
        'view_machines',
        'view_spare_parts'
    ]
),
(
    'reviewer',
    'Quality Reviewer - Can review and approve checklists',
    ARRAY[
        'checklist_review',
        'checklist_approval',
        'view_reports',
        'view_machines'
    ]
),
(
    'manager',
    'Manager - Can view reports and approve actions',
    ARRAY[
        'reports',
        'checklist_approval',
        'pm_approval',
        'purchase_order_approval',
        'view_all_data'
    ]
)
ON CONFLICT (name) DO NOTHING;
