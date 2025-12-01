-- Multi-BOM Configuration System
-- Created: 2025-12-01
-- Purpose: Allow products to have multiple BOM configurations (e.g., different preform weights)
-- Each configuration can have its own material requirements for variance analysis and costing

-- 1. Create product_bom_configurations table
CREATE TABLE IF NOT EXISTS product_bom_configurations (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id VARCHAR NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    config_name VARCHAR(255) NOT NULL,
    description TEXT,
    is_default INTEGER NOT NULL DEFAULT 0,
    record_status INTEGER NOT NULL DEFAULT 1,
    created_by VARCHAR REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Add indexes for product_bom_configurations
CREATE INDEX IF NOT EXISTS product_bom_configurations_product_id_idx ON product_bom_configurations(product_id);
CREATE INDEX IF NOT EXISTS product_bom_configurations_is_default_idx ON product_bom_configurations(is_default);
CREATE INDEX IF NOT EXISTS product_bom_configurations_record_status_idx ON product_bom_configurations(record_status);

-- 3. Add configuration_id column to product_bom table (links BOM items to specific configuration)
ALTER TABLE product_bom 
ADD COLUMN IF NOT EXISTS configuration_id VARCHAR REFERENCES product_bom_configurations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS product_bom_configuration_id_idx ON product_bom(configuration_id);

-- 4. Add bom_configuration_id column to raw_material_issuance table (tracks which config was used)
ALTER TABLE raw_material_issuance 
ADD COLUMN IF NOT EXISTS bom_configuration_id VARCHAR REFERENCES product_bom_configurations(id);

CREATE INDEX IF NOT EXISTS raw_material_issuance_bom_config_idx ON raw_material_issuance(bom_configuration_id);

-- Notes:
-- - configuration_id in product_bom is nullable for backward compatibility (null = legacy/default BOM)
-- - bom_configuration_id in raw_material_issuance tracks which configuration was selected during issuance
-- - is_default flag ensures only one configuration is marked as default per product
-- - When querying BOM for issuance:
--   GET /api/products/:productId/bom-configurations - List available configurations
--   GET /api/products/:productId/bom-with-types?configurationId=xxx - Get BOM items for specific config
