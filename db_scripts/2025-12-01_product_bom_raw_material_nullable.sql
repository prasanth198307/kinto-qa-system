-- Migration: Make raw_material_id nullable in product_bom table
-- Date: 2025-12-01
-- Purpose: Support Multi-BOM Configuration system which uses material_type_id instead of raw_material_id
-- Background: The new BOM system references material types (categories) rather than specific raw materials,
--             allowing dynamic selection of raw materials during issuance based on available stock.

ALTER TABLE product_bom ALTER COLUMN raw_material_id DROP NOT NULL;

-- Verification query:
-- SELECT column_name, is_nullable FROM information_schema.columns 
-- WHERE table_name = 'product_bom' AND column_name = 'raw_material_id';
-- Expected: is_nullable = YES
