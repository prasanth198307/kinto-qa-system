-- 2026-07-05: Grant Pharmacy ERP screen permissions to existing roles
-- Pharmacy sub-screens were missing from screen-registry.ts (now added) —
-- this retroactively seeds role_permissions for all existing tenants (idempotent).

INSERT INTO role_permissions (role_id, screen_key, tenant_id, can_view, can_create, can_edit, can_delete, record_status)
SELECT r.id, sk.screen_key, r.tenant_id,
  CASE WHEN lower(r.name) IN ('admin','accountsmanager','manager','pharmacist') THEN 1 ELSE 0 END,
  CASE WHEN lower(r.name) IN ('admin','manager','pharmacist') THEN 1 ELSE 0 END,
  CASE WHEN lower(r.name) IN ('admin','manager','pharmacist') THEN 1 ELSE 0 END,
  CASE WHEN lower(r.name) = 'admin' THEN 1 ELSE 0 END,
  1
FROM roles r
CROSS JOIN (VALUES
  ('pharmacy_billing'),
  ('pharmacy_drugs'),
  ('pharmacy_stock'),
  ('pharmacy_purchases'),
  ('pharmacy_schedule_h'),
  ('pharmacy_schedule_x'),
  ('pharmacy_licenses'),
  ('pharmacy_expiry'),
  ('pharmacy_reports'),
  ('pharmacy_prescriptions')
) AS sk(screen_key)
WHERE r.record_status = 1
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = r.id AND rp.screen_key = sk.screen_key
  );
