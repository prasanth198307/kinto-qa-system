-- KINTO QA Management System - Critical Seed Data
-- PostgreSQL 13+
-- Date: 2025-11-07
-- Description: Essential master data required for application to function

-- ===========================================
-- CRITICAL: UNIT OF MEASUREMENT (UOM) SEED DATA
-- ===========================================
-- These are REQUIRED for all inventory transactions

INSERT INTO uom (code, name, description, is_active, record_status) VALUES
('PCS', 'Pieces', 'Individual countable items', 'true', 1),
('KG', 'Kilograms', 'Weight in kilograms', 'true', 1),
('LTR', 'Liters', 'Volume in liters', 'true', 1),
('MTR', 'Meters', 'Length in meters', 'true', 1),
('BOX', 'Box', 'Items packaged in boxes', 'true', 1),
('CTN', 'Carton', 'Items packaged in cartons', 'true', 1),
('PKT', 'Packet', 'Items packaged in packets', 'true', 1),
('SET', 'Set', 'Set of items', 'true', 1),
('ROLL', 'Roll', 'Items in roll form', 'true', 1),
('BTLS', 'Bottles', 'Liquid in bottles', 'true', 1),
('GM', 'Grams', 'Weight in grams', 'true', 1),
('ML', 'Milliliters', 'Volume in milliliters', 'true', 1),
('FT', 'Feet', 'Length in feet', 'true', 1),
('INCH', 'Inches', 'Length in inches', 'true', 1),
('SQM', 'Square Meters', 'Area in square meters', 'true', 1),
('SQFT', 'Square Feet', 'Area in square feet', 'true', 1),
('TON', 'Tons', 'Weight in metric tons', 'true', 1),
('PAIR', 'Pair', 'Items sold in pairs', 'true', 1),
('DZN', 'Dozen', 'Items in dozens (12 pcs)', 'true', 1),
('GROSS', 'Gross', 'Items in gross (144 pcs)', 'true', 1)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

COMMENT ON TABLE uom IS 'Unit of Measurement master - CRITICAL for all inventory operations';

-- ===========================================
-- DEFAULT BANK ACCOUNT (OPTIONAL BUT RECOMMENDED)
-- ===========================================
-- Comment out if not needed, or update with actual bank details

/*
INSERT INTO banks (
    bank_name,
    account_holder_name,
    account_number,
    ifsc_code,
    branch_name,
    account_type,
    upi_id,
    is_default,
    record_status
) VALUES (
    'HDFC Bank',
    'KINTO Manufacturing Pvt Ltd',
    '50200012345678',
    'HDFC0001234',
    'Mumbai Central',
    'Current',
    'kinto@hdfcbank',
    1,
    1
)
ON CONFLICT (account_number) DO UPDATE SET
    bank_name = EXCLUDED.bank_name,
    account_holder_name = EXCLUDED.account_holder_name,
    ifsc_code = EXCLUDED.ifsc_code,
    is_default = EXCLUDED.is_default,
    updated_at = CURRENT_TIMESTAMP;
*/

-- ===========================================
-- VERIFICATION QUERIES
-- ===========================================

-- Verify UOM data was inserted
SELECT 
    COUNT(*) as total_uom,
    COUNT(CASE WHEN is_active = 'true' THEN 1 END) as active_uom
FROM uom;

-- Expected: 20 total UOM, 20 active

-- Verify bank data (if uncommented above)
-- SELECT * FROM banks WHERE record_status = 1;

-- ===========================================
-- USAGE NOTES
-- ===========================================

-- UOM Codes are used throughout the application:
-- - Raw materials inventory
-- - Finished goods inventory  
-- - Purchase orders
-- - Raw material issuance
-- - Gatepasses
-- - Invoices

-- Without UOM data, these features will NOT work:
-- ❌ Cannot create raw materials
-- ❌ Cannot create finished goods
-- ❌ Cannot issue materials for production
-- ❌ Cannot create gatepasses
-- ❌ Cannot generate invoices

-- Bank account is used for:
-- - Invoice payment details
-- - Default bank info on printed invoices
-- - Payment tracking

-- ===========================================
-- PRODUCTION DEPLOYMENT CHECKLIST
-- ===========================================

-- Before deploying to production:
-- ✅ Run this script to seed UOM data
-- ✅ Uncomment and update bank details with real company info
-- ✅ Verify all UOM codes match your business requirements
-- ✅ Add additional UOM codes if needed for your industry
-- ✅ Set is_default = 1 for your primary bank account
