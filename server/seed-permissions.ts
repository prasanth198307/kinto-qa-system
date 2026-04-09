import { db } from "./db";
import { sql } from "drizzle-orm";

// Mirror of client/src/components/RoleManagement.tsx AVAILABLE_SCREENS
// Keep in sync whenever new screens are added
export const ALL_SCREEN_KEYS = [
  // Dashboard & Analytics
  'overview', 'sales_dashboard', 'reports', 'vendor_analytics',
  // MIS
  'mis_dashboard', 'mis_production', 'mis_inventory', 'mis_sales',
  'mis_delivery', 'mis_cash', 'mis_financial',
  // Quality & Checklists
  'checklists', 'checklist_assignments', 'machine_startup',
  // Production & Inventory
  'products', 'product_categories', 'product_types', 'raw_materials',
  'finished_goods', 'raw_material_issuance', 'production_entries',
  'production_reconciliation', 'variance_analytics', 'spare_parts_stock',
  // Purchase & Vendors
  'purchase_orders', 'purchase_returns', 'vendors', 'vendor_types',
  // Sales
  'sales_orders', 'sales_returns', 'invoices', 'gatepasses',
  'credit_notes', 'debit_notes', 'customer_advances',
  // Accounting
  'chart_of_accounts', 'journal_entries', 'trial_balance', 'profit_loss',
  'balance_sheet', 'aging_report', 'cash_flow_statement', 'group_summary',
  'budget_variance',
  // CRM
  'crm_leads',
  // HR & Payroll
  'hr_employees', 'hr_attendance', 'hr_leaves', 'hr_payroll',
  'hr_exit_management', 'hr_loans', 'hr_tds', 'hr_recruitment',
  'hr_reports', 'hr_ess_admin', 'hr_masters',
  // Expenses, Cash, Documents
  'expenses', 'cash_register', 'documents',
  // Maintenance / PM
  'maintenance', 'pm_history', 'schedule_maintenance', 'pm_templates',
  // Administration
  'users', 'roles', 'uom', 'raw_material_types', 'template_management',
  'notification_settings', 'data_import', 'admin_tools',
  'payment_writeoff', 'hpcl_migration',
];

type PermSet = { canView: number; canCreate: number; canEdit: number; canDelete: number };

function defaultPerms(roleName: string, screenKey: string): PermSet {
  const r = roleName.toLowerCase();

  // Admin and system-bypass roles get full access
  if (r === 'admin' || r === 'accountsmanager') {
    return { canView: 1, canCreate: 1, canEdit: 1, canDelete: 1 };
  }

  // Manager: view + create + edit everywhere, delete only on non-sensitive screens
  if (r === 'manager') {
    const noDelete = ['roles', 'users', 'chart_of_accounts', 'admin_tools', 'hr_payroll', 'hr_tds'];
    return {
      canView: 1, canCreate: 1, canEdit: 1,
      canDelete: noDelete.includes(screenKey) ? 0 : 1,
    };
  }

  // Operator: create+view on operational screens, view-only on others
  if (r === 'operator') {
    const operational = [
      'overview', 'products', 'raw_materials', 'finished_goods',
      'raw_material_issuance', 'production_entries', 'spare_parts_stock',
      'checklists', 'checklist_assignments', 'machine_startup',
      'hr_attendance', 'hr_leaves',
    ];
    if (operational.includes(screenKey)) {
      return { canView: 1, canCreate: 1, canEdit: 1, canDelete: 0 };
    }
    return { canView: 1, canCreate: 0, canEdit: 0, canDelete: 0 };
  }

  // Reviewer: view-only everywhere
  if (r === 'reviewer') {
    return { canView: 1, canCreate: 0, canEdit: 0, canDelete: 0 };
  }

  // Any other custom role: no access by default (admin must grant)
  return { canView: 0, canCreate: 0, canEdit: 0, canDelete: 0 };
}

export async function seedTenantPermissions(tenantId: number): Promise<{ inserted: number; skipped: number }> {
  // Get all active roles for this tenant
  const roles = await db.execute(sql`
    SELECT id, name FROM roles WHERE tenant_id = ${tenantId} AND record_status = 1
  `);

  let inserted = 0;
  let skipped = 0;

  for (const role of roles.rows as { id: string; name: string }[]) {
    for (const screenKey of ALL_SCREEN_KEYS) {
      // Check if permission row already exists
      const existing = await db.execute(sql`
        SELECT id FROM role_permissions
        WHERE role_id = ${role.id} AND screen_key = ${screenKey} AND tenant_id = ${tenantId}
        LIMIT 1
      `);

      if (existing.rows.length > 0) {
        skipped++;
        continue;
      }

      const perms = defaultPerms(role.name, screenKey);
      await db.execute(sql`
        INSERT INTO role_permissions (role_id, screen_key, tenant_id, can_view, can_create, can_edit, can_delete, record_status)
        VALUES (
          ${role.id}, ${screenKey}, ${tenantId},
          ${perms.canView}, ${perms.canCreate}, ${perms.canEdit}, ${perms.canDelete}, 1
        )
      `);
      inserted++;
    }
  }

  return { inserted, skipped };
}
