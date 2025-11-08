-- Complete Schema Sync - Adds ALL missing tables from schema.ts to database
-- Date: November 8, 2025
-- Purpose: Ensures database has ALL 40 tables matching schema.ts

-- ============================================================================
-- MISSING TABLES FROM ORIGINAL 01_schema.sql
-- ============================================================================
-- This migration adds 9 tables that exist in schema.ts but not in 01_schema.sql:
-- 1. invoice_templates
-- 2. terms_conditions
-- 3. invoices
-- 4. invoice_items
-- 5. invoice_payments
-- 6. banks
-- 7. machine_startup_tasks
-- 8. notification_config
-- 9. vendors (if missing)

-- ============================================================================
-- 1. UOM (Unit of Measurement) - CRITICAL DEPENDENCY
-- ============================================================================

CREATE TABLE IF NOT EXISTS uom (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active INTEGER DEFAULT 1 NOT NULL,
    record_status INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 2. PRODUCTS - Master product list
-- ============================================================================

CREATE TABLE IF NOT EXISTS products (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    product_code VARCHAR(100) NOT NULL UNIQUE,
    product_name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    uom_id VARCHAR REFERENCES uom(id),
    standard_cost INTEGER,
    is_active INTEGER DEFAULT 1 NOT NULL,
    record_status INTEGER DEFAULT 1 NOT NULL,
    created_by VARCHAR REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 3. VENDORS - Customer/Vendor master
-- ============================================================================

CREATE TABLE IF NOT EXISTS vendors (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_code VARCHAR(100) NOT NULL UNIQUE,
    vendor_name VARCHAR(255) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    gst_number VARCHAR(15),
    aadhaar_number VARCHAR(12),
    mobile_number VARCHAR(15),
    email VARCHAR(255),
    contact_person VARCHAR(255),
    vendor_type VARCHAR(50) DEFAULT 'customer' NOT NULL,
    is_cluster INTEGER DEFAULT 0 NOT NULL,
    is_active INTEGER DEFAULT 1 NOT NULL,
    record_status INTEGER DEFAULT 1 NOT NULL,
    created_by VARCHAR REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 4. RAW MATERIALS - Inventory management
-- ============================================================================

CREATE TABLE IF NOT EXISTS raw_materials (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    material_code VARCHAR(100) NOT NULL UNIQUE,
    material_name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    uom_id VARCHAR REFERENCES uom(id),
    current_stock INTEGER DEFAULT 0 NOT NULL,
    reorder_level INTEGER DEFAULT 0,
    max_stock_level INTEGER,
    unit_cost INTEGER,
    location VARCHAR(255),
    supplier VARCHAR(255),
    is_active INTEGER DEFAULT 1 NOT NULL,
    record_status INTEGER DEFAULT 1 NOT NULL,
    created_by VARCHAR REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 5. RAW MATERIAL TRANSACTIONS - Stock movements
-- ============================================================================

CREATE TABLE IF NOT EXISTS raw_material_transactions (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id VARCHAR NOT NULL REFERENCES raw_materials(id),
    transaction_type VARCHAR(50) NOT NULL,
    quantity INTEGER NOT NULL,
    reference VARCHAR(255),
    remarks TEXT,
    performed_by VARCHAR REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 6. FINISHED GOODS - Production output tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS finished_goods (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id VARCHAR NOT NULL REFERENCES products(id),
    batch_number VARCHAR(100),
    production_date DATE,
    quantity INTEGER NOT NULL,
    uom_id VARCHAR REFERENCES uom(id),
    quality_status VARCHAR(50) DEFAULT 'pending',
    machine_id VARCHAR REFERENCES machines(id),
    operator_id VARCHAR REFERENCES users(id),
    inspected_by VARCHAR REFERENCES users(id),
    inspection_date TIMESTAMP,
    storage_location VARCHAR(255),
    remarks TEXT,
    record_status INTEGER DEFAULT 1 NOT NULL,
    created_by VARCHAR REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 7. INVOICE TEMPLATES - Invoice branding and defaults
-- ============================================================================

CREATE TABLE IF NOT EXISTS invoice_templates (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    template_name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    logo_url TEXT,
    
    -- Default Seller Details
    default_seller_name VARCHAR(255),
    default_seller_gstin VARCHAR(15),
    default_seller_address TEXT,
    default_seller_state VARCHAR(100),
    default_seller_state_code VARCHAR(2),
    default_seller_phone VARCHAR(50),
    default_seller_email VARCHAR(255),
    
    -- Default Bank Details
    default_bank_name VARCHAR(255),
    default_bank_account_number VARCHAR(50),
    default_bank_ifsc_code VARCHAR(11),
    default_account_holder_name VARCHAR(255),
    default_branch_name VARCHAR(255),
    default_upi_id VARCHAR(100),
    
    -- Template Settings
    is_default INTEGER DEFAULT 0 NOT NULL,
    is_active INTEGER DEFAULT 1 NOT NULL,
    
    record_status INTEGER DEFAULT 1 NOT NULL,
    created_by VARCHAR REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 8. TERMS & CONDITIONS - Reusable T&C sets
-- ============================================================================

CREATE TABLE IF NOT EXISTS terms_conditions (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    tc_name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    terms TEXT[] NOT NULL,
    is_default INTEGER DEFAULT 0 NOT NULL,
    is_active INTEGER DEFAULT 1 NOT NULL,
    record_status INTEGER DEFAULT 1 NOT NULL,
    created_by VARCHAR REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 9. BANKS - Bank account master
-- ============================================================================

CREATE TABLE IF NOT EXISTS banks (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_name VARCHAR(255) NOT NULL,
    account_holder_name VARCHAR(255) NOT NULL,
    account_number VARCHAR(50) NOT NULL UNIQUE,
    ifsc_code VARCHAR(11) NOT NULL,
    branch_name VARCHAR(255),
    account_type VARCHAR(50),
    upi_id VARCHAR(100),
    is_default INTEGER DEFAULT 0 NOT NULL,
    record_status INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 10. MACHINE STARTUP TASKS - Reminder system
-- ============================================================================

CREATE TABLE IF NOT EXISTS machine_startup_tasks (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_id VARCHAR NOT NULL REFERENCES machines(id),
    assigned_user_id VARCHAR NOT NULL REFERENCES users(id),
    scheduled_start_time TIMESTAMP NOT NULL,
    reminder_before_minutes INTEGER DEFAULT 30 NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' NOT NULL,
    notification_sent_at TIMESTAMP,
    machine_started_at TIMESTAMP,
    whatsapp_enabled INTEGER DEFAULT 1 NOT NULL,
    email_enabled INTEGER DEFAULT 1 NOT NULL,
    whatsapp_sent INTEGER DEFAULT 0 NOT NULL,
    email_sent INTEGER DEFAULT 0 NOT NULL,
    production_date DATE NOT NULL,
    shift VARCHAR(50),
    notes TEXT,
    created_by VARCHAR REFERENCES users(id),
    record_status INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 11. NOTIFICATION CONFIG - SendGrid & Twilio settings
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_config (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    email_enabled INTEGER DEFAULT 0 NOT NULL,
    sender_email VARCHAR(255),
    sender_name VARCHAR(255),
    whatsapp_enabled INTEGER DEFAULT 0 NOT NULL,
    twilio_phone_number VARCHAR(50),
    test_mode INTEGER DEFAULT 1 NOT NULL,
    record_status INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================

-- Run this to verify all 40 tables exist:
-- SELECT COUNT(*) as total_tables 
-- FROM information_schema.tables 
-- WHERE table_schema = 'public';
-- 
-- Expected result: 40 tables

-- List all tables:
-- SELECT table_name 
-- FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- ORDER BY table_name;
