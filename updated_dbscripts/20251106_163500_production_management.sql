-- Production Management System - Database Scripts
-- Created: November 06, 2025 16:35:00
-- Description: Raw Material Issuance and Gatepass Management tables

-- =====================================================
-- TABLE: raw_material_issuance
-- Description: Tracks raw material issued for production
-- =====================================================
CREATE TABLE IF NOT EXISTS raw_material_issuance (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    raw_material_id VARCHAR NOT NULL REFERENCES raw_materials(id),
    quantity_issued NUMERIC(10, 2) NOT NULL CHECK (quantity_issued > 0),
    uom_id VARCHAR REFERENCES uom(id),
    product_id VARCHAR REFERENCES products(id),
    batch_number VARCHAR,
    issuance_date DATE NOT NULL,
    remarks TEXT,
    issued_by VARCHAR REFERENCES users(id),
    record_status INTEGER DEFAULT 1 CHECK (record_status IN (0, 1)),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_raw_material_issuance_raw_material ON raw_material_issuance(raw_material_id);
CREATE INDEX IF NOT EXISTS idx_raw_material_issuance_product ON raw_material_issuance(product_id);
CREATE INDEX IF NOT EXISTS idx_raw_material_issuance_date ON raw_material_issuance(issuance_date);
CREATE INDEX IF NOT EXISTS idx_raw_material_issuance_status ON raw_material_issuance(record_status);

COMMENT ON TABLE raw_material_issuance IS 'Tracks raw materials issued for production with automatic inventory deduction';
COMMENT ON COLUMN raw_material_issuance.quantity_issued IS 'Quantity of raw material issued (auto-deducts from raw_materials.current_stock)';
COMMENT ON COLUMN raw_material_issuance.issuance_date IS 'Date when material was issued for production';
COMMENT ON COLUMN raw_material_issuance.batch_number IS 'Production batch number for traceability';

-- =====================================================
-- TABLE: gatepasses
-- Description: Tracks finished goods dispatch gatepasses
-- =====================================================
CREATE TABLE IF NOT EXISTS gatepasses (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    gatepass_number VARCHAR UNIQUE NOT NULL,
    finished_goods_id VARCHAR NOT NULL REFERENCES finished_goods(id),
    quantity_dispatched NUMERIC(10, 2) NOT NULL CHECK (quantity_dispatched > 0),
    uom_id VARCHAR REFERENCES uom(id),
    vehicle_number VARCHAR NOT NULL,
    driver_name VARCHAR NOT NULL,
    driver_phone VARCHAR,
    destination TEXT NOT NULL,
    customer_name VARCHAR,
    dispatch_date DATE NOT NULL,
    remarks TEXT,
    issued_by VARCHAR REFERENCES users(id),
    record_status INTEGER DEFAULT 1 CHECK (record_status IN (0, 1)),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_gatepasses_finished_goods ON gatepasses(finished_goods_id);
CREATE INDEX IF NOT EXISTS idx_gatepasses_gatepass_number ON gatepasses(gatepass_number);
CREATE INDEX IF NOT EXISTS idx_gatepasses_dispatch_date ON gatepasses(dispatch_date);
CREATE INDEX IF NOT EXISTS idx_gatepasses_vehicle ON gatepasses(vehicle_number);
CREATE INDEX IF NOT EXISTS idx_gatepasses_status ON gatepasses(record_status);

COMMENT ON TABLE gatepasses IS 'Tracks finished goods dispatch with vehicle and driver details';
COMMENT ON COLUMN gatepasses.gatepass_number IS 'Unique gatepass reference number (auto-generated)';
COMMENT ON COLUMN gatepasses.quantity_dispatched IS 'Quantity dispatched (auto-deducts from finished_goods.quantity)';
COMMENT ON COLUMN gatepasses.vehicle_number IS 'Vehicle registration number for dispatch';
COMMENT ON COLUMN gatepasses.destination IS 'Delivery destination address';

-- =====================================================
-- SAMPLE DATA (Optional - for testing)
-- =====================================================

-- Note: These are sample inserts for testing. 
-- In production, data will be created through the application UI.

-- Example Raw Material Issuance (requires existing raw materials, products, users)
-- INSERT INTO raw_material_issuance (
--     raw_material_id,
--     quantity_issued,
--     uom_id,
--     product_id,
--     batch_number,
--     issuance_date,
--     remarks,
--     issued_by
-- ) VALUES (
--     'existing-raw-material-id',
--     100.00,
--     'existing-uom-id',
--     'existing-product-id',
--     'BATCH-2025-001',
--     CURRENT_DATE,
--     'Material issued for production batch 001',
--     'existing-user-id'
-- );

-- Example Gatepass (requires existing finished goods, users)
-- INSERT INTO gatepasses (
--     gatepass_number,
--     finished_goods_id,
--     quantity_dispatched,
--     uom_id,
--     vehicle_number,
--     driver_name,
--     driver_phone,
--     destination,
--     customer_name,
--     dispatch_date,
--     remarks,
--     issued_by
-- ) VALUES (
--     'GP-2025-001',
--     'existing-finished-goods-id',
--     50.00,
--     'existing-uom-id',
--     'MH-01-AB-1234',
--     'Rajesh Kumar',
--     '9876543210',
--     'Mumbai Warehouse, Andheri East',
--     'ABC Industries Ltd',
--     CURRENT_DATE,
--     'Urgent delivery',
--     'existing-user-id'
-- );

-- =====================================================
-- MIGRATION NOTES
-- =====================================================
-- 1. Run: npm run db:push (or npm run db:push --force if needed)
-- 2. Tables will be created automatically by Drizzle ORM
-- 3. No manual SQL execution needed in normal workflow
-- 4. This script is for reference and manual database setup if needed

-- =====================================================
-- AUTO-DEDUCTION LOGIC (Handled by Application)
-- =====================================================
-- Raw Material Issuance:
--   - When created: raw_materials.current_stock -= quantity_issued
--   - Validation: Prevents issuance if current_stock < quantity_issued
--
-- Gatepass:
--   - When created: finished_goods.quantity -= quantity_dispatched
--   - Validation: Prevents dispatch if quantity < quantity_dispatched

-- =====================================================
-- API ENDPOINTS (For Reference)
-- =====================================================
-- Raw Material Issuance:
--   POST   /api/raw-material-issuance     - Create new issuance
--   GET    /api/raw-material-issuance     - List all issuances
--   PATCH  /api/raw-material-issuance/:id - Update issuance
--   DELETE /api/raw-material-issuance/:id - Soft delete (set record_status=0)
--
-- Gatepasses:
--   POST   /api/gatepasses     - Create new gatepass
--   GET    /api/gatepasses     - List all gatepasses
--   PATCH  /api/gatepasses/:id - Update gatepass
--   DELETE /api/gatepasses/:id - Soft delete (set record_status=0)
--
-- Dashboard Stats:
--   GET    /api/stats/today    - Get today's production statistics
