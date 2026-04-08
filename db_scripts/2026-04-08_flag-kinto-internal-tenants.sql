-- ============================================================
-- FLAG KINTO'S OWN TENANTS AS INTERNAL (is_super_admin = true)
-- Tenant 1 (KINTO)      = the superadmin's own manufacturing company.
--                         Uses the full ERP as a real tenant but is
--                         NOT a paying customer and must be excluded
--                         from MRR/ARR and billing views.
-- Tenant 6 (Kinto Admin) = the super-admin portal tenant (already
--                          flagged during initial seed).
--
-- Effect of is_super_admin = true on a tenant:
--   • Excluded from MRR / ARR revenue summary calculations
--   • Excluded from the billing subscription list
--   • Shown as "Platform Owner" in the admin tenants table
--   • Cannot be deleted via the admin delete-data endpoint
--   • No impact on ERP functionality (no ERP route checks this flag)
-- ============================================================

UPDATE tenants
   SET is_super_admin = TRUE
 WHERE id IN (1, 6);
