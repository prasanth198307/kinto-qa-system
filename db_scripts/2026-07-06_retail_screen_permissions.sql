-- Retroactive: grant Retail/POS ERP screen permissions to admin/manager/operator roles
-- Safe to re-run: ON CONFLICT DO NOTHING

DO $$
DECLARE
  screen_keys TEXT[] := ARRAY[
    'retail_franchise', 'retail_b2b_portal', 'retail_store_transfers',
    'retail_loyalty', 'retail_omni_channel', 'retail_pos_hardware'
  ];
  sk TEXT;
BEGIN
  FOREACH sk IN ARRAY screen_keys LOOP
    INSERT INTO role_permissions (role, screen_key, can_view, can_create, can_edit, can_delete)
    VALUES ('admin', sk, true, true, true, true)
    ON CONFLICT (role, screen_key) DO NOTHING;

    INSERT INTO role_permissions (role, screen_key, can_view, can_create, can_edit, can_delete)
    VALUES ('manager', sk, true, true, true, false)
    ON CONFLICT (role, screen_key) DO NOTHING;

    INSERT INTO role_permissions (role, screen_key, can_view, can_create, can_edit, can_delete)
    VALUES ('operator', sk, true, true, false, false)
    ON CONFLICT (role, screen_key) DO NOTHING;
  END LOOP;
END $$;
