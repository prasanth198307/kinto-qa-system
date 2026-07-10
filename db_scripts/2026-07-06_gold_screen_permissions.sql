-- SUPERSEDED: This script uses a 'role' column that does not exist in production (prod uses role_id).
-- All permissions from this file were re-granted correctly by 2026-07-09_corrected_screen_permissions.sql.
-- Do NOT run this script on a fresh database without running the corrected script after it.

-- Gold ERP new screen permissions: live rates, SEBI reporting, digital gold
-- Retroactive grant for existing roles

DO $$
DECLARE
  r RECORD;
BEGIN
  -- admin, manager, superadmin, jewellery_manager → full access to all 3 new screens
  FOR r IN
    SELECT id FROM roles WHERE name IN ('admin', 'manager', 'superadmin', 'jewellery_manager', 'jeweller')
  LOOP
    INSERT INTO role_permissions (role_id, screen_key, actions)
    VALUES
      (r.id, 'gold_erp_live_rates',     ARRAY['view']),
      (r.id, 'gold_erp_sebi_reporting', ARRAY['view', 'create', 'edit']),
      (r.id, 'gold_erp_digital_gold',   ARRAY['view', 'create', 'edit'])
    ON CONFLICT (role_id, screen_key) DO NOTHING;
  END LOOP;

  -- billing_staff, store_keeper → view only on live rates and digital gold
  FOR r IN
    SELECT id FROM roles WHERE name IN ('billing_staff', 'store_keeper', 'operator')
  LOOP
    INSERT INTO role_permissions (role_id, screen_key, actions)
    VALUES
      (r.id, 'gold_erp_live_rates',   ARRAY['view']),
      (r.id, 'gold_erp_digital_gold', ARRAY['view', 'create'])
    ON CONFLICT (role_id, screen_key) DO NOTHING;
  END LOOP;
END $$;