-- Retroactive: grant CRM sub-screen permissions to existing admin/manager roles
-- Idempotent: WHERE NOT EXISTS prevents duplicates

DO $$
DECLARE
  screen_keys_full TEXT[] := ARRAY[
    'crm_leads', 'crm_pipeline', 'crm_contacts', 'crm_accounts',
    'crm_activities', 'crm_quotations'
  ];
  screen_keys_limited TEXT[] := ARRAY[
    'crm_email_campaigns', 'crm_whatsapp', 'crm_telephony'
  ];
  screen_keys_view TEXT[] := ARRAY['crm_reports'];
  actions_full TEXT[] := ARRAY['view', 'create', 'edit', 'delete'];
  actions_limited TEXT[] := ARRAY['view', 'create'];
  actions_view TEXT[] := ARRAY['view'];
  sk TEXT;
  role_rec RECORD;
BEGIN
  FOR role_rec IN
    SELECT DISTINCT tenant_id, role FROM user_roles
    WHERE role IN ('admin', 'manager', 'crm_manager', 'sales_rep', 'sales_manager')
  LOOP
    FOREACH sk IN ARRAY screen_keys_full LOOP
      IF NOT EXISTS (
        SELECT 1 FROM role_permissions
        WHERE tenant_id = role_rec.tenant_id AND role = role_rec.role AND screen_key = sk
      ) THEN
        INSERT INTO role_permissions (tenant_id, role, screen_key, allowed_actions, created_at)
        VALUES (role_rec.tenant_id, role_rec.role, sk, actions_full, NOW());
      END IF;
    END LOOP;
    FOREACH sk IN ARRAY screen_keys_limited LOOP
      IF NOT EXISTS (
        SELECT 1 FROM role_permissions
        WHERE tenant_id = role_rec.tenant_id AND role = role_rec.role AND screen_key = sk
      ) THEN
        INSERT INTO role_permissions (tenant_id, role, screen_key, allowed_actions, created_at)
        VALUES (role_rec.tenant_id, role_rec.role, sk, actions_limited, NOW());
      END IF;
    END LOOP;
    FOREACH sk IN ARRAY screen_keys_view LOOP
      IF NOT EXISTS (
        SELECT 1 FROM role_permissions
        WHERE tenant_id = role_rec.tenant_id AND role = role_rec.role AND screen_key = sk
      ) THEN
        INSERT INTO role_permissions (tenant_id, role, screen_key, allowed_actions, created_at)
        VALUES (role_rec.tenant_id, role_rec.role, sk, actions_view, NOW());
      END IF;
    END LOOP;
  END LOOP;
END $$;
