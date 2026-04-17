-- Seed standard leave types for all tenants that have no leave types yet
-- Safe to run multiple times (checks before inserting)
DO $$
DECLARE
  t RECORD;
BEGIN
  FOR t IN SELECT id FROM tenants LOOP
    IF NOT EXISTS (SELECT 1 FROM hr_leave_types WHERE tenant_id = t.id) THEN
      INSERT INTO hr_leave_types (tenant_id, name, code, annual_days, is_carry_forward, max_carry_forward, is_encashable, is_paid_leave, applicable_emp_types) VALUES
        (t.id, 'Sick Leave',       'SL',   12, false, 0,  false, true,  'permanent,contract,intern,trainee'),
        (t.id, 'Casual Leave',     'CL',   12, false, 0,  false, true,  'permanent,contract,intern,trainee'),
        (t.id, 'Earned Leave',     'EL',   15, true,  15, true,  true,  'permanent'),
        (t.id, 'Loss of Pay',      'LOP',  0,  false, 0,  false, false, 'permanent,consultant,contract,intern,trainee'),
        (t.id, 'Compensatory Off', 'COMP', 0,  false, 0,  false, true,  'permanent,contract,intern,trainee');
      RAISE NOTICE 'Seeded leave types for tenant %', t.id;
    ELSE
      -- Ensure LOP and COMP exist even if other types already configured
      IF NOT EXISTS (SELECT 1 FROM hr_leave_types WHERE tenant_id = t.id AND code = 'LOP') THEN
        INSERT INTO hr_leave_types (tenant_id, name, code, annual_days, is_carry_forward, max_carry_forward, is_encashable, is_paid_leave, applicable_emp_types)
        VALUES (t.id, 'Loss of Pay', 'LOP', 0, false, 0, false, false, 'permanent,consultant,contract,intern,trainee');
        RAISE NOTICE 'Added LOP for tenant %', t.id;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM hr_leave_types WHERE tenant_id = t.id AND code = 'COMP') THEN
        INSERT INTO hr_leave_types (tenant_id, name, code, annual_days, is_carry_forward, max_carry_forward, is_encashable, is_paid_leave, applicable_emp_types)
        VALUES (t.id, 'Compensatory Off', 'COMP', 0, false, 0, false, true, 'permanent,contract,intern,trainee');
        RAISE NOTICE 'Added COMP for tenant %', t.id;
      END IF;
    END IF;
  END LOOP;
END $$;
