-- Migration: align jw_cad_process columns with CAD form v2
-- Run: psql $DATABASE_URL -f db_scripts/2026-05-07_cad_process_columns.sql

-- 1. Add columns the form/routes use that are missing from the DB
ALTER TABLE jw_cad_process
  ADD COLUMN IF NOT EXISTS cad_software        VARCHAR(60),
  ADD COLUMN IF NOT EXISTS status              VARCHAR(30)  DEFAULT 'in_progress',
  ADD COLUMN IF NOT EXISTS customer_approval   INTEGER      DEFAULT 0,
  ADD COLUMN IF NOT EXISTS revision_count      INTEGER      DEFAULT 0,
  ADD COLUMN IF NOT EXISTS render_image_url    TEXT,
  ADD COLUMN IF NOT EXISTS design_notes        TEXT,
  ADD COLUMN IF NOT EXISTS mcx_rate            NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS stone_placement_verified INTEGER DEFAULT 0;

-- 2. Back-fill cad_software from the existing software_used column
UPDATE jw_cad_process
SET cad_software = software_used
WHERE cad_software IS NULL AND software_used IS NOT NULL;

-- 3. Back-fill revision_count from the existing cad_version column
UPDATE jw_cad_process
SET revision_count = COALESCE(cad_version, 0)
WHERE revision_count = 0 AND cad_version IS NOT NULL;

-- 4. Back-fill stone_placement_verified from stone_placement_ok
UPDATE jw_cad_process
SET stone_placement_verified = COALESCE(stone_placement_ok, 0)
WHERE stone_placement_verified = 0;

-- 5. Set status from approval_status where possible
UPDATE jw_cad_process
SET status = CASE
  WHEN approval_status = 'approved'  THEN 'approved'
  WHEN approval_status = 'revision'  THEN 'in_progress'
  ELSE 'in_progress'
END
WHERE status = 'in_progress';

-- 6. Set customer_approval flag from approval_status
UPDATE jw_cad_process
SET customer_approval = CASE WHEN approval_status = 'approved' THEN 1 ELSE 0 END
WHERE customer_approval = 0;

SELECT 'jw_cad_process migration complete' AS result,
       COUNT(*) AS total_rows
FROM jw_cad_process;
