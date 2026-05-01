-- Add industry column to tenants table for industry-vertical categorisation
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS industry VARCHAR(100) DEFAULT NULL;
