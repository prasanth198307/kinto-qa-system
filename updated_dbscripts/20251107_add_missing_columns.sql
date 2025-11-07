-- Migration: Add missing columns to raw_material_issuance and gatepasses tables
-- Date: 2025-11-07
-- Purpose: Fix Mac deployment schema issues

-- Add issued_to column to raw_material_issuance table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'raw_material_issuance' 
        AND column_name = 'issued_to'
    ) THEN
        ALTER TABLE raw_material_issuance 
        ADD COLUMN issued_to VARCHAR(255);
        
        RAISE NOTICE 'Added issued_to column to raw_material_issuance table';
    ELSE
        RAISE NOTICE 'issued_to column already exists in raw_material_issuance table';
    END IF;
END $$;

-- Add driver_contact column to gatepasses table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'gatepasses' 
        AND column_name = 'driver_contact'
    ) THEN
        ALTER TABLE gatepasses 
        ADD COLUMN driver_contact VARCHAR(50);
        
        RAISE NOTICE 'Added driver_contact column to gatepasses table';
    ELSE
        RAISE NOTICE 'driver_contact column already exists in gatepasses table';
    END IF;
END $$;

-- Add transporter_name column to gatepasses table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'gatepasses' 
        AND column_name = 'transporter_name'
    ) THEN
        ALTER TABLE gatepasses 
        ADD COLUMN transporter_name VARCHAR(255);
        
        RAISE NOTICE 'Added transporter_name column to gatepasses table';
    ELSE
        RAISE NOTICE 'transporter_name column already exists in gatepasses table';
    END IF;
END $$;

-- Add destination column to gatepasses table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'gatepasses' 
        AND column_name = 'destination'
    ) THEN
        ALTER TABLE gatepasses 
        ADD COLUMN destination VARCHAR(255);
        
        RAISE NOTICE 'Added destination column to gatepasses table';
    ELSE
        RAISE NOTICE 'destination column already exists in gatepasses table';
    END IF;
END $$;

-- Add customer_name column to gatepasses table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'gatepasses' 
        AND column_name = 'customer_name'
    ) THEN
        ALTER TABLE gatepasses 
        ADD COLUMN customer_name VARCHAR(255);
        
        RAISE NOTICE 'Added customer_name column to gatepasses table';
    ELSE
        RAISE NOTICE 'customer_name column already exists in gatepasses table';
    END IF;
END $$;

-- Verification query
SELECT 
    'raw_material_issuance' as table_name,
    column_name,
    data_type,
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'raw_material_issuance'
AND column_name = 'issued_to'

UNION ALL

SELECT 
    'gatepasses' as table_name,
    column_name,
    data_type,
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'gatepasses'
AND column_name IN ('driver_contact', 'transporter_name', 'destination', 'customer_name')
ORDER BY table_name, column_name;
