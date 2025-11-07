-- Migration: Add is_cluster flag to gatepasses and invoices tables
-- Description: Add is_cluster column for mobile app integration (avoids vendor table joins)

-- Add is_cluster column to gatepasses table
ALTER TABLE gatepasses ADD COLUMN IF NOT EXISTS is_cluster INTEGER DEFAULT 0 NOT NULL;

-- Add is_cluster column to invoices table
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS is_cluster INTEGER DEFAULT 0 NOT NULL;

-- Add comments to explain the columns
COMMENT ON COLUMN gatepasses.is_cluster IS 'Flag copied from vendor: 0 = Individual, 1 = Cluster (for mobile app integration)';
COMMENT ON COLUMN invoices.is_cluster IS 'Flag for buyer/customer: 0 = Individual, 1 = Cluster (for mobile app integration)';
