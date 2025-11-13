-- Migration: Add display_order column to product_categories and product_types
-- Date: 2025-11-13 06:00:00
-- Purpose: Enable UI sorting of product categories and types for better UX
-- Test Cases: TC 19.1 (Product Categories), TC 19.2 (Product Types)

-- Add display_order to product_categories
ALTER TABLE product_categories 
ADD COLUMN IF NOT EXISTS display_order INTEGER;

COMMENT ON COLUMN product_categories.display_order IS 
'Optional display order for sorting categories in the UI. NULL values sort last.';

-- Add display_order to product_types
ALTER TABLE product_types 
ADD COLUMN IF NOT EXISTS display_order INTEGER;

COMMENT ON COLUMN product_types.display_order IS 
'Optional display order for sorting types in the UI. NULL values sort last.';

-- Verification queries (commented out for production)
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns 
-- WHERE table_name = 'product_categories' AND column_name = 'display_order';

-- SELECT column_name, data_type, is_nullable FROM information_schema.columns 
-- WHERE table_name = 'product_types' AND column_name = 'display_order';
