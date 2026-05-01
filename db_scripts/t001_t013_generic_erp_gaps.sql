-- Generic ERP Gaps T001-T013 Schema
-- Run date: 2026-05-01
ALTER TABLE products ADD COLUMN IF NOT EXISTS item_type text DEFAULT 'goods';
ALTER TABLE products ADD COLUMN IF NOT EXISTS sac_code text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS reorder_point numeric(15,3) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS reorder_qty numeric(15,3) DEFAULT 0;
-- price_lists, item_variants, purchase_requisitions, goods_receipt_notes,
-- approval_rules, approval_requests, cost_centres, audit_log tables created.
-- See psql commands above.
