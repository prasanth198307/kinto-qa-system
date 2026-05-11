-- ============================================================
-- Fix cash register tenant isolation
-- Root cause: createCashRegisterDay/Transaction/ExpenseItem
--   never injected getCurrentTenantId() so every row defaulted
--   to tenant_id=1, causing cross-tenant data bleed.
-- ============================================================

-- Step 1: Fix cash_register_days using created_by → users.tenant_id
UPDATE cash_register_days crd
SET tenant_id = u.tenant_id
FROM users u
WHERE crd.created_by = u.id
  AND crd.tenant_id != u.tenant_id;

-- Step 2: Cascade fix to cash_register_transactions via their day
UPDATE cash_register_transactions crt
SET tenant_id = crd.tenant_id
FROM cash_register_days crd
WHERE crt.day_id = crd.id
  AND crt.tenant_id != crd.tenant_id;

-- Step 3: Cascade fix to cash_register_expense_items via their transaction
UPDATE cash_register_expense_items crei
SET tenant_id = crt.tenant_id
FROM cash_register_transactions crt
WHERE crei.transaction_id = crt.id
  AND crei.tenant_id != crt.tenant_id;

-- Step 4: Fix salesperson_mappings using user_id → users.tenant_id
UPDATE salesperson_mappings sm
SET tenant_id = u.tenant_id
FROM users u
WHERE sm.user_id = u.id
  AND sm.tenant_id IS DISTINCT FROM u.tenant_id;

-- Verification queries (run to confirm):
-- SELECT tenant_id, COUNT(*) FROM cash_register_days GROUP BY tenant_id ORDER BY tenant_id;
-- SELECT tenant_id, COUNT(*) FROM cash_register_transactions GROUP BY tenant_id ORDER BY tenant_id;
-- SELECT tenant_id, COUNT(*) FROM cash_register_expense_items GROUP BY tenant_id ORDER BY tenant_id;
