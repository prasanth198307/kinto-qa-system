-- Work Orders table for Manufacturing ERP Phase 7O
-- Lifecycle: planned → released → in_progress → completed / cancelled

CREATE TABLE IF NOT EXISTS work_orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       INTEGER NOT NULL DEFAULT 1,
  work_order_number VARCHAR(50) NOT NULL,
  product_id      VARCHAR(255) REFERENCES products(id),
  uom_id          INTEGER REFERENCES unit_of_measurements(id),
  planned_qty     NUMERIC(12,3) NOT NULL DEFAULT 0,
  produced_qty    NUMERIC(12,3) NOT NULL DEFAULT 0,
  rejected_qty    NUMERIC(12,3) NOT NULL DEFAULT 0,
  status          VARCHAR(20)  NOT NULL DEFAULT 'planned'
                    CHECK (status IN ('planned','released','in_progress','completed','cancelled')),
  priority        VARCHAR(10)  NOT NULL DEFAULT 'medium'
                    CHECK (priority IN ('low','medium','high','urgent')),
  planned_start_date DATE NOT NULL,
  planned_end_date   DATE,
  actual_start_date  DATE,
  actual_end_date    DATE,
  shift           VARCHAR(20),
  sales_order_id  VARCHAR(255),
  issuance_id     VARCHAR(255),
  notes           TEXT,
  created_by      VARCHAR(255) REFERENCES users(id),
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_work_orders_tenant   ON work_orders (tenant_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status   ON work_orders (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_work_orders_product  ON work_orders (tenant_id, product_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_dates    ON work_orders (tenant_id, planned_start_date, planned_end_date);
