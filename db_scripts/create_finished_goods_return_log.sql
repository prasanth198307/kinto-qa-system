-- Child table: logs every sales-return restock event against a finished_goods row
CREATE TABLE IF NOT EXISTS finished_goods_return_log (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  finished_good_id VARCHAR NOT NULL REFERENCES finished_goods(id),
  sales_return_id VARCHAR NOT NULL,
  sales_return_item_id VARCHAR,
  quantity_added INTEGER NOT NULL,
  description TEXT,
  restocked_by VARCHAR REFERENCES users(id),
  restocked_at TIMESTAMP DEFAULT NOW(),
  record_status INTEGER NOT NULL DEFAULT 1,
  tenant_id INTEGER DEFAULT 1
);
