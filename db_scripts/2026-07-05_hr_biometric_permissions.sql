-- Retroactive: grant HR biometric + EPFO + offer-letter screen permissions to existing roles
-- Idempotent: WHERE NOT EXISTS prevents duplicates

DO $$
DECLARE
  screen_keys_full TEXT[] := ARRAY['hr_biometric'];
  screen_keys_limited TEXT[] := ARRAY['hr_epfo_filing', 'hr_offer_letters'];
  actions_full TEXT[] := ARRAY['view', 'create', 'edit', 'delete'];
  actions_limited TEXT[] := ARRAY['view', 'create'];
  sk TEXT;
  role_rec RECORD;
BEGIN
  FOR role_rec IN
    SELECT DISTINCT tenant_id, role FROM user_roles
    WHERE role IN ('admin', 'manager', 'hr_manager', 'hr_admin', 'payroll_officer')
  LOOP
    FOREACH sk IN ARRAY screen_keys_full LOOP
      IF NOT EXISTS (
        SELECT 1 FROM role_permissions
        WHERE tenant_id = role_rec.tenant_id AND role = role_rec.role AND screen_key = sk
      ) THEN
        INSERT INTO role_permissions (tenant_id, role, screen_key, allowed_actions, created_at)
        VALUES (role_rec.tenant_id, role_rec.role, sk, actions_full, NOW());
      END IF;
    END LOOP;
    FOREACH sk IN ARRAY screen_keys_limited LOOP
      IF NOT EXISTS (
        SELECT 1 FROM role_permissions
        WHERE tenant_id = role_rec.tenant_id AND role = role_rec.role AND screen_key = sk
      ) THEN
        INSERT INTO role_permissions (tenant_id, role, screen_key, allowed_actions, created_at)
        VALUES (role_rec.tenant_id, role_rec.role, sk, actions_limited, NOW());
      END IF;
    END LOOP;
  END LOOP;
END $$;
