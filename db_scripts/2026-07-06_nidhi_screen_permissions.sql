-- Retroactive: grant all Nidhi Company ERP screen permissions to admin/manager/operator roles
-- Pattern: INSERT ON CONFLICT DO NOTHING so re-running is safe

DO $$
DECLARE
  screen_keys TEXT[] := ARRAY[
    'nidhi_members', 'nidhi_deposits', 'nidhi_loans', 'nidhi_emi',
    'nidhi_shares', 'nidhi_gold_rates', 'nidhi_interest_rates',
    'nidhi_daily_collection', 'nidhi_compliance', 'nidhi_reports',
    'nidhi_loan_sanction', 'nidhi_pdc_tracking', 'nidhi_rbi_returns',
    'nidhi_member_passbook', 'nidhi_mobile_collection'
  ];
  sk TEXT;
BEGIN
  FOREACH sk IN ARRAY screen_keys LOOP
    -- Admin: full access
    INSERT INTO role_permissions (role, screen_key, can_view, can_create, can_edit, can_delete)
    VALUES ('admin', sk, true, true, true, true)
    ON CONFLICT (role, screen_key) DO NOTHING;

    -- Manager: view/create/edit, no delete
    INSERT INTO role_permissions (role, screen_key, can_view, can_create, can_edit, can_delete)
    VALUES ('manager', sk, true, true, true, false)
    ON CONFLICT (role, screen_key) DO NOTHING;

    -- Operator: view/create only
    INSERT INTO role_permissions (role, screen_key, can_view, can_create, can_edit, can_delete)
    VALUES ('operator', sk, true, true, false, false)
    ON CONFLICT (role, screen_key) DO NOTHING;
  END LOOP;

  -- Mobile collection: also grant to 'agent' role if it exists
  INSERT INTO role_permissions (role, screen_key, can_view, can_create, can_edit, can_delete)
  VALUES ('agent', 'nidhi_mobile_collection', true, true, false, false)
  ON CONFLICT (role, screen_key) DO NOTHING;
END $$;
