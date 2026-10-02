-- Journal Integrity: Backfill missing credit_note and debit_note journals
-- Date: 2026-10-03
-- Purpose: Find all issued credit notes and debit notes that have no journal entry
--          and create the missing journals so the ledger matches VH going forward.
--
-- NOTE: Run AFTER deploying the updated routes.ts and journal-service.ts.
--       Future CREATE/DELETE operations will now auto-maintain journals.
--       This script only backfills historical records that were created before the fix.

-- ============================================================
-- 1. REPORT: Credit notes missing journals
-- ============================================================
SELECT
  cn.note_number,
  cn.grand_total / 100.0 AS amount,
  cn.credit_date,
  i.invoice_number,
  i.buyer_name
FROM credit_notes cn
LEFT JOIN invoices i ON i.id = cn.invoice_id
LEFT JOIN journal_entries je ON je.source_type = 'credit_note'
  AND je.source_id = cn.id AND je.record_status = 1
WHERE cn.record_status = 1
  AND cn.status = 'issued'
  AND cn.tenant_id = 1
  AND je.id IS NULL
ORDER BY cn.credit_date;

-- ============================================================
-- 2. REPORT: Debit notes missing journals
-- ============================================================
SELECT
  dn.note_number,
  dn.grand_total / 100.0 AS amount,
  dn.debit_date,
  i.invoice_number,
  i.buyer_name
FROM debit_notes dn
LEFT JOIN invoices i ON i.id = dn.invoice_id
LEFT JOIN journal_entries je ON je.source_type = 'debit_note'
  AND je.source_id = dn.id AND je.record_status = 1
WHERE dn.record_status = 1
  AND dn.status = 'issued'
  AND dn.tenant_id = 1
  AND je.id IS NULL
ORDER BY dn.debit_date;

-- ============================================================
-- 3. REPORT: Orphaned invoice journals (invoice deleted but journal active)
-- ============================================================
SELECT
  je.journal_number,
  je.journal_date,
  je.description,
  je.total_debit / 100.0 AS amount
FROM journal_entries je
WHERE je.source_type = 'invoice'
  AND je.record_status = 1
  AND je.tenant_id = 1
  AND NOT EXISTS (
    SELECT 1 FROM invoices i
    WHERE i.id = je.source_id AND i.record_status = 1
  )
ORDER BY je.journal_date;

-- ============================================================
-- 4. FIX: Void orphaned invoice journals (invoice deleted but journal active)
-- ============================================================
UPDATE journal_entries SET record_status = 0
WHERE source_type = 'invoice'
  AND record_status = 1
  AND tenant_id = 1
  AND NOT EXISTS (
    SELECT 1 FROM invoices i WHERE i.id = source_id AND i.record_status = 1
  );

UPDATE journal_lines SET record_status = 0
WHERE journal_id IN (
  SELECT id FROM journal_entries
  WHERE source_type = 'invoice' AND record_status = 0 AND tenant_id = 1
)
AND record_status = 1;

-- ============================================================
-- 5. FIX: Void orphaned payment journals (payment deleted/cancelled but journal active)
-- ============================================================
UPDATE journal_entries SET record_status = 0
WHERE source_type = 'payment'
  AND record_status = 1
  AND tenant_id = 1
  AND NOT EXISTS (
    SELECT 1 FROM invoice_payments ip
    WHERE ip.id = source_id
      AND ip.record_status = 1
      AND ip.cancelled_at IS NULL
  );
