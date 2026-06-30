-- Task #6: Retroactive grant of restaurant screen permissions to all admin roles
-- Run after adding restaurant screen keys to screen-registry.ts

DO $$
DECLARE
  r RECORD;
  screen TEXT;
  screens TEXT[] := ARRAY[
    'restaurant_dashboard','restaurant_pos','restaurant_kitchen','restaurant_tables',
    'restaurant_menu','restaurant_orders','restaurant_delivery','restaurant_reservations',
    'restaurant_shifts','restaurant_customers','restaurant_inventory','restaurant_outlets',
    'restaurant_reports','restaurant_aggregators','restaurant_analytics','restaurant_staff',
    'restaurant_steward','restaurant_kiosk','restaurant_franchise','restaurant_tax_settings',
    'restaurant_gift_cards','restaurant_central_kitchen','restaurant_menu_translations',
    'restaurant_table_order','restaurant_cds','restaurant_campaigns','restaurant_recipes'
  ];
BEGIN
  FOR r IN SELECT id FROM roles WHERE name IN ('admin','Admin','administrator','Kinto_LeadAdmin') LOOP
    FOREACH screen IN ARRAY screens LOOP
      INSERT INTO role_permissions (role_id, screen_key, can_view, can_create, can_edit, can_delete)
      VALUES (r.id, screen, true, true, true, true)
      ON CONFLICT (role_id, screen_key) DO UPDATE
        SET can_view = true, can_create = true, can_edit = true, can_delete = true;
    END LOOP;
  END LOOP;
END $$;

-- Also add for any role named 'manager' with reduced permissions
DO $$
DECLARE
  r RECORD;
  screen TEXT;
  screens TEXT[] := ARRAY[
    'restaurant_dashboard','restaurant_pos','restaurant_kitchen','restaurant_tables',
    'restaurant_menu','restaurant_orders','restaurant_delivery','restaurant_reservations',
    'restaurant_shifts','restaurant_customers','restaurant_inventory','restaurant_outlets',
    'restaurant_reports','restaurant_aggregators','restaurant_analytics','restaurant_staff'
  ];
BEGIN
  FOR r IN SELECT id FROM roles WHERE name ILIKE '%manager%' OR name ILIKE '%operator%' LOOP
    FOREACH screen IN ARRAY screens LOOP
      INSERT INTO role_permissions (role_id, screen_key, can_view, can_create, can_edit, can_delete)
      VALUES (r.id, screen, true, true, true, false)
      ON CONFLICT (role_id, screen_key) DO UPDATE
        SET can_view = true, can_create = true, can_edit = true;
    END LOOP;
  END LOOP;
END $$;

SELECT 'Restaurant screen permissions granted to all admin/manager roles' as result;
