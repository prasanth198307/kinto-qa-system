-- SUPERSEDED: This script uses a 'role' column that does not exist in production (prod uses role_id).
-- All permissions from this file were re-granted correctly by 2026-07-09_corrected_screen_permissions.sql.
-- Do NOT run this script on a fresh database without running the corrected script after it.

-- Retroactive permissions for Finance ERP advanced screens
-- Screens: recurring journals, multi-company consolidation, IFRS/GAAP, ZATCA, GSTR direct, investor pack

DO $$
DECLARE
  screen_keys_full TEXT[] := ARRAY[
    'finance_recurring_journals',
    'finance_consolidation',
    'finance_ifrs_gaap',
    'finance_investor_reporting'
  ];
  screen_keys_limited TEXT[] := ARRAY[
    'finance_zatca',
    'finance_gstr_direct'
  ];
  actions_full TEXT[] := ARRAY['view', 'create', 'edit', 'delete'];
  actions_limited TEXT[] := ARRAY['view', 'create'];
  role_rec RECORD;
  skey TEXT;
  act TEXT;
BEGIN
  FOR role_rec IN
    SELECT DISTINCT tenant_id, role FROM user_roles
    WHERE role IN ('admin', 'manager', 'finance_manager', 'accountant', 'cfo', 'superadmin')
  LOOP
    FOREACH skey IN ARRAY screen_keys_full
    LOOP
      FOREACH act IN ARRAY actions_full
      LOOP
        INSERT INTO role_permissions (tenant_id, role, screen_key, action)
        VALUES (role_rec.tenant_id, role_rec.role, skey, act)
        ON CONFLICT DO NOTHING;
      END LOOP;
    END LOOP;

    FOREACH skey IN ARRAY screen_keys_limited
    LOOP
      FOREACH act IN ARRAY actions_limited
      LOOP
        INSERT INTO role_permissions (tenant_id, role, screen_key, action)
        VALUES (role_rec.tenant_id, role_rec.role, skey, act)
        ON CONFLICT DO NOTHING;
      END LOOP;
    END LOOP;
  END LOOP;
END $$;