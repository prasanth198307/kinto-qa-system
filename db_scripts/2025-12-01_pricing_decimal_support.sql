-- Migration: Allow decimal pricing in products table
-- Date: 2025-12-01
-- Purpose: Support fractional paise values (e.g., 94.5 paise) for basePrice and totalPrice
-- Background: User requested ability to enter decimal values for pricing fields

ALTER TABLE products ALTER COLUMN base_price TYPE numeric(12, 2);
ALTER TABLE products ALTER COLUMN total_price TYPE numeric(12, 2);

-- Verification query:
-- SELECT column_name, data_type, numeric_precision, numeric_scale 
-- FROM information_schema.columns 
-- WHERE table_name = 'products' AND column_name IN ('base_price', 'total_price');
-- Expected: numeric with precision 12, scale 2
