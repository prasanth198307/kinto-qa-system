-- Seed monthly_expenses permission for all roles that have expenses permission
-- but are missing the monthly_expenses row. Inherits same permissions as expenses.
INSERT INTO role_permissions (role_id, screen_key, can_view, can_create, can_edit, can_delete, record_status)
SELECT rp.role_id, 'monthly_expenses', rp.can_view, rp.can_create, rp.can_edit, rp.can_delete, 1
FROM role_permissions rp
WHERE rp.screen_key = 'expenses'
  AND rp.record_status = 1
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp2
    WHERE rp2.role_id = rp.role_id
      AND rp2.screen_key = 'monthly_expenses'
      AND rp2.record_status = 1
  );
