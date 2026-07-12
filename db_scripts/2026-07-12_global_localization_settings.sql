-- Add global localization columns to tenants table for international expansion
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS currency         VARCHAR(10)  DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS timezone         VARCHAR(50)  DEFAULT 'Asia/Kolkata',
  ADD COLUMN IF NOT EXISTS date_format      VARCHAR(20)  DEFAULT 'DD/MM/YYYY',
  ADD COLUMN IF NOT EXISTS fiscal_year_start INTEGER     DEFAULT 4,
  ADD COLUMN IF NOT EXISTS tax_regime       VARCHAR(20)  DEFAULT 'gst',
  ADD COLUMN IF NOT EXISTS default_locale   VARCHAR(10)  DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS industry         VARCHAR(100),
  ADD COLUMN IF NOT EXISTS website          VARCHAR(255),
  ADD COLUMN IF NOT EXISTS city             VARCHAR(100),
  ADD COLUMN IF NOT EXISTS state            VARCHAR(100),
  ADD COLUMN IF NOT EXISTS pincode          VARCHAR(20),
  ADD COLUMN IF NOT EXISTS registration_number VARCHAR(100);

-- Set kinto tenant to India defaults (already correct, explicit for clarity)
UPDATE tenants SET
  currency = 'INR',
  timezone = 'Asia/Kolkata',
  date_format = 'DD/MM/YYYY',
  fiscal_year_start = 4,
  tax_regime = 'gst',
  default_locale = 'en'
WHERE slug = 'kinto';
