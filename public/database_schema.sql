-- KINTO QA Management System - Complete Database Schema
-- PostgreSQL Database Schema
-- Version: 1.0
-- Date: November 4, 2025

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- SESSION MANAGEMENT
-- ============================================================================

-- Sessions table for session-based authentication
CREATE TABLE IF NOT EXISTS sessions (
    sid VARCHAR(255) PRIMARY KEY,
    sess JSONB NOT NULL,
    expire TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions(expire);

-- ============================================================================
-- ROLE MANAGEMENT & AUTHENTICATION
-- ============================================================================

-- Roles table for dynamic role management
CREATE TABLE IF NOT EXISTS roles (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    permissions TEXT[],
    record_status INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Role Permissions table - Screen-level permissions
CREATE TABLE IF NOT EXISTS role_permissions (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id VARCHAR(255) NOT NULL REFERENCES roles(id),
    screen_key VARCHAR(100) NOT NULL,
    can_view INTEGER NOT NULL DEFAULT 0,
    can_create INTEGER NOT NULL DEFAULT 0,
    can_edit INTEGER NOT NULL DEFAULT 0,
    can_delete INTEGER NOT NULL DEFAULT 0,
    record_status INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users table with email/password authentication
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(255) NOT NULL UNIQUE,
    password TEXT NOT NULL,
    email VARCHAR(255) UNIQUE,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    profile_image_url VARCHAR(255),
    role_id VARCHAR(255) REFERENCES roles(id),
    reset_token VARCHAR(255),
    reset_token_expiry TIMESTAMP,
    record_status INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- MACHINE MANAGEMENT
-- ============================================================================

-- Machine Types configuration
CREATE TABLE IF NOT EXISTS machine_types (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    is_active VARCHAR(10) DEFAULT 'true',
    record_status INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Machines table
CREATE TABLE IF NOT EXISTS machines (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active',
    installation_date TIMESTAMP,
    last_maintenance TIMESTAMP,
    next_pm_due TIMESTAMP,
    record_status INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- CHECKLIST MANAGEMENT
-- ============================================================================

-- Checklist templates
CREATE TABLE IF NOT EXISTS checklist_templates (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    machine_id VARCHAR(255) REFERENCES machines(id),
    shift_types TEXT[],
    created_by VARCHAR(255) REFERENCES users(id),
    is_active VARCHAR(10) DEFAULT 'true',
    record_status INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Template tasks
CREATE TABLE IF NOT EXISTS template_tasks (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id VARCHAR(255) REFERENCES checklist_templates(id),
    task_name VARCHAR(255) NOT NULL,
    verification_criteria TEXT,
    order_index INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Checklist submissions
CREATE TABLE IF NOT EXISTS checklist_submissions (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id VARCHAR(255) REFERENCES checklist_templates(id),
    machine_id VARCHAR(255) REFERENCES machines(id),
    operator_id VARCHAR(255) REFERENCES users(id),
    reviewer_id VARCHAR(255) REFERENCES users(id),
    manager_id VARCHAR(255) REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'pending',
    date TIMESTAMP NOT NULL,
    shift VARCHAR(50),
    supervisor_name VARCHAR(255),
    general_remarks TEXT,
    signature_data TEXT,
    submitted_at TIMESTAMP,
    reviewed_at TIMESTAMP,
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Submission tasks (individual task results)
CREATE TABLE IF NOT EXISTS submission_tasks (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id VARCHAR(255) REFERENCES checklist_submissions(id),
    task_name VARCHAR(255) NOT NULL,
    result VARCHAR(10),
    remarks TEXT,
    photo_url VARCHAR(500),
    verified_by_name VARCHAR(255),
    verified_signature TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- SPARE PARTS & INVENTORY
-- ============================================================================

-- Spare parts catalog
CREATE TABLE IF NOT EXISTS spare_parts_catalog (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
    part_name VARCHAR(255) NOT NULL,
    part_number VARCHAR(100),
    category VARCHAR(100),
    unit_price INTEGER,
    reorder_threshold INTEGER,
    current_stock INTEGER DEFAULT 0,
    record_status INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Machine-Spare Parts relationship
CREATE TABLE IF NOT EXISTS machine_spares (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_id VARCHAR(255) NOT NULL REFERENCES machines(id),
    spare_part_id VARCHAR(255) NOT NULL REFERENCES spare_parts_catalog(id),
    recommended_quantity INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Required spares (linked to submissions)
CREATE TABLE IF NOT EXISTS required_spares (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id VARCHAR(255) REFERENCES checklist_submissions(id),
    spare_item VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL,
    urgency VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Purchase Orders
CREATE TABLE IF NOT EXISTS purchase_orders (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
    po_number VARCHAR(100) NOT NULL UNIQUE,
    spare_part_id VARCHAR(255) REFERENCES spare_parts_catalog(id),
    quantity INTEGER NOT NULL,
    urgency VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    requested_by VARCHAR(255) REFERENCES users(id),
    approved_by VARCHAR(255) REFERENCES users(id),
    supplier VARCHAR(255),
    estimated_cost INTEGER,
    expected_delivery_date TIMESTAMP,
    actual_delivery_date TIMESTAMP,
    remarks TEXT,
    record_status INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- PREVENTIVE MAINTENANCE
-- ============================================================================

-- PM Task List Templates (Master templates)
CREATE TABLE IF NOT EXISTS pm_task_list_templates (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    machine_type_id VARCHAR(255) REFERENCES machine_types(id),
    category VARCHAR(100),
    is_active VARCHAR(10) DEFAULT 'true',
    record_status INTEGER NOT NULL DEFAULT 1,
    created_by VARCHAR(255) REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PM Template Tasks
CREATE TABLE IF NOT EXISTS pm_template_tasks (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id VARCHAR(255) NOT NULL REFERENCES pm_task_list_templates(id),
    task_name VARCHAR(255) NOT NULL,
    description TEXT,
    verification_criteria TEXT,
    order_index INTEGER,
    requires_photo VARCHAR(10) DEFAULT 'false',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Maintenance plans
CREATE TABLE IF NOT EXISTS maintenance_plans (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_id VARCHAR(255) REFERENCES machines(id),
    plan_name VARCHAR(255) NOT NULL,
    plan_type VARCHAR(100) NOT NULL,
    frequency VARCHAR(50) NOT NULL,
    next_due_date TIMESTAMP,
    task_list_template_id VARCHAR(255) REFERENCES pm_task_list_templates(id),
    assigned_to VARCHAR(255) REFERENCES users(id),
    is_active VARCHAR(10) DEFAULT 'true',
    record_status INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PM Executions (History of PM task completions)
CREATE TABLE IF NOT EXISTS pm_executions (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
    maintenance_plan_id VARCHAR(255) NOT NULL REFERENCES maintenance_plans(id),
    machine_id VARCHAR(255) NOT NULL REFERENCES machines(id),
    task_list_template_id VARCHAR(255) REFERENCES pm_task_list_templates(id),
    completed_by VARCHAR(255) NOT NULL REFERENCES users(id),
    completed_at TIMESTAMP NOT NULL,
    status VARCHAR(50) DEFAULT 'completed',
    overall_result VARCHAR(50),
    remarks TEXT,
    downtime_hours INTEGER,
    spare_parts_used TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PM Execution Tasks
CREATE TABLE IF NOT EXISTS pm_execution_tasks (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id VARCHAR(255) NOT NULL REFERENCES pm_executions(id),
    task_name VARCHAR(255) NOT NULL,
    description TEXT,
    result VARCHAR(10),
    remarks TEXT,
    photo_url VARCHAR(500),
    order_index INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Maintenance history
CREATE TABLE IF NOT EXISTS maintenance_history (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_id VARCHAR(255) REFERENCES machines(id),
    plan_id VARCHAR(255) REFERENCES maintenance_plans(id),
    performed_date TIMESTAMP NOT NULL,
    performed_by VARCHAR(255) REFERENCES users(id),
    type VARCHAR(100) NOT NULL,
    description TEXT,
    spare_parts_used TEXT,
    downtime_hours INTEGER,
    cost INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INVENTORY MANAGEMENT
-- ============================================================================

-- Unit of Measurement (UOM) Master
CREATE TABLE IF NOT EXISTS uom (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active VARCHAR(10) DEFAULT 'true',
    record_status INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Product Master
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
    product_code VARCHAR(100) NOT NULL UNIQUE,
    product_name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    uom_id VARCHAR(255) REFERENCES uom(id),
    standard_cost INTEGER,
    is_active VARCHAR(10) DEFAULT 'true',
    record_status INTEGER NOT NULL DEFAULT 1,
    created_by VARCHAR(255) REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Raw Materials/Inventory
CREATE TABLE IF NOT EXISTS raw_materials (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
    material_code VARCHAR(100) NOT NULL UNIQUE,
    material_name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    uom_id VARCHAR(255) REFERENCES uom(id),
    current_stock INTEGER DEFAULT 0,
    reorder_level INTEGER,
    max_stock_level INTEGER,
    unit_cost INTEGER,
    location VARCHAR(255),
    supplier VARCHAR(255),
    is_active VARCHAR(10) DEFAULT 'true',
    record_status INTEGER NOT NULL DEFAULT 1,
    created_by VARCHAR(255) REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Raw Material Stock Transactions
CREATE TABLE IF NOT EXISTS raw_material_transactions (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id VARCHAR(255) NOT NULL REFERENCES raw_materials(id),
    transaction_type VARCHAR(50) NOT NULL,
    quantity INTEGER NOT NULL,
    reference VARCHAR(255),
    remarks TEXT,
    performed_by VARCHAR(255) REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Finished Goods
CREATE TABLE IF NOT EXISTS finished_goods (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id VARCHAR(255) NOT NULL REFERENCES products(id),
    batch_number VARCHAR(100) NOT NULL,
    production_date TIMESTAMP NOT NULL,
    quantity INTEGER NOT NULL,
    uom_id VARCHAR(255) REFERENCES uom(id),
    quality_status VARCHAR(50) DEFAULT 'pending',
    machine_id VARCHAR(255) REFERENCES machines(id),
    operator_id VARCHAR(255) REFERENCES users(id),
    inspected_by VARCHAR(255) REFERENCES users(id),
    inspection_date TIMESTAMP,
    storage_location VARCHAR(255),
    remarks TEXT,
    record_status INTEGER NOT NULL DEFAULT 1,
    created_by VARCHAR(255) REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- USER ASSIGNMENTS
-- ============================================================================

-- User assignments (operator-reviewer-manager relationships)
CREATE TABLE IF NOT EXISTS user_assignments (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
    operator_id VARCHAR(255) REFERENCES users(id),
    reviewer_id VARCHAR(255) REFERENCES users(id),
    manager_id VARCHAR(255) REFERENCES users(id),
    machine_ids TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INITIAL DATA / SEED DATA
-- ============================================================================

-- Insert default roles
INSERT INTO roles (id, name, description, record_status) VALUES
    ('admin-role-id', 'admin', 'System Administrator with full access', 1),
    ('manager-role-id', 'manager', 'Manager with inventory management and reporting', 1),
    ('operator-role-id', 'operator', 'Machine Operator', 1),
    ('reviewer-role-id', 'reviewer', 'Quality Reviewer', 1)
ON CONFLICT (name) DO NOTHING;

-- Insert default admin user
-- Password: Admin@123 (hashed with scrypt)
INSERT INTO users (id, username, password, email, first_name, last_name, role_id, record_status) VALUES
    ('default-admin-id', 'admin', '$scrypt$N=32768,r=8,p=1,maxmem=67108864$ycr0RLrNfIBCiGAKuSzE5g$8zHF7JfYcJxRvYqNdZ1pqxMdQwMzKjN0Lv7Uj8xKzY0', 'admin@kinto.com', 'System', 'Administrator', 'admin-role-id', 1)
ON CONFLICT (username) DO NOTHING;

-- Note: You MUST change the default admin password after first login for security!

-- Insert sample UOM data
INSERT INTO uom (code, name, description, record_status) VALUES
    ('PCS', 'Pieces', 'Individual units', 1),
    ('KG', 'Kilograms', 'Weight in kilograms', 1),
    ('L', 'Liters', 'Volume in liters', 1),
    ('M', 'Meters', 'Length in meters', 1),
    ('SET', 'Set', 'Set of items', 1)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- User indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_record_status ON users(record_status);

-- Machine indexes
CREATE INDEX IF NOT EXISTS idx_machines_status ON machines(status);
CREATE INDEX IF NOT EXISTS idx_machines_record_status ON machines(record_status);

-- Checklist indexes
CREATE INDEX IF NOT EXISTS idx_checklist_submissions_status ON checklist_submissions(status);
CREATE INDEX IF NOT EXISTS idx_checklist_submissions_operator ON checklist_submissions(operator_id);
CREATE INDEX IF NOT EXISTS idx_checklist_submissions_date ON checklist_submissions(date);

-- Spare parts indexes
CREATE INDEX IF NOT EXISTS idx_spare_parts_record_status ON spare_parts_catalog(record_status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_record_status ON purchase_orders(record_status);

-- PM indexes
CREATE INDEX IF NOT EXISTS idx_pm_executions_machine ON pm_executions(machine_id);
CREATE INDEX IF NOT EXISTS idx_pm_executions_completed_at ON pm_executions(completed_at);

-- Inventory indexes
CREATE INDEX IF NOT EXISTS idx_raw_materials_record_status ON raw_materials(record_status);
CREATE INDEX IF NOT EXISTS idx_products_record_status ON products(record_status);
CREATE INDEX IF NOT EXISTS idx_finished_goods_record_status ON finished_goods(record_status);
CREATE INDEX IF NOT EXISTS idx_finished_goods_production_date ON finished_goods(production_date);

-- ============================================================================
-- COMMENTS & DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE roles IS 'Dynamic role definitions with customizable permissions';
COMMENT ON TABLE role_permissions IS 'Screen-level permission matrix for each role';
COMMENT ON TABLE users IS 'User accounts with email/password authentication';
COMMENT ON TABLE machines IS 'Equipment and machine registry';
COMMENT ON TABLE checklist_templates IS 'Reusable QA checklist templates';
COMMENT ON TABLE checklist_submissions IS 'Completed QA checklists';
COMMENT ON TABLE spare_parts_catalog IS 'Spare parts inventory';
COMMENT ON TABLE purchase_orders IS 'Purchase order management';
COMMENT ON TABLE pm_task_list_templates IS 'Preventive maintenance task templates';
COMMENT ON TABLE maintenance_plans IS 'Scheduled maintenance plans';
COMMENT ON TABLE pm_executions IS 'Preventive maintenance execution history';
COMMENT ON TABLE uom IS 'Units of measurement';
COMMENT ON TABLE products IS 'Product master data';
COMMENT ON TABLE raw_materials IS 'Raw material inventory';
COMMENT ON TABLE raw_material_transactions IS 'Day-wise raw material transactions';
COMMENT ON TABLE finished_goods IS 'Finished goods production records';

COMMENT ON COLUMN users.record_status IS '1=Active, 0=Deleted (soft delete)';
COMMENT ON COLUMN machines.record_status IS '1=Active, 0=Deleted (soft delete)';
COMMENT ON COLUMN spare_parts_catalog.record_status IS '1=Active, 0=Deleted (soft delete)';
COMMENT ON COLUMN purchase_orders.record_status IS '1=Active, 0=Deleted (soft delete)';
COMMENT ON COLUMN raw_materials.record_status IS '1=Active, 0=Deleted (soft delete)';
COMMENT ON COLUMN products.record_status IS '1=Active, 0=Deleted (soft delete)';
COMMENT ON COLUMN finished_goods.record_status IS '1=Active, 0=Deleted (soft delete)';

-- End of schema
