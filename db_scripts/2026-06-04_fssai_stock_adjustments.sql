-- Add FSSAI license number to tenants
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS fssai_number VARCHAR(20);

-- Stock adjustments table (shrinkage, write-off, surplus, correction)
CREATE TABLE IF NOT EXISTS stock_adjustments (
  id              SERIAL PRIMARY KEY,
  tenant_id       INTEGER NOT NULL,
  warehouse_id    INTEGER,
  product_id      INTEGER,
  product_name    VARCHAR(255),
  sku_code        VARCHAR(100),
  barcode         VARCHAR(100),
  adjustment_type VARCHAR(30)  NOT NULL,
  qty_change      NUMERIC(12,3) NOT NULL,
  unit_label      VARCHAR(20),
  reason_notes    TEXT,
  adjusted_by     VARCHAR(100),
  reference_no    VARCHAR(50),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
