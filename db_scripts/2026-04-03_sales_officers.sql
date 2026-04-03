-- Migration: Add Sales Officers Master Table and link to Sales Orders
-- Date: 2026-04-03
-- Issue: #10 - Sales Order Screen Should Have SO Name

-- Step 1: Create the sales_officers master table
CREATE TABLE IF NOT EXISTS sales_officers (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    mobile_number VARCHAR(15),
    email VARCHAR(255),
    territory VARCHAR(255),
    is_active INTEGER NOT NULL DEFAULT 1,
    record_status INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Step 2: Add sales_officer_id column to sales_orders table
ALTER TABLE sales_orders
    ADD COLUMN IF NOT EXISTS sales_officer_id VARCHAR REFERENCES sales_officers(id);

-- Step 3: Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_sales_orders_sales_officer ON sales_orders(sales_officer_id);

-- Verification queries (optional, run to confirm)
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'sales_officers';
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'sales_orders' AND column_name = 'sales_officer_id';
