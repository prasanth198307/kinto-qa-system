-- Add country column to tenants table
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS country VARCHAR(50) DEFAULT 'India';

-- Add tax_number_label to country_tax_config for UI display
ALTER TABLE country_tax_config ADD COLUMN IF NOT EXISTS tax_number_label VARCHAR(50) DEFAULT 'GST Number';
ALTER TABLE country_tax_config ADD COLUMN IF NOT EXISTS tax_number_placeholder VARCHAR(80) DEFAULT '22AAAAA0000A1Z5';
ALTER TABLE country_tax_config ADD COLUMN IF NOT EXISTS tax_number_regex VARCHAR(200) DEFAULT NULL;
ALTER TABLE country_tax_config ADD COLUMN IF NOT EXISTS phone_country_code VARCHAR(5) DEFAULT '+91';
