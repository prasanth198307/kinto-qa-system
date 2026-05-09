-- ============================================================
-- REMOVE ALL ROW LEVEL SECURITY FROM PRODUCTION DATABASE
-- Run this on the production server to restore data visibility.
-- Safe to run multiple times (IF EXISTS / idempotent).
-- ============================================================

-- Step 1: Drop the tenant GUC helper function
DROP FUNCTION IF EXISTS app_current_tenant() CASCADE;

-- Step 2: Dynamically drop every RLS policy and disable RLS on every table
DO $$
DECLARE
  rec RECORD;
  pol RECORD;
BEGIN
  -- Drop all policies in public schema
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
      pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;

  -- Disable RLS on all tables that have it enabled
  FOR rec IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND rowsecurity = true
  LOOP
    EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', rec.tablename);
  END LOOP;
END;
$$;

-- Step 3: Verify — should return 0 rows if fully removed
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public';

-- Step 4: Verify RLS disabled — should return 0 rows
SELECT tablename FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = true;

SELECT 'RLS removal complete' AS status;
