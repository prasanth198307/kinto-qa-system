-- Delete All Gate Passes
-- Created: 2025-12-05
-- WARNING: This script permanently deletes all gate pass records!

-- First, delete all gate pass items (child records)
DELETE FROM gatepass_items;

-- Then, delete all gate passes (parent records)
DELETE FROM gatepasses;

-- Verify deletion
SELECT 'Gate passes remaining:' AS status, COUNT(*) AS count FROM gatepasses
UNION ALL
SELECT 'Gate pass items remaining:' AS status, COUNT(*) AS count FROM gatepass_items;
