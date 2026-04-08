-- ============================================================
-- ADD is_internal FLAG FOR KINTO'S OWN TENANTS
-- Adds a dedicated is_internal boolean column to distinguish
-- Kinto's own tenants from real paying customers.
--
-- Tenant 1 (KINTO)       = Kinto's own manufacturing company.
--                          Uses the full ERP as a real tenant
--                          but is NOT a paying customer. Login
--                          and all ERP functionality unaffected.
-- Tenant 6 (Kinto Admin) = Super-admin portal tenant.
--
-- Effect of is_internal = true on a tenant:
--   • Excluded from MRR / ARR revenue summary
--   • Excluded from the billing subscriptions list
--   • Shown as "Platform Owner" in the admin tenants table
--     (plan, status, trial-ends columns suppressed)
--   • NO impact on login, session, routing, or ERP features
--     (unlike is_super_admin which drives portal routing)
-- ============================================================

ALTER TABLE tenants
    ADD COLUMN IF NOT EXISTS is_internal BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE tenants
   SET is_internal = TRUE
 WHERE id IN (1, 6);
