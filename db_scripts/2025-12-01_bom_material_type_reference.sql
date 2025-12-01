-- BOM Material Type Reference
-- Created: 2025-12-01
-- Purpose: Allow BOM to reference Material Types instead of specific raw materials
-- This enables dynamic raw material selection during issuance based on available stock

-- 1. Add material_type_id column to product_bom table
-- References raw_material_types table instead of individual raw_materials
ALTER TABLE product_bom 
ADD COLUMN IF NOT EXISTS material_type_id VARCHAR REFERENCES raw_material_types(id);

-- 2. Create index for material_type_id lookups
CREATE INDEX IF NOT EXISTS product_bom_material_type_id_idx ON product_bom(material_type_id);

-- Notes:
-- - material_type_id: References raw_material_types (e.g., "Preform 21gm", "Blue Cap")
-- - raw_material_id: Legacy column, kept for backward compatibility (nullable)
-- - When material_type_id is set, system finds all raw materials of that type
-- - During issuance, system suggests oldest stock (FIFO) from materials matching the type
-- - If only one raw material matches the type, it's auto-selected
-- - If multiple materials match, user can choose or system uses FIFO allocation

-- Example query to find raw materials for a BOM item:
-- SELECT rm.* FROM raw_materials rm
-- JOIN product_bom pb ON rm.material_type_id = pb.material_type_id
-- WHERE pb.product_id = ? AND rm.record_status = 1
-- ORDER BY rm.received_date ASC; -- FIFO ordering
