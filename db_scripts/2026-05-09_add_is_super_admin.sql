-- Add is_super_admin column to users table
-- This column was defined in Drizzle schema but never migrated to the DB.
-- Super-admins are identified by belonging to the "kinto-admin" tenant (id=6).

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_super_admin boolean DEFAULT false;

-- Mark all users in the kinto-admin tenant as super-admins
UPDATE users SET is_super_admin = true WHERE tenant_id = 6;

-- Verify
SELECT id, username, email, tenant_id, is_super_admin FROM users WHERE is_super_admin = true;
