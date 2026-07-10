-- SUPERSEDED: This script uses a 'role' column that does not exist in production (prod uses role_id).
-- All permissions from this file were re-granted correctly by 2026-07-09_corrected_screen_permissions.sql.
-- Do NOT run this script on a fresh database without running the corrected script after it.

-- Retroactive: grant all healthcare sub-screen permissions to existing admin/manager/doctor/nurse roles
-- Idempotent: WHERE NOT EXISTS prevents duplicates

DO $$
DECLARE
  screen_keys TEXT[] := ARRAY[
    'healthcare_patients', 'healthcare_doctors', 'healthcare_opd', 'healthcare_ipd',
    'healthcare_beds', 'healthcare_ot', 'healthcare_lab', 'healthcare_nursing',
    'healthcare_blood_bank', 'healthcare_insurance', 'healthcare_abdm',
    'healthcare_emr', 'healthcare_tpa_claims', 'healthcare_reports'
  ];
  actions_full TEXT[] := ARRAY['view', 'create', 'edit', 'delete'];
  actions_view TEXT[] := ARRAY['view'];
  sk TEXT;
  role_rec RECORD;
BEGIN
  FOR role_rec IN
    SELECT DISTINCT tenant_id, role FROM user_roles
    WHERE role IN ('admin', 'manager', 'doctor', 'nurse', 'lab_technician', 'pharmacist')
  LOOP
    FOREACH sk IN ARRAY screen_keys LOOP
      DECLARE
        acts TEXT[];
      BEGIN
        IF sk = 'healthcare_reports' THEN
          acts := actions_view;
        ELSE
          acts := actions_full;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM role_permissions
          WHERE tenant_id = role_rec.tenant_id AND role = role_rec.role AND screen_key = sk
        ) THEN
          INSERT INTO role_permissions (tenant_id, role, screen_key, allowed_actions, created_at)
          VALUES (role_rec.tenant_id, role_rec.role, sk, acts, NOW());
        END IF;
      END;
    END LOOP;
  END LOOP;
END $$;