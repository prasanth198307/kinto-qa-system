-- Set KINTO tenant logo and CORS origin for kinto.swacherp.com subdomain redirect
-- Logo file: client/public/logos/kinto-logo.png (served as /logos/kinto-logo.png)
-- CORS origin enables auto-redirect from kinto.swacherp.com → /auth?tenant=kinto

UPDATE tenants
SET
  logo_url     = '/logos/kinto-logo.png',
  cors_origins = ARRAY['https://kinto.swacherp.com']
WHERE slug = 'kinto';
