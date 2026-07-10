-- SUPERSEDED: This script uses a 'role' column that does not exist in production (prod uses role_id).
-- All permissions from this file were re-granted correctly by 2026-07-09_corrected_screen_permissions.sql.
-- Do NOT run this script on a fresh database without running the corrected script after it.

-- Retroactive permissions for new Manufacturing ERP screens
-- Screens: barcode scanner, preventive maintenance, BOM versions + ECN, supply chain
-- Date: 2026-07-06

DO $$
DECLARE
  r RECORD;
  perm RECORD;
BEGIN
  FOR r IN
    SELECT id FROM roles
    WHERE name IN ('admin', 'manager', 'superadmin', 'production_manager', 'store_manager', 'maintenance_engineer')
  LOOP
    -- Barcode / QR Scanner (view, create, edit)
    FOR perm IN SELECT unnest(ARRAY['view','create','edit']) AS action
    LOOP
      INSERT INTO role_permissions (role_id, screen_key, action)
      VALUES (r.id, 'manufacturing_barcode', perm.action)
      ON CONFLICT (role_id, screen_key, action) DO NOTHING;
    END LOOP;

    -- Preventive Maintenance Scheduler (view, create, edit, delete)
    FOR perm IN SELECT unnest(ARRAY['view','create','edit','delete']) AS action
    LOOP
      INSERT INTO role_permissions (role_id, screen_key, action)
      VALUES (r.id, 'manufacturing_pm', perm.action)
      ON CONFLICT (role_id, screen_key, action) DO NOTHING;
    END LOOP;

    -- BOM Versions + ECN (view, create, edit, delete)
    FOR perm IN SELECT unnest(ARRAY['view','create','edit','delete']) AS action
    LOOP
      INSERT INTO role_permissions (role_id, screen_key, action)
      VALUES (r.id, 'manufacturing_bom_versions', perm.action)
      ON CONFLICT (role_id, screen_key, action) DO NOTHING;
    END LOOP;

    -- Global Supply Chain (view, create, edit)
    FOR perm IN SELECT unnest(ARRAY['view','create','edit']) AS action
    LOOP
      INSERT INTO role_permissions (role_id, screen_key, action)
      VALUES (r.id, 'manufacturing_supply_chain', perm.action)
      ON CONFLICT (role_id, screen_key, action) DO NOTHING;
    END LOOP;
  END LOOP;

  -- Operators: only view + create for barcode and supply chain
  FOR r IN
    SELECT id FROM roles WHERE name IN ('operator', 'warehouse_staff', 'store_keeper')
  LOOP
    FOR perm IN SELECT unnest(ARRAY['view','create']) AS action
    LOOP
      INSERT INTO role_permissions (role_id, screen_key, action)
      VALUES (r.id, 'manufacturing_barcode', perm.action)
      ON CONFLICT (role_id, screen_key, action) DO NOTHING;

      INSERT INTO role_permissions (role_id, screen_key, action)
      VALUES (r.id, 'manufacturing_supply_chain', perm.action)
      ON CONFLICT (role_id, screen_key, action) DO NOTHING;
    END LOOP;

    INSERT INTO role_permissions (role_id, screen_key, action)
    VALUES (r.id, 'manufacturing_pm', 'view')
    ON CONFLICT (role_id, screen_key, action) DO NOTHING;
  END LOOP;

END $$;