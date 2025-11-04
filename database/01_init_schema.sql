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
