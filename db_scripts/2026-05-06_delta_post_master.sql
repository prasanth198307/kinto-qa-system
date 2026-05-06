-- ============================================================
--  SwachERP — POST-MASTER DELTA MIGRATION
--  Run AFTER swacherp_master_migration.sql
--  Covers all changes made after 2026-05-05 master snapshot.
--  100% idempotent — safe to re-run.
--  Connect: psql "$DATABASE_URL" -f db_scripts/2026-05-06_delta_post_master.sql
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Education: named unique constraints (required for ON CONFLICT)
--    Master has the indexes; now add named constraints for upsert support.
-- ─────────────────────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'exam_marks_exam_student_uidx' AND conrelid = 'exam_marks'::regclass
  ) THEN
    ALTER TABLE exam_marks ADD CONSTRAINT exam_marks_exam_student_uidx UNIQUE (examination_id, student_id);
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'exam_marks constraint already exists or could not be added: %', SQLERRM;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fsc_structure_component_uidx' AND conrelid = 'fee_structure_components'::regclass
  ) THEN
    ALTER TABLE fee_structure_components ADD CONSTRAINT fsc_structure_component_uidx UNIQUE (structure_id, component_id);
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'fee_structure_components constraint already exists or could not be added: %', SQLERRM;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 2. Education Fees: gross_amount + discount_amount on fee_payments
--    Tracks original fee amount and any scholarship/discount applied.
-- ─────────────────────────────────────────────────────────────

ALTER TABLE fee_payments ADD COLUMN IF NOT EXISTS gross_amount INTEGER DEFAULT 0;
ALTER TABLE fee_payments ADD COLUMN IF NOT EXISTS discount_amount INTEGER DEFAULT 0;

-- ─────────────────────────────────────────────────────────────
-- 3. Module Marketplace: per-tenant module selection on subscriptions
-- ─────────────────────────────────────────────────────────────

ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS selected_modules JSONB DEFAULT '[]';
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS monthly_amount INTEGER DEFAULT 0;

-- ============================================================
--  END OF DELTA MIGRATION
-- ============================================================
