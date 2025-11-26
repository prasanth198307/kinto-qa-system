-- ============================================================================
-- KINTO Smart Ops - UOM Cleanup and Product Unit Conversion Fix
-- Date: 2025-11-26
-- Description: Cleans up duplicate UOM entries and fixes product unit values
-- For Mac (localhost:5050) environment
-- ============================================================================

-- Step 1: Check current duplicates
SELECT name, COUNT(*) as count, array_agg(id) as ids
FROM uom 
GROUP BY name 
HAVING COUNT(*) > 1;

-- ============================================================================
-- Step 2: Update products to use ONE Cases ID before deleting the other
-- Keep: c874da8d-88f2-43a4-b301-303b3ac07f6f (Cases)
-- Delete: adc9dbd7-5e1e-4bd1-b32c-2bb98e73ec3d (Cases - duplicate)
-- ============================================================================

UPDATE products 
SET uom_id = 'c874da8d-88f2-43a4-b301-303b3ac07f6f'
WHERE uom_id = 'adc9dbd7-5e1e-4bd1-b32c-2bb98e73ec3d';

-- ============================================================================
-- Step 3: Update products to use ONE Liters ID before deleting the other
-- Keep: 9b5533e7-caac-45e7-afb0-7b63f7d99212 (Liters)
-- Delete: 9fc7f812-e7d2-4925-8764-896392214408 (Liters - duplicate)
-- ============================================================================

UPDATE products 
SET uom_id = '9b5533e7-caac-45e7-afb0-7b63f7d99212'
WHERE uom_id = '9fc7f812-e7d2-4925-8764-896392214408';

-- ============================================================================
-- Step 4: Fix text values in base_unit and derived_unit columns
-- ============================================================================

UPDATE products SET base_unit = 'Bottle' WHERE base_unit = 'Bottles';
UPDATE products SET derived_unit = 'Case' WHERE derived_unit = 'Cases';
UPDATE products SET derived_unit = 'Case' WHERE derived_unit = 'CasesCases';

-- ============================================================================
-- Step 5: Now delete the duplicate UOMs (after products are updated)
-- ============================================================================

DELETE FROM uom WHERE id = 'adc9dbd7-5e1e-4bd1-b32c-2bb98e73ec3d'; -- Duplicate Cases
DELETE FROM uom WHERE id = '9fc7f812-e7d2-4925-8764-896392214408'; -- Duplicate Liters

-- ============================================================================
-- Step 6: Rename "Cases" to "Case" and "Bottles" to "Bottle" for consistency
-- ============================================================================

UPDATE uom SET name = 'Case' WHERE id = 'c874da8d-88f2-43a4-b301-303b3ac07f6f';
UPDATE uom SET name = 'Bottle' WHERE id = '1fb4b81f-3192-4102-8eee-da2ae085e9c9';

-- ============================================================================
-- Step 7: Verify cleanup - should show no duplicates
-- ============================================================================

SELECT name, COUNT(*) as count
FROM uom 
GROUP BY name 
HAVING COUNT(*) > 1;

-- Final list of UOMs
SELECT id, name FROM uom ORDER BY name;
