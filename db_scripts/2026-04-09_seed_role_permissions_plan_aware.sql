-- Plan-aware role permissions seeding for all tenants
-- Seeds role_permissions for all roles in all tenants based on each tenant's plan.
-- Screens not included in the tenant's plan are seeded with all zeros.
-- Existing rows are never overwritten (ON CONFLICT DO NOTHING).
-- After this, run the correction block to zero-out plan-locked rows that were
-- previously seeded with incorrect values.
--
-- Plans and their unlocked screen keys:
--   trial/basic:   dashboard, invoices, purchase_orders, vendors, products, etc. (no production/accounting/HR/CRM)
--   professional:  + production, accounting, MIS, expenses, documents, CRM
--   enterprise:    + WhatsApp, maintenance, HR & Payroll

-- ─── STEP 1: Seed missing rows for all roles/tenants ────────────────────────
DO $$
DECLARE
  tid INTEGER;
  r RECORD;
  sk TEXT;
  cv INT; cc INT; ce INT; cd INT;
  screens TEXT[] := ARRAY[
    'dashboard','sales_dashboard','vendor_analytics','reports',
    'invoices','vendor_history','pending_payments','payments','customer_advances',
    'credit_notes','cancelled_invoices_report','payment_writeoff',
    'purchase_orders','vendors','vendor_types','vendor_debit_notes',
    'products','product_categories','product_types','raw_materials','finished_goods',
    'raw_material_types','uom','users','roles','template_management',
    'notification_settings','data_import','admin_tools','spare_parts',
    'dispatch_tracking','dispatch_masters',
    'sales_orders','sales_officers',
    'gatepasses',
    'raw_material_issuance','production_entries','production_reconciliations',
    'production_reconciliation_report','variance_analytics','sales_returns',
    'chart_of_accounts','journal_entries','bank_transactions','group_summary',
    'ledger_view','day_book','aging_report','cash_flow_statement','budget_variance',
    'mis_dashboard','mis_production','mis_inventory','mis_sales','mis_delivery',
    'mis_cash','mis_financial',
    'expenses','expense_categories','monthly_expenses','cash_register','cash_register_report',
    'documents','crm_leads',
    'checklist_templates','checklist_assignments','machine_startup_reminders','whatsapp_analytics',
    'machines','machine_types','pm_templates','maintenance_plans','pm_history',
    'hr_employees','hr_attendance','hr_leaves','hr_payroll','hr_exit_management',
    'hr_loans','hr_tds','hr_recruitment','hr_reports','hr_masters','hr_ess_admin'
  ];
  manager_no_delete TEXT[] := ARRAY['roles','users','chart_of_accounts','admin_tools','hr_payroll','hr_tds'];
  operator_full TEXT[] := ARRAY[
    'dashboard','products','raw_materials','finished_goods','raw_material_issuance',
    'production_entries','spare_parts','checklist_templates','checklist_assignments',
    'machine_startup_reminders','hr_attendance','hr_leaves'
  ];
  inserted_count INT := 0;
BEGIN
  FOR tid IN SELECT DISTINCT id FROM tenants LOOP
    FOR r IN SELECT id, name FROM roles WHERE tenant_id = tid AND record_status = 1 LOOP
      FOREACH sk IN ARRAY screens LOOP
        cv := 0; cc := 0; ce := 0; cd := 0;
        IF lower(r.name) IN ('admin','accountsmanager') THEN
          cv:=1; cc:=1; ce:=1; cd:=1;
        ELSIF lower(r.name) = 'manager' THEN
          cv:=1; cc:=1; ce:=1;
          cd := CASE WHEN sk = ANY(manager_no_delete) THEN 0 ELSE 1 END;
        ELSIF lower(r.name) = 'operator' THEN
          cv:=1;
          IF sk = ANY(operator_full) THEN cc:=1; ce:=1; END IF;
        ELSIF lower(r.name) = 'reviewer' THEN
          cv:=1;
        END IF;
        INSERT INTO role_permissions (role_id, screen_key, tenant_id, can_view, can_create, can_edit, can_delete, record_status)
        VALUES (r.id, sk, tid, cv, cc, ce, cd, 1)
        ON CONFLICT (role_id, screen_key) DO NOTHING;
        inserted_count := inserted_count + 1;
      END LOOP;
    END LOOP;
  END LOOP;
  RAISE NOTICE 'Seeding done. Rows attempted: %', inserted_count;
END $$;

-- ─── STEP 2: Zero out plan-locked screens per tenant plan ───────────────────
DO $$
DECLARE
  trial_basic_unlocked TEXT[] := ARRAY[
    'dashboard','sales_dashboard','vendor_analytics','reports',
    'invoices','vendor_history','pending_payments','payments','customer_advances',
    'credit_notes','cancelled_invoices_report','payment_writeoff',
    'purchase_orders','vendors','vendor_types','vendor_debit_notes',
    'products','product_categories','product_types','raw_materials','finished_goods',
    'raw_material_types','uom','users','roles','template_management',
    'notification_settings','data_import','admin_tools','spare_parts',
    'gatepasses','dispatch_tracking','dispatch_masters',
    'sales_orders','sales_officers',
    'expenses','expense_categories','monthly_expenses','cash_register','cash_register_report',
    'documents'
  ];
  prof_unlocked TEXT[] := ARRAY[
    'raw_material_issuance','production_entries','production_reconciliations',
    'production_reconciliation_report','variance_analytics','sales_returns',
    'chart_of_accounts','journal_entries','bank_transactions','group_summary',
    'ledger_view','day_book','aging_report','cash_flow_statement','budget_variance',
    'mis_dashboard','mis_production','mis_inventory','mis_sales','mis_delivery',
    'mis_cash','mis_financial','crm_leads'
  ];
  ent_only TEXT[] := ARRAY[
    'checklist_templates','checklist_assignments','machine_startup_reminders','whatsapp_analytics',
    'machines','machine_types','pm_templates','maintenance_plans','pm_history',
    'hr_employees','hr_attendance','hr_leaves','hr_payroll','hr_exit_management',
    'hr_loans','hr_tds','hr_recruitment','hr_reports','hr_masters','hr_ess_admin'
  ];
  n INT := 0;
BEGIN
  -- Trial and basic tenants: lock everything above basic
  UPDATE role_permissions
  SET can_view=0, can_create=0, can_edit=0, can_delete=0
  WHERE tenant_id IN (SELECT id FROM tenants WHERE plan IN ('trial','basic'))
    AND screen_key != ALL(trial_basic_unlocked);
  GET DIAGNOSTICS n = ROW_COUNT;
  RAISE NOTICE 'Trial/Basic tenants — zeroed % rows', n;

  -- Professional tenants: lock enterprise-only screens
  UPDATE role_permissions
  SET can_view=0, can_create=0, can_edit=0, can_delete=0
  WHERE tenant_id IN (SELECT id FROM tenants WHERE plan = 'professional')
    AND screen_key = ANY(ent_only);
  GET DIAGNOSTICS n = ROW_COUNT;
  RAISE NOTICE 'Professional tenants — zeroed % rows', n;

  -- Custom plans: zero everything, then unlock based on subscription_plans.modules
  -- (handled automatically by the application's syncAndUnlockByPlan function)
  RAISE NOTICE 'Plan-aware correction complete.';
END $$;
