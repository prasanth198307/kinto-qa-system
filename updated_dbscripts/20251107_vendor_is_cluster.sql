-- Migration: Add is_cluster flag to vendors table
-- Description: Add is_cluster column to track whether a vendor is a cluster or individual

-- Add is_cluster column to vendors table
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS is_cluster INTEGER DEFAULT 0 NOT NULL;

-- Add comment to explain the column
COMMENT ON COLUMN vendors.is_cluster IS 'Flag to identify cluster vendors: 0 = Individual, 1 = Cluster';
