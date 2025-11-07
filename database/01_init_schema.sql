-- KINTO QA Management System - Database Schema
-- PostgreSQL 14+
-- Run this script to create all tables

-- =====================================================
-- SESSIONS TABLE (for authentication)
-- =====================================================
CREATE TABLE IF NOT EXISTS sessions (
    sid VARCHAR NOT NULL PRIMARY KEY,
    sess JSONB NOT NULL,
    expire TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions (expire);

-- =====================================================
-- ROLES TABLE (for role-based access control)
-- =====================================================
CREATE TABLE IF NOT EXISTS roles (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    permissions TEXT[],
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- USERS TABLE (email/password authentication)
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(255) NOT NULL UNIQUE,
    password TEXT NOT NULL,
    email VARCHAR(255) UNIQUE,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    profile_image_url VARCHAR(255),
    role_id VARCHAR REFERENCES roles(id),
    reset_token VARCHAR(255),
    reset_token_expiry TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- MACHINE TYPES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS machine_types (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    category VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- MACHINES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS machines (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active',
    installation_date TIMESTAMP,
    last_maintenance TIMESTAMP,
    next_pm_due TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- CHECKLIST TEMPLATES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS checklist_templates (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    machine_id VARCHAR REFERENCES machines(id),
    shift_types TEXT[],
    created_by VARCHAR REFERENCES users(id),
    is_active VARCHAR DEFAULT 'true',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- TEMPLATE TASKS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS template_tasks (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id VARCHAR REFERENCES checklist_templates(id),
    task_name VARCHAR(255) NOT NULL,
    verification_criteria TEXT,
    order_index INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- CHECKLIST SUBMISSIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS checklist_submissions (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id VARCHAR REFERENCES checklist_templates(id),
    machine_id VARCHAR REFERENCES machines(id),
    operator_id VARCHAR REFERENCES users(id),
    reviewer_id VARCHAR REFERENCES users(id),
    manager_id VARCHAR REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'pending',
    date TIMESTAMP NOT NULL,
    shift VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- SUBMISSION TASKS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS submission_tasks (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id VARCHAR REFERENCES checklist_submissions(id),
    task_name VARCHAR(255) NOT NULL,
    result VARCHAR(50) DEFAULT 'pending',
    photo_url VARCHAR(255),
    notes TEXT,
    order_index INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- SPARE PARTS CATALOG TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS spare_parts_catalog (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    part_name VARCHAR(255) NOT NULL,
    part_number VARCHAR(100),
    category VARCHAR(100),
    unit_price NUMERIC(10,2),
    reorder_threshold INTEGER,
    current_stock INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- MACHINE SPARES TABLE (many-to-many relationship)
-- =====================================================
CREATE TABLE IF NOT EXISTS machine_spares (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_id VARCHAR REFERENCES machines(id),
    spare_part_id VARCHAR REFERENCES spare_parts_catalog(id),
    urgency_level VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- PURCHASE ORDERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS purchase_orders (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    po_number VARCHAR(100) UNIQUE,
    spare_part_id VARCHAR REFERENCES spare_parts_catalog(id),
    quantity INTEGER NOT NULL,
    unit_price NUMERIC(10,2),
    total_amount NUMERIC(10,2),
    status VARCHAR(50) DEFAULT 'pending',
    requested_by VARCHAR REFERENCES users(id),
    approved_by VARCHAR REFERENCES users(id),
    vendor_name VARCHAR(255),
    expected_delivery_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- MAINTENANCE PLANS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS maintenance_plans (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_id VARCHAR REFERENCES machines(id),
    task_list_template_id VARCHAR,
    frequency VARCHAR(50),
    next_due_date TIMESTAMP,
    last_completed_date TIMESTAMP,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- PM TASK LIST TEMPLATES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS pm_task_list_templates (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    machine_type VARCHAR(255),
    estimated_duration_minutes INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- PM TEMPLATE TASKS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS pm_template_tasks (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id VARCHAR REFERENCES pm_task_list_templates(id),
    task_description TEXT NOT NULL,
    order_index INTEGER,
    required_tools TEXT,
    safety_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- PM EXECUTIONS TABLE (history of completed PM)
-- =====================================================
CREATE TABLE IF NOT EXISTS pm_executions (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    maintenance_plan_id VARCHAR REFERENCES maintenance_plans(id),
    executed_by VARCHAR REFERENCES users(id),
    execution_date TIMESTAMP NOT NULL,
    duration_minutes INTEGER,
    status VARCHAR(50) DEFAULT 'completed',
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- PM EXECUTION TASKS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS pm_execution_tasks (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id VARCHAR REFERENCES pm_executions(id),
    task_description TEXT NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    notes TEXT,
    order_index INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- VENDOR MASTER
-- =====================================================
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
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- RAW MATERIAL ISSUANCE (HEADER-DETAIL PATTERN)
-- =====================================================
CREATE TABLE IF NOT EXISTS raw_material_issuance (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    issuance_number VARCHAR(100) NOT NULL UNIQUE,
    issuance_date TIMESTAMP NOT NULL,
    issued_to VARCHAR(255),
    product_id VARCHAR REFERENCES products(id),
    remarks TEXT,
    record_status INTEGER DEFAULT 1 NOT NULL,
    issued_by VARCHAR REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
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
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- GATEPASSES (HEADER-DETAIL PATTERN)
-- =====================================================
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
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
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
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- INDEXES for Performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_machines_status ON machines(status);
CREATE INDEX IF NOT EXISTS idx_checklist_submissions_status ON checklist_submissions(status);
CREATE INDEX IF NOT EXISTS idx_checklist_submissions_date ON checklist_submissions(date);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_plans_next_due ON maintenance_plans(next_due_date);

-- Vendor and transaction indexes
CREATE INDEX IF NOT EXISTS idx_vendors_vendor_code ON vendors(vendor_code);
CREATE INDEX IF NOT EXISTS idx_vendors_vendor_name ON vendors(vendor_name);
CREATE INDEX IF NOT EXISTS idx_vendors_mobile_number ON vendors(mobile_number);
CREATE INDEX IF NOT EXISTS idx_raw_material_issuance_number ON raw_material_issuance(issuance_number);
CREATE INDEX IF NOT EXISTS idx_raw_material_issuance_date ON raw_material_issuance(issuance_date);
CREATE INDEX IF NOT EXISTS idx_raw_material_issuance_items_issuance_id ON raw_material_issuance_items(issuance_id);
CREATE INDEX IF NOT EXISTS idx_gatepasses_gatepass_number ON gatepasses(gatepass_number);
CREATE INDEX IF NOT EXISTS idx_gatepasses_gatepass_date ON gatepasses(gatepass_date);
CREATE INDEX IF NOT EXISTS idx_gatepasses_vendor_id ON gatepasses(vendor_id);
CREATE INDEX IF NOT EXISTS idx_gatepass_items_gatepass_id ON gatepass_items(gatepass_id);
