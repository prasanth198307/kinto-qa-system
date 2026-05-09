-- Remove all Row Level Security from SwachERP
-- Date: 2026-05-09
-- Reason: RLS was causing cross-tenant contamination via pool connection reuse
--         and GUC (set_config) state leaking between requests.
--         Tenant isolation is now handled purely at application layer via
--         tc() helper (AsyncLocalStorage tenantId) and explicit WHERE tenant_id = ?

-- Drop the GUC helper function
DROP FUNCTION IF EXISTS app_current_tenant() CASCADE;

-- Disable RLS + drop policy on all tenant tables
-- (226 tables — run the following to regenerate if needed)
-- SELECT 'DROP POLICY IF EXISTS tenant_isolation ON ' || quote_ident(tablename) || '; ALTER TABLE ' || quote_ident(tablename) || ' DISABLE ROW LEVEL SECURITY;'
-- FROM pg_tables WHERE schemaname='public' AND rowsecurity = true ORDER BY tablename;

-- Already applied via dynamic SQL on 2026-05-09
