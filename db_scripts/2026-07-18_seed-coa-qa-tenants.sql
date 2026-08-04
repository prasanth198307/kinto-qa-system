-- Seed full Chart of Accounts for QA tenants (id > 1000) that have fewer than 50 accounts
-- Copies from tenant 1's standard CoA
DO $$
DECLARE
  tid INTEGER;
BEGIN
  FOR tid IN SELECT id FROM tenants WHERE id > 1000 LOOP
    IF (SELECT count(*) FROM chart_of_accounts WHERE tenant_id = tid) < 50 THEN
      DELETE FROM chart_of_accounts WHERE tenant_id = tid AND code NOT LIKE 'QA%';
      INSERT INTO chart_of_accounts (id, code, name, account_type, sub_type, description, is_active, is_system_account, record_status, node_type, level, tenant_id)
      SELECT gen_random_uuid(), c1.code, c1.name, c1.account_type, c1.sub_type, c1.description, c1.is_active, c1.is_system_account, c1.record_status, c1.node_type, c1.level, tid
      FROM chart_of_accounts c1
      WHERE c1.tenant_id=1
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END;
$$;
