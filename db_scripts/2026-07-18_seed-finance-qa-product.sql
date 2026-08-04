-- Seed a generic service product for Finance ERP QA tenant (8300)
-- Used by functional tests that need a productId for invoice item creation

INSERT INTO products (id, product_code, product_name, item_type, tenant_id, record_status)
VALUES (
  'qa-fin-svc-8300',
  'QA-FIN-SVC-001',
  'QA Finance Service',
  'service',
  8300,
  1
)
ON CONFLICT (id) DO NOTHING;
