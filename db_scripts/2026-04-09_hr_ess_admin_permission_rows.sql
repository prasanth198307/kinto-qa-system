-- Add hr_ess_admin screen permission rows for all enterprise tenant roles
-- This screen was added to the HR & Payroll module in plan-features.ts
-- and controls access to the "Set ESS Password" feature in the employee list.

DO $$
DECLARE
  r RECORD;
  cv INT; cc INT; ce INT;
BEGIN
  FOR r IN
    SELECT ro.id as role_id, ro.name as role_name, ro.tenant_id
    FROM roles ro
    JOIN tenants t ON t.id = ro.tenant_id
    WHERE t.plan = 'enterprise' AND ro.record_status = 1
  LOOP
    cv := 0; cc := 0; ce := 0;
    IF lower(r.role_name) IN ('admin','accountsmanager','manager') THEN
      cv:=1; cc:=1; ce:=1;
    ELSIF lower(r.role_name) IN ('operator','reviewer') THEN
      cv:=1;
    END IF;
    INSERT INTO role_permissions (role_id, screen_key, tenant_id, can_view, can_create, can_edit, can_delete, record_status)
    VALUES (r.role_id, 'hr_ess_admin', r.tenant_id, cv, cc, ce, 0, 1)
    ON CONFLICT (role_id, screen_key, tenant_id) DO NOTHING;
  END LOOP;
  RAISE NOTICE 'hr_ess_admin rows seeded for enterprise tenants';
END $$;
