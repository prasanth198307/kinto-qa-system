-- ============================================================
-- SEED: SUPER-ADMIN TENANT & USER
-- Run this once on a fresh database after all schema phases
-- (phase1 through phase11) have been applied.
--
-- Default login credentials:
--   Username : superadmin
--   Password : superadmin123
--   Email    : admin@kintosmartops.com
--
-- IMPORTANT: Change the password after first login.
-- ============================================================

-- ── 1. Super-admin tenant ────────────────────────────────────
INSERT INTO tenants (name, slug, plan, status, is_super_admin, max_users)
VALUES ('Kinto Admin', 'kinto-admin', 'enterprise', 'active', TRUE, 999)
ON CONFLICT (slug) DO NOTHING;

-- ── 2. Super-admin user ──────────────────────────────────────
-- Password "superadmin123" hashed with scrypt (salt:derivedKey)
INSERT INTO users (username, email, password, role, first_name, last_name, tenant_id, record_status)
SELECT
    'superadmin',
    'admin@kintosmartops.com',
    '26c945ee2d3a4d178e8822b4698d103b:1a56c4e163762550e730aaff77c60e8c07b0ded1f3d822d1959394fbf302b3cea67d6811ce1c6baee895699b62d3e6b7bc35195a01bd7a954d33b0b503a78a4c',
    'admin',
    'Kinto',
    'Super Admin',
    t.id,
    1
FROM tenants t
WHERE t.slug = 'kinto-admin'
ON CONFLICT DO NOTHING;

-- ── 3. Verify ────────────────────────────────────────────────
SELECT
    u.username,
    u.email,
    u.role,
    t.name  AS tenant_name,
    t.slug  AS tenant_slug,
    t.is_super_admin
FROM users u
JOIN tenants t ON t.id = u.tenant_id
WHERE t.is_super_admin = TRUE;
