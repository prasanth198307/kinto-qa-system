-- ============================================================================
-- KINTO Smart Ops - UOM Cleanup and Product Unit Conversion Fix
-- Date: 2025-11-26
-- Description: Cleans up duplicate UOM entries and fixes product unit values
-- ============================================================================

-- Step 1: Check current UOMs (run this first to see what duplicates exist)
-- SELECT id, name FROM uom ORDER BY name;

-- Step 2: Identify duplicates by name
SELECT name, COUNT(*) as count, array_agg(id) as ids
FROM uom 
GROUP BY name 
HAVING COUNT(*) > 1;

-- ============================================================================
-- Step 3: Fix products referencing duplicate UOMs
-- NOTE: Adjust the UOM IDs below based on YOUR database
-- Run the SELECT query above first to get the correct IDs
-- ============================================================================

-- Update products to use the primary "Case" UOM ID (keep the shorter/older ID)
-- Replace the IDs below with the ones from your database
UPDATE products 
SET uom_id = (SELECT id FROM uom WHERE name = 'Case' ORDER BY id LIMIT 1)
WHERE uom_id IN (
    SELECT id FROM uom WHERE name IN ('Case', 'Cases') 
    AND id != (SELECT id FROM uom WHERE name = 'Case' ORDER BY id LIMIT 1)
);

-- Fix text values in base_unit and derived_unit columns
UPDATE products SET base_unit = 'Bottle' WHERE base_unit = 'Bottles';
UPDATE products SET derived_unit = 'Case' WHERE derived_unit = 'Cases';
UPDATE products SET derived_unit = 'Case' WHERE derived_unit = 'CasesCases';

-- ============================================================================
-- Step 4: Delete duplicate UOMs (keeping one of each name)
-- This uses a CTE to identify and delete duplicates, keeping the oldest entry
-- ============================================================================

-- Delete duplicate "Cases" entries (keep "Case")
DELETE FROM uom 
WHERE name = 'Cases' 
AND id NOT IN (SELECT id FROM uom WHERE name = 'Case' LIMIT 1);

-- Delete duplicate "Liters" entries (keep oldest one)
DELETE FROM uom 
WHERE name = 'Liters' 
AND id != (SELECT id FROM uom WHERE name = 'Liters' ORDER BY id LIMIT 1);

-- ============================================================================
-- Step 5: Verify cleanup
-- ============================================================================
SELECT id, name FROM uom ORDER BY name;

-- ============================================================================
-- Alternative: Manual deletion if you know the exact duplicate IDs
-- Uncomment and modify with your specific IDs from Step 1
-- ============================================================================
-- DELETE FROM uom WHERE id = 'your-duplicate-cases-id-here';
-- DELETE FROM uom WHERE id = 'your-duplicate-liters-id-here';
