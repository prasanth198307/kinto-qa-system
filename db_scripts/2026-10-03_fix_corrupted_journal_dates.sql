-- Fix 4 journal entries with corrupted dates (missing century prefix '20')
-- Affected: Kinto-Isukathota (2025-11-05) and KINTO-KANCHARAPALEM (2025-07-29)

BEGIN;

-- Fix Nov 5, 2025 journal entries (stored as 0005-11-05)
UPDATE journal_entries
SET journal_date = '2025-11-05',
    journal_number = CASE id
      WHEN 'e737877c-a587-4e90-935e-18616cacaa98' THEN 'JRN-20251105-0001'
      WHEN '888350e8-cbdd-443d-9df3-73401757ec92' THEN 'JRN-20251105-0002'
    END
WHERE id IN ('e737877c-a587-4e90-935e-18616cacaa98','888350e8-cbdd-443d-9df3-73401757ec92');

-- Fix Jul 29, 2025 payment dates (stored as 0025-07-29)
UPDATE invoice_payments
SET payment_date = '2025-07-29'
WHERE id IN ('42c1aa76-3042-4374-8bb5-4b087b014f7a','6ad35f3f-d5c2-41bf-a932-28e992bce82f');

-- Fix Jul 29, 2025 journal entries (stored as 0025-07-29)
UPDATE journal_entries
SET journal_date = '2025-07-29',
    journal_number = CASE id
      WHEN '55a3e660-b03d-4196-b369-379bbbe16422' THEN 'JRN-20250729-0001'
      WHEN '8b7a3ed9-178e-4e0a-b73e-13f5f043919f' THEN 'JRN-20250729-0002'
    END
WHERE id IN ('55a3e660-b03d-4196-b369-379bbbe16422','8b7a3ed9-178e-4e0a-b73e-13f5f043919f');

COMMIT;
