-- KINTO QA Management System - Database Schema
-- PostgreSQL 13+
-- Version: 1.0.0
-- Date: 2025-11-04

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ===========================================
-- SESSION MANAGEMENT
-- ===========================================

CREATE TABLE IF NOT EXISTS sessions (
    sid VARCHAR PRIMARY KEY,
    sess JSONB NOT NULL,
    expire TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON sessions(expire);

-- ===========================================
-- ROLE MANAGEMENT
-- ===========================================

CREATE TABLE IF NOT EXISTS roles (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    permissions TEXT[],
    record_status INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Role Permissions - defines granular screen access
CREATE TABLE IF NOT EXISTS role_permissions (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id VARCHAR NOT NULL REFERENCES roles(id),
    screen_key VARCHAR(100) NOT NULL,
    can_view INTEGER DEFAULT 0 NOT NULL,
    can_create INTEGER DEFAULT 0 NOT NULL,
    can_edit INTEGER DEFAULT 0 NOT NULL,
    can_delete INTEGER DEFAULT 0 NOT NULL,
    record_status INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================
-- USER MANAGEMENT
-- ===========================================

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(255) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    email VARCHAR UNIQUE,
    first_name VARCHAR,
    last_name VARCHAR,
    profile_image_url VARCHAR,
    role_id VARCHAR REFERENCES roles(id),
    reset_token VARCHAR(255),
    reset_token_expiry TIMESTAMP,
    record_status INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================
-- MACHINE MANAGEMENT
-- ===========================================

CREATE TABLE IF NOT EXISTS machine_types (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    manufacturer VARCHAR(255),
    model_number VARCHAR(255),
    specifications JSONB,
    record_status INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS machines (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active',
    installation_date TIMESTAMP,
    last_maintenance TIMESTAMP,
    next_pm_due TIMESTAMP,
    record_status INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================
-- CHECKLIST MANAGEMENT
-- ===========================================

CREATE TABLE IF NOT EXISTS checklist_templates (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    machine_id VARCHAR REFERENCES machines(id),
    shift_types TEXT[],
    created_by VARCHAR REFERENCES users(id),
    record_status INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS template_tasks (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id VARCHAR NOT NULL REFERENCES checklist_templates(id),
    task_name VARCHAR(255) NOT NULL,
    verification_criteria TEXT,
    order_index INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS checklist_submissions (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id VARCHAR NOT NULL REFERENCES checklist_templates(id),
    machine_id VARCHAR REFERENCES machines(id),
    operator_id VARCHAR NOT NULL REFERENCES users(id),
    reviewer_id VARCHAR REFERENCES users(id),
    manager_id VARCHAR REFERENCES users(id),
    shift_type VARCHAR(50),
    submission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewer_status VARCHAR(50) DEFAULT 'pending',
    manager_status VARCHAR(50) DEFAULT 'pending',
    comments TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS submission_tasks (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id VARCHAR NOT NULL REFERENCES checklist_submissions(id),
    task_id VARCHAR NOT NULL REFERENCES template_tasks(id),
    status VARCHAR(50) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================
-- SPARE PARTS MANAGEMENT
-- ===========================================

CREATE TABLE IF NOT EXISTS spare_parts_catalog (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    part_name VARCHAR(255) NOT NULL,
    part_number VARCHAR(255),
    category VARCHAR(255),
    unit_price NUMERIC(10,2),
    reorder_threshold INTEGER,
    current_stock INTEGER DEFAULT 0,
    record_status INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS machine_spares (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_id VARCHAR NOT NULL REFERENCES machines(id),
    spare_part_id VARCHAR NOT NULL REFERENCES spare_parts_catalog(id),
    quantity_required INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS required_spares (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    maintenance_id VARCHAR NOT NULL,
    spare_part_id VARCHAR NOT NULL REFERENCES spare_parts_catalog(id),
    quantity INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================
-- PURCHASE ORDER MANAGEMENT
-- ===========================================

CREATE TABLE IF NOT EXISTS purchase_orders (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    po_number VARCHAR(100) UNIQUE NOT NULL,
    supplier_name VARCHAR(255) NOT NULL,
    supplier_contact VARCHAR(255),
    spare_parts JSONB,
    total_amount NUMERIC(12,2),
    status VARCHAR(50) DEFAULT 'draft',
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expected_delivery TIMESTAMP,
    created_by VARCHAR REFERENCES users(id),
    record_status INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================
-- PREVENTIVE MAINTENANCE
-- ===========================================

CREATE TABLE IF NOT EXISTS maintenance_plans (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_id VARCHAR NOT NULL REFERENCES machines(id),
    plan_name VARCHAR(255) NOT NULL,
    frequency VARCHAR(50) NOT NULL,
    description TEXT,
    last_execution TIMESTAMP,
    next_execution TIMESTAMP,
    record_status INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pm_task_list_templates (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    machine_type_id VARCHAR REFERENCES machine_types(id),
    description TEXT,
    estimated_duration INTEGER,
    record_status INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pm_template_tasks (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id VARCHAR NOT NULL REFERENCES pm_task_list_templates(id),
    task_name VARCHAR(255) NOT NULL,
    description TEXT,
    estimated_time INTEGER,
    order_index INTEGER NOT NULL,
    tools_required TEXT[],
    safety_requirements TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pm_executions (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    maintenance_plan_id VARCHAR NOT NULL REFERENCES maintenance_plans(id),
    machine_id VARCHAR NOT NULL REFERENCES machines(id),
    template_id VARCHAR REFERENCES pm_task_list_templates(id),
    operator_id VARCHAR NOT NULL REFERENCES users(id),
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    status VARCHAR(50) DEFAULT 'in_progress',
    total_downtime INTEGER,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pm_execution_tasks (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id VARCHAR NOT NULL REFERENCES pm_executions(id),
    template_task_id VARCHAR REFERENCES pm_template_tasks(id),
    task_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    completion_time TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS maintenance_history (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_id VARCHAR NOT NULL REFERENCES machines(id),
    maintenance_type VARCHAR(100) NOT NULL,
    performed_by VARCHAR REFERENCES users(id),
    performed_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    duration_minutes INTEGER,
    notes TEXT,
    spare_parts_used JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================
-- USER ASSIGNMENTS
-- ===========================================

CREATE TABLE IF NOT EXISTS user_assignments (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR NOT NULL REFERENCES users(id),
    machine_id VARCHAR NOT NULL REFERENCES machines(id),
    shift VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================
-- INVENTORY MANAGEMENT
-- ===========================================

CREATE TABLE IF NOT EXISTS uom (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    record_status INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    product_code VARCHAR(100) NOT NULL UNIQUE,
    product_name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    uom_id VARCHAR REFERENCES uom(id),
    standard_cost NUMERIC(12,2),
    record_status INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS raw_materials (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    material_code VARCHAR(100) NOT NULL UNIQUE,
    material_name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    uom_id VARCHAR REFERENCES uom(id),
    product_id VARCHAR REFERENCES products(id),
    unit_cost NUMERIC(12,2),
    reorder_level INTEGER,
    current_stock INTEGER DEFAULT 0,
    record_status INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS raw_material_transactions (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id VARCHAR NOT NULL REFERENCES raw_materials(id),
    transaction_type VARCHAR(50) NOT NULL,
    quantity INTEGER NOT NULL,
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reference_number VARCHAR(100),
    performed_by VARCHAR REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS finished_goods (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id VARCHAR NOT NULL REFERENCES products(id),
    machine_id VARCHAR REFERENCES machines(id),
    quantity INTEGER NOT NULL,
    production_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    shift VARCHAR(50),
    operator_id VARCHAR REFERENCES users(id),
    quality_status VARCHAR(50) DEFAULT 'passed',
    batch_number VARCHAR(100),
    notes TEXT,
    record_status INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================
-- VENDOR MASTER
-- ===========================================

CREATE TABLE IF NOT EXISTS vendors (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_code VARCHAR(100) NOT NULL UNIQUE,
    vendor_name VARCHAR(255) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(20),
    gst_number VARCHAR(20),
    aadhaar_number VARCHAR(20),
    mobile_number VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    contact_person VARCHAR(255),
    vendor_type VARCHAR(50),
    is_active VARCHAR DEFAULT 'true',
    record_status INTEGER DEFAULT 1 NOT NULL,
    created_by VARCHAR REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================
-- RAW MATERIAL ISSUANCE (HEADER-DETAIL PATTERN)
-- ===========================================

CREATE TABLE IF NOT EXISTS raw_material_issuance (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    issuance_number VARCHAR(100) NOT NULL UNIQUE,
    issuance_date TIMESTAMP NOT NULL,
    issued_to VARCHAR(255),
    product_id VARCHAR REFERENCES products(id),
    remarks TEXT,
    record_status INTEGER DEFAULT 1 NOT NULL,
    issued_by VARCHAR REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS raw_material_issuance_items (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    issuance_id VARCHAR NOT NULL REFERENCES raw_material_issuance(id),
    raw_material_id VARCHAR NOT NULL REFERENCES raw_materials(id),
    product_id VARCHAR NOT NULL REFERENCES products(id),
    quantity_issued INTEGER NOT NULL,
    uom_id VARCHAR REFERENCES uom(id),
    remarks TEXT,
    record_status INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================
-- GATEPASSES (HEADER-DETAIL PATTERN)
-- ===========================================

CREATE TABLE IF NOT EXISTS gatepasses (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    gatepass_number VARCHAR(100) NOT NULL UNIQUE,
    gatepass_date TIMESTAMP NOT NULL,
    vehicle_number VARCHAR(50) NOT NULL,
    driver_name VARCHAR(255) NOT NULL,
    driver_contact VARCHAR(50),
    transporter_name VARCHAR(255),
    destination VARCHAR(255),
    vendor_id VARCHAR REFERENCES vendors(id),
    customer_name VARCHAR(255),
    invoice_number VARCHAR(100),
    remarks TEXT,
    record_status INTEGER DEFAULT 1 NOT NULL,
    issued_by VARCHAR REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS gatepass_items (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    gatepass_id VARCHAR NOT NULL REFERENCES gatepasses(id),
    finished_good_id VARCHAR NOT NULL REFERENCES finished_goods(id),
    product_id VARCHAR NOT NULL REFERENCES products(id),
    quantity_dispatched INTEGER NOT NULL,
    uom_id VARCHAR REFERENCES uom(id),
    remarks TEXT,
    record_status INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================
-- INDEXES FOR PERFORMANCE
-- ===========================================

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_machines_status ON machines(status);
CREATE INDEX IF NOT EXISTS idx_machines_type ON machines(type);
CREATE INDEX IF NOT EXISTS idx_checklist_templates_machine_id ON checklist_templates(machine_id);
CREATE INDEX IF NOT EXISTS idx_checklist_submissions_operator_id ON checklist_submissions(operator_id);
CREATE INDEX IF NOT EXISTS idx_checklist_submissions_reviewer_id ON checklist_submissions(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_checklist_submissions_manager_id ON checklist_submissions(manager_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_plans_machine_id ON maintenance_plans(machine_id);
CREATE INDEX IF NOT EXISTS idx_pm_executions_machine_id ON pm_executions(machine_id);
CREATE INDEX IF NOT EXISTS idx_raw_materials_product_id ON raw_materials(product_id);
CREATE INDEX IF NOT EXISTS idx_raw_material_transactions_material_id ON raw_material_transactions(material_id);
CREATE INDEX IF NOT EXISTS idx_finished_goods_product_id ON finished_goods(product_id);
CREATE INDEX IF NOT EXISTS idx_finished_goods_machine_id ON finished_goods(machine_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);

-- Vendor and transaction indexes
CREATE INDEX IF NOT EXISTS idx_vendors_vendor_code ON vendors(vendor_code);
CREATE INDEX IF NOT EXISTS idx_vendors_vendor_name ON vendors(vendor_name);
CREATE INDEX IF NOT EXISTS idx_vendors_mobile_number ON vendors(mobile_number);
CREATE INDEX IF NOT EXISTS idx_vendors_record_status ON vendors(record_status);

CREATE INDEX IF NOT EXISTS idx_raw_material_issuance_number ON raw_material_issuance(issuance_number);
CREATE INDEX IF NOT EXISTS idx_raw_material_issuance_date ON raw_material_issuance(issuance_date);
CREATE INDEX IF NOT EXISTS idx_raw_material_issuance_product_id ON raw_material_issuance(product_id);

CREATE INDEX IF NOT EXISTS idx_raw_material_issuance_items_issuance_id ON raw_material_issuance_items(issuance_id);
CREATE INDEX IF NOT EXISTS idx_raw_material_issuance_items_raw_material_id ON raw_material_issuance_items(raw_material_id);
CREATE INDEX IF NOT EXISTS idx_raw_material_issuance_items_product_id ON raw_material_issuance_items(product_id);

CREATE INDEX IF NOT EXISTS idx_gatepasses_gatepass_number ON gatepasses(gatepass_number);
CREATE INDEX IF NOT EXISTS idx_gatepasses_gatepass_date ON gatepasses(gatepass_date);
CREATE INDEX IF NOT EXISTS idx_gatepasses_vendor_id ON gatepasses(vendor_id);

CREATE INDEX IF NOT EXISTS idx_gatepass_items_gatepass_id ON gatepass_items(gatepass_id);
CREATE INDEX IF NOT EXISTS idx_gatepass_items_finished_good_id ON gatepass_items(finished_good_id);
CREATE INDEX IF NOT EXISTS idx_gatepass_items_product_id ON gatepass_items(product_id);

-- ===========================================
-- COMMENTS FOR DOCUMENTATION
-- ===========================================

COMMENT ON TABLE roles IS 'Dynamic role definitions with permissions';
COMMENT ON TABLE role_permissions IS 'Granular screen-level permissions for each role';
COMMENT ON TABLE users IS 'User accounts with email/password authentication';
COMMENT ON TABLE machines IS 'Manufacturing equipment registry';
COMMENT ON TABLE checklist_templates IS 'Reusable QA checklist templates';
COMMENT ON TABLE maintenance_plans IS 'Preventive maintenance scheduling';
COMMENT ON TABLE purchase_orders IS 'Spare parts purchase orders';
COMMENT ON TABLE raw_materials IS 'Raw material inventory';
COMMENT ON TABLE finished_goods IS 'Production output tracking';
COMMENT ON TABLE vendors IS 'Vendor/Customer master data for gatepasses';
COMMENT ON TABLE raw_material_issuance IS 'Raw material issuance header - multi-item transactions';
COMMENT ON TABLE raw_material_issuance_items IS 'Line items for raw material issuance (header-detail pattern)';
COMMENT ON TABLE gatepasses IS 'Gatepass header for finished goods dispatch - multi-item transactions';
COMMENT ON TABLE gatepass_items IS 'Line items for gatepasses (header-detail pattern)';
COMMENT ON COLUMN users.record_status IS '1=active, 0=deleted (soft delete)';
COMMENT ON COLUMN machines.record_status IS '1=active, 0=deleted (soft delete)';
COMMENT ON COLUMN vendors.vendor_type IS 'Type: supplier, customer, transporter, etc.';
COMMENT ON COLUMN vendors.record_status IS '1=active, 0=deleted (soft delete)';
COMMENT ON COLUMN gatepasses.vendor_id IS 'References vendor master (preferred)';
COMMENT ON COLUMN gatepasses.customer_name IS 'Backward compatibility - auto-populated from vendor';

-- End of schema
