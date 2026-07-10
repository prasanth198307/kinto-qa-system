-- SUPERSEDED: This script uses a 'role' column that does not exist in production (prod uses role_id).
-- All permissions from this file were re-granted correctly by 2026-07-09_corrected_screen_permissions.sql.
-- Do NOT run this script on a fresh database without running the corrected script after it.

-- Retroactive: grant hotel sub-screen permissions to existing admin/manager roles
-- Idempotent: WHERE NOT EXISTS prevents duplicates

DO $$
DECLARE
  screen_keys_full TEXT[] := ARRAY[
    'hotel', 'hotel_rooms', 'hotel_front_desk', 'hotel_reservations',
    'hotel_checkin', 'hotel_folio', 'hotel_housekeeping', 'hotel_rates',
    'hotel_corporate'
  ];
  screen_keys_view TEXT[] := ARRAY['hotel_reports'];
  screen_keys_limited TEXT[] := ARRAY['hotel_night_audit'];
  actions_full TEXT[] := ARRAY['view', 'create', 'edit', 'delete'];
  actions_view TEXT[] := ARRAY['view'];
  actions_limited TEXT[] := ARRAY['view', 'create'];
  sk TEXT;
  role_rec RECORD;
BEGIN
  FOR role_rec IN
    SELECT DISTINCT tenant_id, role FROM user_roles
    WHERE role IN ('admin', 'manager', 'hotel_manager', 'receptionist', 'housekeeping')
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
    FOREACH sk IN ARRAY screen_keys_view LOOP
      IF NOT EXISTS (
        SELECT 1 FROM role_permissions
        WHERE tenant_id = role_rec.tenant_id AND role = role_rec.role AND screen_key = sk
      ) THEN
        INSERT INTO role_permissions (tenant_id, role, screen_key, allowed_actions, created_at)
        VALUES (role_rec.tenant_id, role_rec.role, sk, actions_view, NOW());
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