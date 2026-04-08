-- ============================================================
-- PHASE 4: ROLE-BASED ACCESS CONTROL (RBAC)
-- Creates the roles and role_permissions tables.
-- Roles are per-tenant. Permissions are per-role per screen.
-- Built-in roles (admin, manager, accountsmanager) bypass DB
-- permission checks in code; operator/reviewer/custom roles
-- use the role_permissions table.
-- ============================================================

-- ── Roles table ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roles (
    id            VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    name          VARCHAR NOT NULL,
    description   TEXT,
    permissions   TEXT[],
    created_at    TIMESTAMP DEFAULT NOW(),
    updated_at    TIMESTAMP DEFAULT NOW(),
    record_status INTEGER NOT NULL DEFAULT 1,
    tenant_id     INTEGER REFERENCES tenants(id)
);

-- ── Role permissions table ───────────────────────────────────
-- One row per (role, screen_key) combination.
-- screen_key maps to a frontend page/module (e.g. "invoices", "production").
CREATE TABLE IF NOT EXISTS role_permissions (
    id            VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id       VARCHAR NOT NULL,
    screen_key    VARCHAR NOT NULL,
    can_view      INTEGER NOT NULL DEFAULT 0,
    can_create    INTEGER NOT NULL DEFAULT 0,
    can_edit      INTEGER NOT NULL DEFAULT 0,
    can_delete    INTEGER NOT NULL DEFAULT 0,
    record_status INTEGER NOT NULL DEFAULT 1,
    created_at    TIMESTAMP DEFAULT NOW(),
    updated_at    TIMESTAMP DEFAULT NOW(),
    tenant_id     INTEGER DEFAULT 1 REFERENCES tenants(id)
);

-- Prevent duplicate permission rows per role+screen per tenant
CREATE UNIQUE INDEX IF NOT EXISTS role_permissions_role_screen_tenant_unique
    ON role_permissions (role_id, screen_key, tenant_id);

-- ── Seed default built-in roles for tenant 1 (demo) ─────────
-- These are reference rows only — code bypasses DB for admin/manager/accountsmanager.
INSERT INTO roles (id, name, description, tenant_id) VALUES
    ('admin',           'Admin',            'Full system access — bypasses permission checks',       1),
    ('manager',         'Manager',          'Broad operational access — bypasses permission checks', 1),
    ('accountsmanager', 'Accounts Manager', 'Accounts & finance access — bypasses permission checks', 1),
    ('operator',        'Operator',         'Production floor operator — uses DB permission checks', 1),
    ('reviewer',        'Reviewer',         'Read-only reviewer — uses DB permission checks',        1)
ON CONFLICT (id) DO NOTHING;
