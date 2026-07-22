-- Fix SO-20260722-003-2973: item amounts were stored 100x too large
-- due to double paise conversion bug in POST /api/sales-orders.
-- The server multiplied by 100 even though frontend already sent paise.
-- Note: SO header total_amount was correctly stored (no extra multiplication).
-- This script also renames the SO to remove the random number suffix.

-- Step 1: Fix item amounts (divide by 100 — they were stored as paise*100)
UPDATE sales_order_items
SET
  unit_price     = unit_price / 100,
  taxable_amount = taxable_amount / 100,
  total_amount   = total_amount / 100
WHERE so_id IN (
  SELECT id FROM sales_orders WHERE so_number = 'SO-20260722-003-2973'
)
  AND record_status = 1;

-- Step 2: Fix SO number and recalculate header total from items
UPDATE sales_orders so
SET
  so_number    = 'SO-20260722-003',
  total_amount = (
    SELECT COALESCE(SUM(soi.total_amount), 0)
    FROM sales_order_items soi
    WHERE soi.so_id = so.id AND soi.record_status = 1
  )
WHERE so.so_number = 'SO-20260722-003-2973';
