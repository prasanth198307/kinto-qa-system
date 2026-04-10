-- Multi-role support: user_roles junction table
-- Allows a user to be assigned multiple roles (permissions are ORed across all roles)
CREATE TABLE IF NOT EXISTS user_roles (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id VARCHAR NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  tenant_id INTEGER NOT NULL,
  record_status INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, role_id)
);
-- Backfill from existing single role_id column
INSERT INTO user_roles (user_id, role_id, tenant_id)
SELECT id, role_id, tenant_id FROM users
WHERE role_id IS NOT NULL AND role_id != ''
ON CONFLICT DO NOTHING;
