-- GRN approval flow + stock adjustment approval gate

-- Stock adjustments: approval columns
ALTER TABLE stock_adjustments ADD COLUMN IF NOT EXISTS unit_price   NUMERIC(12,2) DEFAULT 0;
ALTER TABLE stock_adjustments ADD COLUMN IF NOT EXISTS total_value  NUMERIC(12,2) DEFAULT 0;
ALTER TABLE stock_adjustments ADD COLUMN IF NOT EXISTS status       VARCHAR(20)   DEFAULT 'approved';
ALTER TABLE stock_adjustments ADD COLUMN IF NOT EXISTS approved_by  VARCHAR(100);
ALTER TABLE stock_adjustments ADD COLUMN IF NOT EXISTS approved_at  TIMESTAMPTZ;
ALTER TABLE stock_adjustments ADD COLUMN IF NOT EXISTS rejected_reason TEXT;

-- GRN approval columns
ALTER TABLE goods_receipt_notes ADD COLUMN IF NOT EXISTS submitted_by_id  INT;
ALTER TABLE goods_receipt_notes ADD COLUMN IF NOT EXISTS submitted_at      TIMESTAMPTZ;
ALTER TABLE goods_receipt_notes ADD COLUMN IF NOT EXISTS approved_by_id    INT;
ALTER TABLE goods_receipt_notes ADD COLUMN IF NOT EXISTS approved_at       TIMESTAMPTZ;

-- Extend GRN status check to include draft + submitted
ALTER TABLE goods_receipt_notes DROP CONSTRAINT IF EXISTS goods_receipt_notes_status_check;
ALTER TABLE goods_receipt_notes ADD CONSTRAINT goods_receipt_notes_status_check
  CHECK (status IN ('draft','submitted','received','inspected','posted','rejected'));
