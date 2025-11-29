-- Migration: Change loss_percent from integer to real for decimal support
-- Date: 2024-11-29
-- Purpose: Allow decimal loss percentages like 12.1% in raw material types

-- Change loss_percent column from integer to real
ALTER TABLE raw_material_types 
ALTER COLUMN loss_percent TYPE real USING loss_percent::real;

-- Verify the change
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'raw_material_types' 
AND column_name = 'loss_percent';
