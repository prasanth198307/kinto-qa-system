-- Fix: Replace global UNIQUE(name) with composite UNIQUE(name, tenant_id)
-- This allows each tenant to have its own set of default role names (admin/manager/etc.)
-- without conflicting with other tenants' roles.

BEGIN;

-- 1. Drop the old global unique constraint on name only (if it exists)
ALTER TABLE roles DROP CONSTRAINT IF EXISTS roles_name_key;

-- 2. Add composite unique constraint on (name, tenant_id) if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'roles_name_tenant_unique'
      AND conrelid = 'roles'::regclass
  ) THEN
    ALTER TABLE roles ADD CONSTRAINT roles_name_tenant_unique UNIQUE (name, tenant_id);
  END IF;
END$$;

COMMIT;
