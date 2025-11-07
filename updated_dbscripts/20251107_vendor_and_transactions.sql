-- KINTO QA Management System - Vendor Master and Transaction Tables
-- PostgreSQL 13+
-- Date: 2025-11-07
-- Description: Adds vendor master, raw material issuance, and gatepass functionality

-- ===========================================
-- VENDOR MASTER TABLE
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

COMMENT ON TABLE vendors IS 'Vendor/Customer master data for gatepasses';
COMMENT ON COLUMN vendors.vendor_type IS 'Type: supplier, customer, transporter, etc.';
COMMENT ON COLUMN vendors.record_status IS '1=active, 0=deleted (soft delete)';

-- ===========================================
-- RAW MATERIAL ISSUANCE (HEADER)
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

COMMENT ON TABLE raw_material_issuance IS 'Raw material issuance header - multi-item transactions';
COMMENT ON COLUMN raw_material_issuance.product_id IS 'Product being manufactured (optional context)';

-- ===========================================
-- RAW MATERIAL ISSUANCE ITEMS (DETAIL)
-- ===========================================

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

COMMENT ON TABLE raw_material_issuance_items IS 'Line items for raw material issuance (header-detail pattern)';

-- ===========================================
-- GATEPASSES (HEADER)
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

COMMENT ON TABLE gatepasses IS 'Gatepass header for finished goods dispatch - multi-item transactions';
COMMENT ON COLUMN gatepasses.vendor_id IS 'References vendor master (preferred)';
COMMENT ON COLUMN gatepasses.customer_name IS 'Backward compatibility - auto-populated from vendor';

-- ===========================================
-- GATEPASS ITEMS (DETAIL)
-- ===========================================

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

COMMENT ON TABLE gatepass_items IS 'Line items for gatepasses (header-detail pattern)';

-- ===========================================
-- INDEXES FOR PERFORMANCE
-- ===========================================

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

-- End of vendor and transaction tables migration
