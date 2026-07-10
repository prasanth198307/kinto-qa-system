-- SUPERSEDED: This script uses a 'role' column that does not exist in production (prod uses role_id).
-- All permissions from this file were re-granted correctly by 2026-07-09_corrected_screen_permissions.sql.
-- Do NOT run this script on a fresh database without running the corrected script after it.

-- Retroactive: grant all NGO ERP screen permissions to admin/manager/operator roles
-- Safe to re-run: ON CONFLICT DO NOTHING

DO $$
DECLARE
  screen_keys TEXT[] := ARRAY[
    'ngo_donors', 'ngo_donations', 'ngo_80g', 'ngo_80g_bulk',
    'ngo_projects', 'ngo_beneficiaries', 'ngo_grants', 'ngo_volunteers',
    'ngo_fcra', 'ngo_csr', 'ngo_funds', 'ngo_donor_admin', 'ngo_reports'
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