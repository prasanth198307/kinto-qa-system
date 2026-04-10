-- Fix role_permissions rows that were inserted with tenant_id=1 (schema default)
-- instead of the role's actual tenant. This was caused by createRolePermission
-- not injecting the current tenant context.
UPDATE role_permissions rp
SET tenant_id = r.tenant_id
FROM roles r
WHERE rp.role_id = r.id
  AND rp.tenant_id != r.tenant_id;
