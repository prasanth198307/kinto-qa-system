-- Seed role_permissions for all new modules (Phase 1–5, T001–T016, Industry Verticals)
-- Run date: 2026-05-01
-- Logic:
--   admin / accountsmanager → full access  (1,1,1,1)
--   manager                 → no delete    (1,1,1,0)
--   operator                → view+create  (1,1,0,0)
--   reviewer                → view only    (1,0,0,0)
--   any other custom role   → view only    (1,0,0,0)

INSERT INTO role_permissions (role_id, screen_key, can_view, can_create, can_edit, can_delete)
SELECT
    r.id AS role_id,
    sk.screen_key,
    1 AS can_view,
    CASE WHEN lower(r.name) IN ('admin','accountsmanager','billing manager') THEN 1
         WHEN lower(r.name) = 'manager'  THEN 1
         WHEN lower(r.name) = 'operator' THEN 1
         ELSE 0
    END AS can_create,
    CASE WHEN lower(r.name) IN ('admin','accountsmanager','billing manager') THEN 1
         WHEN lower(r.name) = 'manager'  THEN 1
         ELSE 0
    END AS can_edit,
    CASE WHEN lower(r.name) IN ('admin','accountsmanager','billing manager') THEN 1
         ELSE 0
    END AS can_delete
FROM roles r
CROSS JOIN (VALUES
    -- Phase 2
    ('hr_expense_claims'),
    ('recurring_invoices'),
    -- Phase 3
    ('warehouses'),
    ('stock_transfers'),
    ('serial_lot_register'),
    -- Phase 4
    ('projects'),
    ('timesheets'),
    -- Phase 5
    ('fixed_assets'),
    ('hr_appraisals'),
    ('currency_management'),
    -- T001
    ('price_lists'),
    -- T003
    ('purchase_requisitions'),
    -- T004
    ('goods_receipt_notes'),
    -- T006
    ('approval_workflows'),
    -- T007
    ('cost_centres'),
    -- T013
    ('gst_reports'),
    -- T014
    ('audit_trail'),
    -- Industry Verticals
    ('healthcare'),
    ('education'),
    ('logistics_transport'),
    ('real_estate'),
    ('pos'),
    ('agriculture')
) AS sk(screen_key)
-- Only insert if this role+screen combination does not already exist
WHERE NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = r.id AND rp.screen_key = sk.screen_key
);
