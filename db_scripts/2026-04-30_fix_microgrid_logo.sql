-- Step 1: Find the Microgrid tenant and its current logo_url
SELECT id, name, slug, logo_url FROM tenants WHERE name ILIKE '%microgrid%' OR slug ILIKE '%microgrid%';

-- Step 2: Fix the logo path (run this after confirming the tenant ID above)
-- The logo file is already in: client/public/logos/microgrid-logo.png
-- which is served as: /logos/microgrid-logo.png
UPDATE tenants
SET logo_url = '/logos/microgrid-logo.png'
WHERE name ILIKE '%microgrid%' OR slug ILIKE '%microgrid%';

-- Step 3: Verify the fix
SELECT id, name, slug, logo_url FROM tenants WHERE name ILIKE '%microgrid%' OR slug ILIKE '%microgrid%';
