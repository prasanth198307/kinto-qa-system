-- Fix tenant logos that were saved to the ephemeral /uploads/ directory.
-- Those files do not persist in production deployments.
-- Logos must be in client/public/logos/ (served as /logos/filename).
--
-- After copying the logo file to client/public/logos/, run:
--   UPDATE tenants SET logo_url = '/logos/<filename>' WHERE id = <tenant_id>;
--
-- For Microgrid tenant specifically (file: client/public/logos/microgrid-logo.png):
UPDATE tenants
SET logo_url = '/logos/microgrid-logo.png'
WHERE logo_url LIKE '/uploads/%'
  AND (name ILIKE '%microgrid%' OR slug ILIKE '%microgrid%');

-- Generic fix: wipe any remaining broken /uploads/ logo paths so broken images don't show
UPDATE tenants
SET logo_url = NULL
WHERE logo_url LIKE '/uploads/%';
