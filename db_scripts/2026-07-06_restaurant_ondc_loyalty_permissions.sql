-- Restaurant ERP new screen permissions: ONDC integration + loyalty expiry engine

DO $$
DECLARE
  r RECORD;
BEGIN
  -- admin, manager, superadmin, restaurant_manager → full access
  FOR r IN
    SELECT id FROM roles WHERE name IN ('admin', 'manager', 'superadmin', 'restaurant_manager')
  LOOP
    INSERT INTO role_permissions (role_id, screen_key, actions)
    VALUES
      (r.id, 'restaurant_ondc',           ARRAY['view', 'create', 'edit']),
      (r.id, 'restaurant_loyalty_expiry', ARRAY['view', 'create', 'edit'])
    ON CONFLICT (role_id, screen_key) DO NOTHING;
  END LOOP;

  -- cashier, billing_staff → view ONDC orders only
  FOR r IN
    SELECT id FROM roles WHERE name IN ('cashier', 'billing_staff', 'operator')
  LOOP
    INSERT INTO role_permissions (role_id, screen_key, actions)
    VALUES
      (r.id, 'restaurant_ondc', ARRAY['view'])
    ON CONFLICT (role_id, screen_key) DO NOTHING;
  END LOOP;
END $$;
