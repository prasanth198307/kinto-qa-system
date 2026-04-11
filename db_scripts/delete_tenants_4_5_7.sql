-- ============================================================
-- DELETE TENANTS 4, 5, 7 — keeping tenants 1 and 6
-- Run on production DB: psql $DATABASE_URL -f /tmp/delete_tenants.sql
-- Wrapped in a transaction — rolls back everything if any error occurs
-- ============================================================

BEGIN;

DO $$
BEGIN
  RAISE NOTICE 'Starting deletion of tenants 4, 5, 7 ...';
END $$;

-- ── Step 1: Deepest child tables (items / sub-items) ──────────────────────────

DELETE FROM advance_applications          WHERE tenant_id IN (4,5,7);
DELETE FROM bank_statement_imports        WHERE tenant_id IN (4,5,7);
DELETE FROM bank_transactions             WHERE tenant_id IN (4,5,7);
DELETE FROM budget_items                  WHERE tenant_id IN (4,5,7);
DELETE FROM cash_register_expense_items   WHERE tenant_id IN (4,5,7);
DELETE FROM cash_register_transactions    WHERE tenant_id IN (4,5,7);
DELETE FROM checklist_submissions         WHERE tenant_id IN (4,5,7);
DELETE FROM credit_note_items             WHERE tenant_id IN (4,5,7);
DELETE FROM debit_note_items              WHERE tenant_id IN (4,5,7);
DELETE FROM expense_attachments           WHERE tenant_id IN (4,5,7);
DELETE FROM expense_items                 WHERE tenant_id IN (4,5,7);
DELETE FROM finished_goods_return_log     WHERE tenant_id IN (4,5,7);
DELETE FROM gatepass_items                WHERE tenant_id IN (4,5,7);
DELETE FROM hr_attendance                 WHERE tenant_id IN (4,5,7);
DELETE FROM hr_employee_documents         WHERE tenant_id IN (4,5,7);
DELETE FROM hr_fnf_settlements            WHERE tenant_id IN (4,5,7);
DELETE FROM hr_job_applications           WHERE tenant_id IN (4,5,7);
DELETE FROM hr_leave_applications         WHERE tenant_id IN (4,5,7);
DELETE FROM hr_leave_balances             WHERE tenant_id IN (4,5,7);
DELETE FROM hr_loan_ledger                WHERE tenant_id IN (4,5,7);
DELETE FROM hr_payslips                   WHERE tenant_id IN (4,5,7);
DELETE FROM hr_salary_revisions           WHERE tenant_id IN (4,5,7);
DELETE FROM hr_tds_declarations           WHERE tenant_id IN (4,5,7);
DELETE FROM invoice_items                 WHERE tenant_id IN (4,5,7);
DELETE FROM invoice_payments              WHERE tenant_id IN (4,5,7);
DELETE FROM journal_lines                 WHERE tenant_id IN (4,5,7);
DELETE FROM machine_spares                WHERE tenant_id IN (4,5,7);
DELETE FROM machine_startup_tasks         WHERE tenant_id IN (4,5,7);
DELETE FROM maintenance_history           WHERE tenant_id IN (4,5,7);
DELETE FROM manual_credit_note_requests   WHERE tenant_id IN (4,5,7);
DELETE FROM monthly_expense_payments      WHERE tenant_id IN (4,5,7);
DELETE FROM monthly_expenses              WHERE tenant_id IN (4,5,7);
DELETE FROM partial_task_answers          WHERE tenant_id IN (4,5,7);
DELETE FROM payment_evidence              WHERE tenant_id IN (4,5,7);
DELETE FROM pm_execution_tasks            WHERE tenant_id IN (4,5,7);
DELETE FROM pm_template_tasks             WHERE tenant_id IN (4,5,7);
DELETE FROM product_bom                   WHERE tenant_id IN (4,5,7);
DELETE FROM product_bom_configurations    WHERE tenant_id IN (4,5,7);
DELETE FROM production_reconciliation_items WHERE tenant_id IN (4,5,7);
DELETE FROM purchase_order_items          WHERE tenant_id IN (4,5,7);
DELETE FROM purchase_return_items         WHERE tenant_id IN (4,5,7);
DELETE FROM raw_material_issuance_items   WHERE tenant_id IN (4,5,7);
DELETE FROM required_spares               WHERE tenant_id IN (4,5,7);
DELETE FROM sales_order_items             WHERE tenant_id IN (4,5,7);
DELETE FROM sales_return_items            WHERE tenant_id IN (4,5,7);
DELETE FROM salesperson_mappings          WHERE tenant_id IN (4,5,7);
DELETE FROM submission_tasks              WHERE tenant_id IN (4,5,7);
DELETE FROM system_alerts                 WHERE tenant_id IN (4,5,7);
DELETE FROM tds_entries                   WHERE tenant_id IN (4,5,7);
DELETE FROM template_tasks                WHERE tenant_id IN (4,5,7);
DELETE FROM user_assignments              WHERE tenant_id IN (4,5,7);
DELETE FROM user_roles                    WHERE tenant_id IN (4,5,7);
DELETE FROM vendor_debit_note_adjustments WHERE tenant_id IN (4,5,7);
DELETE FROM vendor_debit_note_items       WHERE tenant_id IN (4,5,7);
DELETE FROM vendor_vendor_types           WHERE tenant_id IN (4,5,7);
DELETE FROM whatsapp_conversation_sessions WHERE tenant_id IN (4,5,7);

