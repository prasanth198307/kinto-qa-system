-- Fix SO-20260722-003-2973: item amounts were stored 100x too large
-- due to double paise conversion bug (frontend sent paise, server multiplied by 100 again).
-- Also fix the SO number to remove the random suffix.

-- Step 1: Fix item amounts (divide all stored amounts by 100)
UPDATE sales_order_items
SET
  unit_price     = unit_price / 100,
  taxable_amount = taxable_amount / 100,
  total_amount   = total_amount / 100
WHERE so_id IN (
  SELECT id FROM sales_orders WHERE so_number = 'SO-20260722-003-2973'
)
  AND record_status = 1;

-- Step 2: Fix the SO total_amount as well
UPDATE sales_orders
SET
  total_amount = total_amount / 100,
  so_number    = 'SO-20260722-003'
WHERE so_number = 'SO-20260722-003-2973';
