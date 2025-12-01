-- Migration: Support decimal values in raw_material_types table
-- Date: 2025-12-01
-- Description: Changes integer columns to real type to allow decimal values like 19.5g for weight per derived unit

-- Alter columns from integer to real to support decimal values
ALTER TABLE raw_material_types 
  ALTER COLUMN base_unit_weight TYPE real USING base_unit_weight::real,
  ALTER COLUMN weight_per_derived_unit TYPE real USING weight_per_derived_unit::real,
  ALTER COLUMN derived_value_per_base TYPE real USING derived_value_per_base::real,
  ALTER COLUMN output_units_covered TYPE real USING output_units_covered::real,
  ALTER COLUMN conversion_value TYPE real USING conversion_value::real,
  ALTER COLUMN usable_units TYPE real USING usable_units::real;

-- Note: This migration preserves existing integer values while enabling decimal input
-- Example: weight_per_derived_unit can now accept 19.5 (grams) instead of only 19 or 20
