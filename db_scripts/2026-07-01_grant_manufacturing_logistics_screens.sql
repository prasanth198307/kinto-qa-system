-- Grant 7 missing Manufacturing + Logistics screens to all admin roles
-- Run on production: psql $DATABASE_URL -f this_file.sql

INSERT INTO role_permissions (tenant_id, role_id, screen_key, can_view, can_create, can_edit, can_delete, record_status)
SELECT
  r.tenant_id,
  r.id AS role_id,
  s.screen_key,
  1, 1, 1, 1,
  1
FROM roles r
CROSS JOIN (VALUES
  ('manufacturing_job_cards'),
  ('manufacturing_sub_contracting'),
  ('manufacturing_machine_oee'),
  ('manufacturing_work_orders'),
  ('manufacturing_quality'),
  ('manufacturing_mrp'),
  ('logistics_eway_bill')
) AS s(screen_key)
WHERE r.name ILIKE '%admin%'
  AND r.record_status != 0
ON CONFLICT (role_id, screen_key)
DO UPDATE SET
  can_view   = 1,
  can_create = 1,
  can_edit   = 1,
  can_delete = 1,
  record_status = 1;

-- Also grant view-only to manager roles
INSERT INTO role_permissions (tenant_id, role_id, screen_key, can_view, can_create, can_edit, can_delete, record_status)
SELECT
  r.tenant_id,
  r.id AS role_id,
  s.screen_key,
  1, 1, 1, 0,
  1
FROM roles r
CROSS JOIN (VALUES
  ('manufacturing_job_cards'),
  ('manufacturing_sub_contracting'),
  ('manufacturing_machine_oee'),
  ('manufacturing_work_orders'),
  ('manufacturing_quality'),
  ('manufacturing_mrp'),
  ('logistics_eway_bill')
) AS s(screen_key)
WHERE r.name ILIKE '%manager%'
  AND r.record_status != 0
ON CONFLICT (role_id, screen_key)
DO UPDATE SET
  can_view   = 1,
  can_create = 1,
  can_edit   = 1,
  record_status = 1;

SELECT 'Done: granted 7 screens to admin+manager roles across all tenants' AS result;
