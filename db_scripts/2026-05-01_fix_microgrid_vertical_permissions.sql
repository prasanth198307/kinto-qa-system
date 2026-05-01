-- Fix missing industry vertical role_permissions for tenant 12 (microgrid)
-- admin and accountsmanager roles were missing all 6 vertical screen keys
-- Run date: 2026-05-01

INSERT INTO role_permissions (role_id, screen_key, can_view, can_create, can_edit, can_delete)
SELECT r.id, sk.screen_key, 1, 1, 1, 1
FROM roles r
CROSS JOIN (VALUES
  ('healthcare'), ('education'), ('logistics_transport'),
  ('real_estate'), ('pos'), ('agriculture')
) AS sk(screen_key)
WHERE r.id IN (
  '172fac29-33e6-4ccb-bd20-ebf7be588779',  -- admin (tenant 12)
  'ea4d79c7-b9cf-4c2c-8ddc-e573a167e2ce'   -- accountsmanager (tenant 12)
)
AND NOT EXISTS (
  SELECT 1 FROM role_permissions rp
  WHERE rp.role_id = r.id AND rp.screen_key = sk.screen_key
);
