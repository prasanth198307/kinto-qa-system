-- Backfill HR screen keys for all existing roles in enterprise tenants
-- Run once after deploying the HR module to an existing database
-- Admin/Manager/etc → full access; operator/reviewer → view-only on basic HR screens

DO $$
DECLARE
  hr_screens TEXT[] := ARRAY['hr_employees','hr_attendance','hr_leaves','hr_payroll','hr_masters'];
  hr_screens_operator TEXT[] := ARRAY['hr_employees','hr_attendance'];
  r RECORD;
  sk TEXT;
BEGIN
  FOR r IN
    SELECT ro.id as role_id, ro.name as role_name, ro.tenant_id
    FROM roles ro
    JOIN tenants t ON t.id = ro.tenant_id
    WHERE t.plan = 'enterprise'
  LOOP
    IF lower(r.role_name) IN ('operator', 'reviewer') THEN
      FOREACH sk IN ARRAY hr_screens_operator LOOP
        INSERT INTO role_permissions (role_id, screen_key, can_view, can_create, can_edit, can_delete, tenant_id)
        VALUES (r.role_id, sk, 1, 0, 0, 0, r.tenant_id)
        ON CONFLICT (role_id, screen_key) DO NOTHING;
      END LOOP;
    ELSE
      FOREACH sk IN ARRAY hr_screens LOOP
        INSERT INTO role_permissions (role_id, screen_key, can_view, can_create, can_edit, can_delete, tenant_id)
        VALUES (r.role_id, sk, 1, 1, 1, 1, r.tenant_id)
        ON CONFLICT (role_id, screen_key) DO NOTHING;
      END LOOP;
    END IF;
  END LOOP;
  RAISE NOTICE 'HR permissions backfilled for all enterprise tenant roles';
END
$$;
