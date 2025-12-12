-- Dispatch Masters: Transporters, Vehicles, and Drivers
-- Created: 2025-12-12
-- Updated: 2025-12-12 - Fixed column mismatches with Drizzle schema
-- Purpose: Master data for dispatch management with referential links to gatepasses

-- Transporters table
CREATE TABLE IF NOT EXISTS transporters (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    transporter_code VARCHAR(50) NOT NULL UNIQUE,
    transporter_name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    gst_number VARCHAR(20),
    pan_number VARCHAR(20),
    is_active INTEGER DEFAULT 1 NOT NULL,
    record_status INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Vehicles table (matches Drizzle schema)
CREATE TABLE IF NOT EXISTS vehicles (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_number VARCHAR(20) NOT NULL UNIQUE,
    vehicle_type VARCHAR(50),
    capacity VARCHAR(50),
    transporter_id VARCHAR REFERENCES transporters(id),
    owner_name VARCHAR(255),
    owner_phone VARCHAR(20),
    insurance_expiry DATE,
    fitness_expiry DATE,
    permit_expiry DATE,
    is_active INTEGER DEFAULT 1 NOT NULL,
    record_status INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Drivers table
CREATE TABLE IF NOT EXISTS drivers (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_code VARCHAR(50) NOT NULL UNIQUE,
    driver_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    alternate_phone VARCHAR(20),
    license_number VARCHAR(50),
    license_expiry DATE,
    address TEXT,
    transporter_id VARCHAR REFERENCES transporters(id),
    is_active INTEGER DEFAULT 1 NOT NULL,
    record_status INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Add missing columns to existing tables (for migrations)
DO $$
BEGIN
    -- Transporters: add contact_person if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transporters' AND column_name = 'contact_person') THEN
        ALTER TABLE transporters ADD COLUMN contact_person VARCHAR(255);
    END IF;
    
    -- Vehicles: add permit_expiry if missing (was rc_expiry in old schema)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'permit_expiry') THEN
        ALTER TABLE vehicles ADD COLUMN permit_expiry DATE;
    END IF;
    
    -- Vehicles: drop rc_expiry if it exists (not in Drizzle schema)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'rc_expiry') THEN
        ALTER TABLE vehicles DROP COLUMN rc_expiry;
    END IF;
END $$;

-- Add foreign key references to gatepasses table (if columns don't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gatepasses' AND column_name = 'transporter_id') THEN
        ALTER TABLE gatepasses ADD COLUMN transporter_id VARCHAR REFERENCES transporters(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gatepasses' AND column_name = 'vehicle_id') THEN
        ALTER TABLE gatepasses ADD COLUMN vehicle_id VARCHAR REFERENCES vehicles(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gatepasses' AND column_name = 'driver_id') THEN
        ALTER TABLE gatepasses ADD COLUMN driver_id VARCHAR REFERENCES drivers(id);
    END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_vehicles_transporter ON vehicles(transporter_id);
CREATE INDEX IF NOT EXISTS idx_drivers_transporter ON drivers(transporter_id);
CREATE INDEX IF NOT EXISTS idx_gatepasses_vehicle ON gatepasses(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_gatepasses_driver ON gatepasses(driver_id);
CREATE INDEX IF NOT EXISTS idx_gatepasses_transporter ON gatepasses(transporter_id);