-- ── Step 2: Parent / header tables ────────────────────────────────────────────

DELETE FROM banks                         WHERE tenant_id IN (4,5,7);
DELETE FROM budgets                       WHERE tenant_id IN (4,5,7);
DELETE FROM cash_register_days            WHERE tenant_id IN (4,5,7);
DELETE FROM chart_of_accounts             WHERE tenant_id IN (4,5,7);
DELETE FROM checklist_assignments         WHERE tenant_id IN (4,5,7);
DELETE FROM checklist_templates           WHERE tenant_id IN (4,5,7);
DELETE FROM credit_notes                  WHERE tenant_id IN (4,5,7);
DELETE FROM crm_leads                     WHERE tenant_id IN (4,5,7);
DELETE FROM customer_advances             WHERE tenant_id IN (4,5,7);
DELETE FROM debit_notes                   WHERE tenant_id IN (4,5,7);
DELETE FROM deletion_audit                WHERE tenant_id IN (4,5,7);
DELETE FROM document_categories           WHERE tenant_id IN (4,5,7);
DELETE FROM documents                     WHERE tenant_id IN (4,5,7);
DELETE FROM drivers                       WHERE tenant_id IN (4,5,7);
DELETE FROM expense_categories            WHERE tenant_id IN (4,5,7);
DELETE FROM expense_vouchers              WHERE tenant_id IN (4,5,7);
DELETE FROM finished_goods                WHERE tenant_id IN (4,5,7);
DELETE FROM gatepasses                    WHERE tenant_id IN (4,5,7);
DELETE FROM hr_departments                WHERE tenant_id IN (4,5,7);
DELETE FROM hr_designations               WHERE tenant_id IN (4,5,7);
DELETE FROM hr_employees                  WHERE tenant_id IN (4,5,7);
DELETE FROM hr_holidays                   WHERE tenant_id IN (4,5,7);
DELETE FROM hr_job_openings               WHERE tenant_id IN (4,5,7);
DELETE FROM hr_leave_types                WHERE tenant_id IN (4,5,7);
DELETE FROM hr_loans                      WHERE tenant_id IN (4,5,7);
DELETE FROM hr_payroll_runs               WHERE tenant_id IN (4,5,7);
DELETE FROM hr_payslip_settings           WHERE tenant_id IN (4,5,7);
DELETE FROM hr_pt_slabs                   WHERE tenant_id IN (4,5,7);
DELETE FROM hr_salary_components          WHERE tenant_id IN (4,5,7);
DELETE FROM hr_salary_structures          WHERE tenant_id IN (4,5,7);
DELETE FROM hr_shifts                     WHERE tenant_id IN (4,5,7);
DELETE FROM hr_statutory_settings         WHERE tenant_id IN (4,5,7);
DELETE FROM invoice_templates             WHERE tenant_id IN (4,5,7);
DELETE FROM invoices                      WHERE tenant_id IN (4,5,7);
DELETE FROM journal_entries               WHERE tenant_id IN (4,5,7);
DELETE FROM machine_types                 WHERE tenant_id IN (4,5,7);
DELETE FROM machines                      WHERE tenant_id IN (4,5,7);
DELETE FROM maintenance_plans             WHERE tenant_id IN (4,5,7);
DELETE FROM notification_config           WHERE tenant_id IN (4,5,7);
DELETE FROM pm_executions                 WHERE tenant_id IN (4,5,7);
DELETE FROM pm_task_list_templates        WHERE tenant_id IN (4,5,7);
DELETE FROM product_categories            WHERE tenant_id IN (4,5,7);
DELETE FROM product_types                 WHERE tenant_id IN (4,5,7);
DELETE FROM products                      WHERE tenant_id IN (4,5,7);
DELETE FROM production_entries            WHERE tenant_id IN (4,5,7);
DELETE FROM production_reconciliations    WHERE tenant_id IN (4,5,7);
DELETE FROM purchase_orders               WHERE tenant_id IN (4,5,7);
DELETE FROM purchase_returns              WHERE tenant_id IN (4,5,7);
DELETE FROM raw_material_issuance         WHERE tenant_id IN (4,5,7);
DELETE FROM raw_material_transactions     WHERE tenant_id IN (4,5,7);
DELETE FROM raw_material_types            WHERE tenant_id IN (4,5,7);
DELETE FROM raw_materials                 WHERE tenant_id IN (4,5,7);
DELETE FROM sales_officers                WHERE tenant_id IN (4,5,7);
DELETE FROM sales_orders                  WHERE tenant_id IN (4,5,7);
DELETE FROM sales_returns                 WHERE tenant_id IN (4,5,7);
DELETE FROM scrap_inventory               WHERE tenant_id IN (4,5,7);
DELETE FROM spare_part_entries            WHERE tenant_id IN (4,5,7);
DELETE FROM spare_part_issuances          WHERE tenant_id IN (4,5,7);
DELETE FROM spare_parts_catalog           WHERE tenant_id IN (4,5,7);
DELETE FROM tds_rates                     WHERE tenant_id IN (4,5,7);
DELETE FROM terms_conditions              WHERE tenant_id IN (4,5,7);
DELETE FROM transporters                  WHERE tenant_id IN (4,5,7);
DELETE FROM uom                           WHERE tenant_id IN (4,5,7);
DELETE FROM vendor_debit_notes            WHERE tenant_id IN (4,5,7);
DELETE FROM vendor_types                  WHERE tenant_id IN (4,5,7);
DELETE FROM vendors                       WHERE tenant_id IN (4,5,7);
DELETE FROM vehicles                      WHERE tenant_id IN (4,5,7);

-- ── Step 3: Users (after all tables that reference them) ──────────────────────

DELETE FROM users                         WHERE tenant_id IN (4,5,7);

-- ── Step 4: Roles and permissions ─────────────────────────────────────────────

DELETE FROM role_permissions              WHERE tenant_id IN (4,5,7);
DELETE FROM roles                         WHERE tenant_id IN (4,5,7);

-- ── Step 5: Subscriptions and billing ─────────────────────────────────────────

DELETE FROM billing_events                WHERE tenant_id IN (4,5,7);
DELETE FROM subscriptions                 WHERE tenant_id IN (4,5,7);

-- ── Step 6: Finally, delete the tenant rows ───────────────────────────────────

DELETE FROM tenants                       WHERE id IN (4,5,7);

-- ── Verify ────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  RAISE NOTICE 'Deletion complete. Remaining tenants:';
END $$;

SELECT id, name, slug, plan, status FROM tenants ORDER BY id;

COMMIT;
