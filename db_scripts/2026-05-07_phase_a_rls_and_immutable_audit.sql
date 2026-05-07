-- =============================================================================
-- Phase A Security: PostgreSQL RLS + Immutable Audit Logs
-- Run: psql $DATABASE_URL -f db_scripts/2026-05-07_phase_a_rls_and_immutable_audit.sql
-- =============================================================================

-- ─── 1. Helper functions ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION app_set_tenant(tid INTEGER)
RETURNS VOID LANGUAGE sql AS $$
  SELECT set_config('app.current_tenant_id', tid::text, false);
$$;

CREATE OR REPLACE FUNCTION app_clear_tenant()
RETURNS VOID LANGUAGE sql AS $$
  SELECT set_config('app.current_tenant_id', '', false);
$$;

CREATE OR REPLACE FUNCTION app_current_tenant()
RETURNS INTEGER LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.current_tenant_id', true), '')::INTEGER;
$$;

-- ─── 2a. RLS for INTEGER tenant_id tables ────────────────────────────────────
DO $$
DECLARE
  tbl TEXT;
  excluded TEXT[] := ARRAY[
    'tenants','subscription_plans','session','audit_logs',
    'deletion_audit','billing_events','module_catalog','platform_settings',
    'demo_requests','account_subtypes'
  ];
  text_tenant_tables TEXT[] := ARRAY[
    'agri_procurement','appointments','classes','commodity_prices',
    'consignment_notes','crop_cycles','edu_discounts','edu_installment_plans',
    'edu_scholarships','farms','fee_components','fee_payments','fee_structures',
    'ipd_admissions','logistics_vehicles','patients','pos_sessions',
    'pos_transactions','re_bookings','re_payment_schedules','re_projects',
    're_units','student_discounts','student_fee_assignments','student_fee_ledger',
    'student_scholarships','students','trips','wards'
  ];
BEGIN
  FOR tbl IN
    SELECT DISTINCT c.table_name
    FROM information_schema.columns c
    WHERE c.column_name = 'tenant_id'
      AND c.table_schema = 'public'
      AND c.data_type = 'integer'
      AND c.table_name != ALL(excluded)
      AND c.table_name != ALL(text_tenant_tables)
    ORDER BY c.table_name
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', tbl);
    EXECUTE format($policy$
      CREATE POLICY tenant_isolation ON %I
        AS PERMISSIVE FOR ALL
        USING (
          app_current_tenant() IS NULL
          OR tenant_id = app_current_tenant()
        )
        WITH CHECK (
          app_current_tenant() IS NULL
          OR tenant_id = app_current_tenant()
        )
    $policy$, tbl);
    RAISE NOTICE 'RLS (int) enabled: %', tbl;
  END LOOP;
END $$;

-- ─── 2b. RLS for TEXT tenant_id tables (industry verticals) ──────────────────
DO $$
DECLARE
  tbl TEXT;
  text_tenant_tables TEXT[] := ARRAY[
    'agri_procurement','appointments','classes','commodity_prices',
    'consignment_notes','crop_cycles','edu_discounts','edu_installment_plans',
    'edu_scholarships','farms','fee_components','fee_payments','fee_structures',
    'ipd_admissions','logistics_vehicles','patients','pos_sessions',
    'pos_transactions','re_bookings','re_payment_schedules','re_projects',
    're_units','student_discounts','student_fee_assignments','student_fee_ledger',
    'student_scholarships','students','trips','wards'
  ];
BEGIN
  FOREACH tbl IN ARRAY text_tenant_tables LOOP
    -- Check table exists before enabling RLS
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
      EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tbl);
      EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', tbl);
      -- Compare as text (these tables store tenant_id as text/varchar)
      EXECUTE format($policy$
        CREATE POLICY tenant_isolation ON %I
          AS PERMISSIVE FOR ALL
          USING (
            app_current_tenant() IS NULL
            OR tenant_id = app_current_tenant()::text
          )
          WITH CHECK (
            app_current_tenant() IS NULL
            OR tenant_id = app_current_tenant()::text
          )
      $policy$, tbl);
      RAISE NOTICE 'RLS (text) enabled: %', tbl;
    END IF;
  END LOOP;
END $$;

-- ─── 3. Immutable audit_logs ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION audit_logs_immutable()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION
    'SECURITY: audit_logs records are immutable. Modification or deletion is not permitted. (Row ID: %)', OLD.id;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_logs_no_update ON audit_logs;
CREATE TRIGGER trg_audit_logs_no_update
  BEFORE UPDATE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION audit_logs_immutable();

DROP TRIGGER IF EXISTS trg_audit_logs_no_delete ON audit_logs;
CREATE TRIGGER trg_audit_logs_no_delete
  BEFORE DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION audit_logs_immutable();

-- ─── 4. Enhance audit_logs columns ───────────────────────────────────────────
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip_address  VARCHAR(45);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_agent  TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS severity    VARCHAR(20) DEFAULT 'info';

CREATE INDEX IF NOT EXISTS idx_audit_logs_ip        ON audit_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity  ON audit_logs(severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_ts ON audit_logs(tenant_id, created_at DESC);

COMMENT ON TABLE audit_logs IS 'Immutable security audit trail. DELETE/UPDATE blocked by trigger.';

SELECT 'Phase A Security: RLS + Immutable Audit COMPLETE' AS status;
