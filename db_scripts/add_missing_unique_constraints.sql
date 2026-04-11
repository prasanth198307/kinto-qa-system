-- Fix demo login error: "there is no unique or exclusion constraint matching the ON CONFLICT specification"
-- These constraints are added automatically at startup by server/index.ts, but can also be run manually.

-- 1. subscriptions(tenant_id) — required by seed-demo-tenant.ts ON CONFLICT (tenant_id)
ALTER TABLE subscriptions ADD CONSTRAINT IF NOT EXISTS subscriptions_tenant_id_unique UNIQUE (tenant_id);

-- 2. role_permissions(role_id, screen_key) — required by seed-demo-tenant.ts and seed-tenant.ts ON CONFLICT (role_id, screen_key)
ALTER TABLE role_permissions ADD CONSTRAINT IF NOT EXISTS role_permissions_role_screen_unique UNIQUE (role_id, screen_key);
