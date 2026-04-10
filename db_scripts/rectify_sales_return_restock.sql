-- Rectify wrong finished_goods rows created by old restock logic
-- Old logic: inserted NEW row with productionDate = today
-- Correct logic: update existing batch row quantity + log to finished_goods_return_log
--
-- This script:
-- 1. For each wrong restock row, find the original production batch
-- 2. If found: merge quantity into it, deactivate wrong row
-- 3. If not found: fix production_date to use sales return date
-- 4. Insert log entries for traceability
-- Run this ONCE on OCI after deploying the new code.

BEGIN;

-- Show what will be fixed (dry run view)
SELECT
  fg.id AS wrong_fg_id,
  fg.batch_number,
  fg.quantity AS wrong_qty,
  fg.production_date AS wrong_prod_date,
  fg.sales_return_item_id,
  orig.id AS original_fg_id,
  orig.production_date AS correct_prod_date,
  orig.quantity AS orig_qty
FROM finished_goods fg
LEFT JOIN finished_goods orig ON (
  orig.product_id = fg.product_id
  AND orig.batch_number = fg.batch_number
  AND orig.source IN ('production', 'sales_return_repack')
  AND orig.quality_status = 'approved'
  AND orig.record_status = 1
  AND orig.id != fg.id
)
WHERE fg.source = 'sales_return_restock'
  AND fg.record_status = 1;

-- Step 1: Merge quantity into original batch (where it exists) + log
INSERT INTO finished_goods_return_log
  (finished_good_id, sales_return_id, sales_return_item_id, quantity_added, description, restocked_at)
SELECT
  orig.id,
  sri.return_id,
  fg.sales_return_item_id,
  fg.quantity,
  'Rectified: merged from wrong restock row ' || fg.id || ' (had production_date=' || fg.production_date::date || ')',
  fg.created_at
FROM finished_goods fg
JOIN finished_goods orig ON (
  orig.product_id = fg.product_id
  AND orig.batch_number = fg.batch_number
  AND orig.source IN ('production', 'sales_return_repack')
  AND orig.quality_status = 'approved'
  AND orig.record_status = 1
  AND orig.id != fg.id
)
LEFT JOIN sales_return_items sri ON sri.id = fg.sales_return_item_id
WHERE fg.source = 'sales_return_restock'
  AND fg.record_status = 1;

-- Step 2: Add the quantity to the original batch row
UPDATE finished_goods AS orig
SET quantity = orig.quantity + fg.quantity,
    updated_at = NOW()
FROM finished_goods fg
WHERE fg.source = 'sales_return_restock'
  AND fg.record_status = 1
  AND orig.product_id = fg.product_id
  AND orig.batch_number = fg.batch_number
  AND orig.source IN ('production', 'sales_return_repack')
  AND orig.quality_status = 'approved'
  AND orig.record_status = 1
  AND orig.id != fg.id;

-- Step 3: Deactivate the wrong restock rows that were merged
UPDATE finished_goods
SET record_status = 0,
    remarks = COALESCE(remarks, '') || ' [RECTIFIED: merged into original batch on ' || NOW()::date || ']',
    updated_at = NOW()
WHERE source = 'sales_return_restock'
  AND record_status = 1
  AND id IN (
    -- Only deactivate rows that HAVE been merged (original batch exists)
    SELECT fg.id FROM finished_goods fg
    WHERE EXISTS (
      SELECT 1 FROM finished_goods orig
      WHERE orig.product_id = fg.product_id
        AND orig.batch_number = fg.batch_number
        AND orig.source IN ('production', 'sales_return_repack')
        AND orig.quality_status = 'approved'
        AND orig.record_status = 1
        AND orig.id != fg.id
    )
  );

-- Step 4: For restock rows where original batch NOT found — fix production_date to return date
UPDATE finished_goods fg
SET production_date = COALESCE(
      (SELECT sr.return_date FROM sales_returns sr
       JOIN sales_return_items sri ON sri.return_id = sr.id
       WHERE sri.id = fg.sales_return_item_id LIMIT 1),
      fg.created_at  -- fallback to when it was created
    ),
    remarks = COALESCE(remarks, '') || ' [RECTIFIED: production_date fixed from return date on ' || NOW()::date || ']',
    updated_at = NOW()
WHERE fg.source = 'sales_return_restock'
  AND fg.record_status = 1  -- still active = not merged above
  AND fg.id NOT IN (
    SELECT fg2.id FROM finished_goods fg2
    WHERE EXISTS (
      SELECT 1 FROM finished_goods orig
      WHERE orig.product_id = fg2.product_id
        AND orig.batch_number = fg2.batch_number
        AND orig.source IN ('production', 'sales_return_repack')
        AND orig.quality_status = 'approved'
        AND orig.record_status = 1
        AND orig.id != fg2.id
    )
    AND fg2.source = 'sales_return_restock'
  );

-- Summary
SELECT
  'Merged into original batch' AS action,
  COUNT(*) AS rows_affected
FROM finished_goods
WHERE source = 'sales_return_restock' AND record_status = 0
  AND remarks LIKE '%RECTIFIED%'
UNION ALL
SELECT
  'Production date fixed (no original batch found)' AS action,
  COUNT(*) AS rows_affected
FROM finished_goods
WHERE source = 'sales_return_restock' AND record_status = 1
  AND remarks LIKE '%RECTIFIED%';

COMMIT;
