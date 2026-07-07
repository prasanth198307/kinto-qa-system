-- Extended App Suite (SwachSign, SwachDesk, SwachMeet, SwachSocial, SwachForms)
-- 1) Bundle into existing enterprise-tier plans (DB is authoritative over plan-features.ts fallbacks)
-- 2) Grant role permissions for the 3 newly registered screen keys
-- Safe to re-run.

-- Add suite modules to every enterprise-tier plan that doesn't already have them
UPDATE subscription_plans
SET modules = (
  SELECT jsonb_agg(DISTINCT m)
  FROM jsonb_array_elements_text(modules || '["swachsign","swachdesk","swachmeet","swachsocial","swachforms"]'::jsonb) AS m
)
WHERE slug LIKE '%enterprise%' OR slug = 'enterprise';

-- Role permissions for the newly registered Extended Suite screen keys
DO $$
DECLARE
  screen_keys TEXT[] := ARRAY['swachsign', 'swachmeet', 'swachsocial'];
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
