import { db } from "./db";
import { sql, eq } from "drizzle-orm";
import { MODULE_NAV_ITEMS, PLAN_MODULES } from "./plan-features";
import { subscriptionPlans } from "../shared/schema";

/**
 * Server-side mirror of client/src/hooks/use-filtered-navigation.tsx navItemToScreenKey.
 * Maps MODULE_NAV_ITEMS nav-item IDs (kebab-case) to role_permissions screen keys (snake_case).
 * Keep in sync whenever new nav items or screen keys are added.
 */
const NAV_ITEM_TO_SCREEN_KEY: Record<string, string> = {
  // Invoicing / Dashboards
  'overview': 'dashboard',
  'sales-dashboard': 'sales_dashboard',
  'vendor-analytics': 'vendor_analytics',
  'reports': 'reports',
  'invoices': 'invoices',
  'vendor-history': 'vendor_history',
  'pending-payments': 'pending_payments',
  'payment-management': 'payments',
  'customer-advances': 'customer_advances',
  'credit-notes': 'credit_notes',
  'cancelled-invoices': 'cancelled_invoices_report',
  'write-off-report': 'payment_writeoff',
  // Purchase Orders
  'purchase-orders': 'purchase_orders',
  'add-purchase-order': 'purchase_orders',
  'vendors': 'vendors',
  'vendor-types': 'vendor_types',
  'vendor-debit-notes': 'vendor_debit_notes',
  // Basic Inventory / System
  'products': 'products',
  'product-categories': 'product_categories',
  'product-types': 'product_types',
  'add-product': 'products',
  'raw-materials': 'raw_materials',
  'add-raw-material': 'raw_materials',
  'raw-material-types': 'raw_material_types',
  'finished-goods': 'finished_goods',
  'uom': 'uom',
  'users': 'users',
  'role-permissions': 'roles',
  'template-management': 'template_management',
  'notification-settings': 'notification_settings',
  'data-import': 'data_import',
  'admin-tools': 'admin_tools',
  'hpcl-migration': 'admin_tools',
  'spare-parts': 'spare_parts',
  'spare-parts-stock': 'spare_parts',
  'company-settings': 'admin_tools',
  // Gatepasses
  'gatepasses': 'gatepasses',
  'create-gatepass': 'gatepasses',
  'dispatch-tracking': 'dispatch_tracking',
  'dispatch-masters': 'dispatch_masters',
  // Sales Orders
  'sales-orders': 'sales_orders',
  'sales-officers': 'sales_officers',
  // Production
  'raw-material-issuance': 'raw_material_issuance',
  'create-issuance': 'raw_material_issuance',
  'production-entries': 'production_entries',
  'production-reconciliations': 'production_reconciliations',
  'production-reconciliation-report': 'production_reconciliation_report',
  'variance-analytics': 'variance_analytics',
  // Quality / Returns
  'sales-returns': 'sales_returns',
  // Accounting
  'chart-of-accounts': 'chart_of_accounts',
  'journal-entries': 'journal_entries',
  'journal-entry-new': 'journal_entries',
  'bank-transactions': 'bank_transactions',
  'trial-balance': 'chart_of_accounts',
  'profit-loss': 'group_summary',
  'balance-sheet': 'group_summary',
  'ledger-view': 'ledger_view',
  'day-book': 'day_book',
  'aging-report': 'aging_report',
  'cash-flow-statement': 'cash_flow_statement',
  'group-summary': 'group_summary',
  'budget-variance': 'budget_variance',
  // MIS
  'mis-dashboard': 'mis_dashboard',
  'mis-production': 'mis_production',
  'mis-inventory': 'mis_inventory',
  'mis-sales': 'mis_sales',
  'mis-delivery': 'mis_delivery',
  'mis-cash': 'mis_cash',
  'mis-financial': 'mis_financial',
  // Expenses & Cash
  'expenses': 'expenses',
  'expense-categories': 'expense_categories',
  'monthly-expenses': 'monthly_expenses',
  'cash-register': 'cash_register',
  'cash-register-report': 'cash_register_report',
  // Documents
  'documents': 'documents',
  // WhatsApp / Checklists
  'checklists': 'checklist_templates',
  'checklist-assignments': 'checklist_assignments',
  'machine-startup-reminders': 'machine_startup_reminders',
  'whatsapp-analytics': 'whatsapp_analytics',
  // Maintenance / PM
  'machines': 'machines',
  'machine-types': 'machine_types',
  'pm-templates': 'pm_templates',
  'maintenance': 'maintenance_plans',
  'pm-history': 'pm_history',
  'schedule-maintenance': 'maintenance_plans',
  // CRM
  'crm-leads': 'crm_leads',
  // HR & Payroll
  'hr-employees': 'hr_employees',
  'hr-attendance': 'hr_attendance',
  'hr-leaves': 'hr_leaves',
  'hr-payroll': 'hr_payroll',
  'hr-exit-management': 'hr_exit_management',
  'hr-loans': 'hr_loans',
  'hr-tds': 'hr_tds',
  'hr-recruitment': 'hr_recruitment',
  'hr-reports': 'hr_reports',
  'hr-masters': 'hr_masters',
  'hr-ess-admin': 'hr_ess_admin',
};

/**
 * All screen keys ever used in AVAILABLE_SCREENS (RoleManagement.tsx).
 * Used when syncing — ensures every screen has a row for every role.
 */
export const ALL_SCREEN_KEYS: string[] = Array.from(
  new Set(Object.values(NAV_ITEM_TO_SCREEN_KEY))
);

/**
 * Returns the set of screen keys that are unlocked for a given plan.
 * Reads the module list from the subscription_plans DB table first (so custom
 * plans like "hr_only" work automatically). Falls back to hardcoded PLAN_MODULES.
 * Any screen key NOT in the returned set should be seeded with all-zero permissions.
 */
export async function getUnlockedScreenKeys(plan: string): Promise<Set<string>> {
  let modules: string[] | null = null;

  // Try DB first — custom plans are stored here
  try {
    const [planRecord] = await db
      .select({ modules: subscriptionPlans.modules })
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.slug, plan))
      .limit(1);

    if (planRecord?.modules && Array.isArray(planRecord.modules) && planRecord.modules.length > 0) {
      modules = planRecord.modules as string[];
    }
  } catch {
    // Fall through to hardcoded fallback
  }

  // Fallback: use hardcoded plan definition
  if (!modules) {
    modules = PLAN_MODULES[plan] ?? PLAN_MODULES['trial'];
  }

  const unlocked = new Set<string>();
  for (const mod of modules) {
    for (const navItem of MODULE_NAV_ITEMS[mod] ?? []) {
      const sk = NAV_ITEM_TO_SCREEN_KEY[navItem];
      if (sk) unlocked.add(sk);
    }
  }
  return unlocked;
}

type PermSet = { canView: number; canCreate: number; canEdit: number; canDelete: number };

/**
 * Returns the default permissions a role should have for a screen.
 * Call this ONLY for screen keys that are unlocked by the tenant's plan.
 * Locked screens must always return { 0, 0, 0, 0 }.
 */
function defaultPerms(roleName: string, screenKey: string): PermSet {
  const r = roleName.toLowerCase();

  if (r === 'admin' || r === 'accountsmanager') {
    return { canView: 1, canCreate: 1, canEdit: 1, canDelete: 1 };
  }

  if (r === 'manager') {
    const noDelete = ['roles', 'users', 'chart_of_accounts', 'admin_tools', 'hr_payroll', 'hr_tds'];
    return {
      canView: 1, canCreate: 1, canEdit: 1,
      canDelete: noDelete.includes(screenKey) ? 0 : 1,
    };
  }

  if (r === 'operator') {
    const operational = [
      'overview', 'products', 'raw_materials', 'finished_goods',
      'raw_material_issuance', 'production_entries', 'spare_parts',
      'checklist_templates', 'checklist_assignments', 'machine_startup_reminders',
      'hr_attendance', 'hr_leaves',
    ];
    if (operational.includes(screenKey)) {
      return { canView: 1, canCreate: 1, canEdit: 1, canDelete: 0 };
    }
    return { canView: 1, canCreate: 0, canEdit: 0, canDelete: 0 };
  }

  if (r === 'reviewer') {
    return { canView: 1, canCreate: 0, canEdit: 0, canDelete: 0 };
  }

  // Custom role — no access by default
  return { canView: 0, canCreate: 0, canEdit: 0, canDelete: 0 };
}

/**
 * Seeds role_permissions for a tenant based on their current plan.
 * - Unlocked screens get sensible role-based defaults.
 * - Plan-locked screens get all zeros for ALL roles.
 * - Existing rows are never overwritten (ON CONFLICT DO NOTHING).
 */
export async function seedTenantPermissions(
  tenantId: number
): Promise<{ inserted: number; skipped: number }> {
  // Look up the tenant's plan
  const tenantResult = await db.execute(sql`
    SELECT plan FROM tenants WHERE id = ${tenantId} LIMIT 1
  `);
  const plan: string = (tenantResult.rows[0] as any)?.plan ?? 'trial';
  const unlockedScreenKeys = await getUnlockedScreenKeys(plan);

  // Get all active roles for this tenant
  const roles = await db.execute(sql`
    SELECT id, name FROM roles WHERE tenant_id = ${tenantId} AND record_status = 1
  `);

  let inserted = 0;
  let skipped = 0;

  for (const role of roles.rows as { id: string; name: string }[]) {
    for (const screenKey of ALL_SCREEN_KEYS) {
      const existing = await db.execute(sql`
        SELECT id FROM role_permissions
        WHERE role_id = ${role.id} AND screen_key = ${screenKey} AND tenant_id = ${tenantId}
        LIMIT 1
      `);

      if (existing.rows.length > 0) {
        skipped++;
        continue;
      }

      // Locked by plan → all zeros for all roles
      const perms: PermSet = unlockedScreenKeys.has(screenKey)
        ? defaultPerms(role.name, screenKey)
        : { canView: 0, canCreate: 0, canEdit: 0, canDelete: 0 };

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

/**
 * Syncs permissions for a tenant:
 * 1. Adds missing rows (plan-aware defaults for new screens).
 * 2. Upgrades previously-locked rows (all zeros) for screens that are now
 *    unlocked by the tenant's current plan — handles plan upgrade scenarios.
 *    Rows that were manually set to zero by an admin are NOT touched (we only
 *    update rows where ALL four flags are still 0, which is the plan-lock state).
 */
export async function syncAndUnlockByPlan(
  tenantId: number
): Promise<{ inserted: number; unlocked: number; skipped: number }> {
  const tenantResult = await db.execute(sql`
    SELECT plan FROM tenants WHERE id = ${tenantId} LIMIT 1
  `);
  const plan: string = (tenantResult.rows[0] as any)?.plan ?? 'trial';
  const unlockedScreenKeys = await getUnlockedScreenKeys(plan);

  const roles = await db.execute(sql`
    SELECT id, name FROM roles WHERE tenant_id = ${tenantId} AND record_status = 1
  `);

  let inserted = 0;
  let unlocked = 0;
  let skipped = 0;

  for (const role of roles.rows as { id: string; name: string }[]) {
    for (const screenKey of ALL_SCREEN_KEYS) {
      const existing = await db.execute(sql`
        SELECT id, can_view, can_create, can_edit, can_delete
        FROM role_permissions
        WHERE role_id = ${role.id} AND screen_key = ${screenKey} AND tenant_id = ${tenantId}
        LIMIT 1
      `);

      const isUnlocked = unlockedScreenKeys.has(screenKey);

      if (existing.rows.length === 0) {
        // Row doesn't exist — insert with plan-aware defaults
        const perms: PermSet = isUnlocked
          ? defaultPerms(role.name, screenKey)
          : { canView: 0, canCreate: 0, canEdit: 0, canDelete: 0 };
        await db.execute(sql`
          INSERT INTO role_permissions (role_id, screen_key, tenant_id, can_view, can_create, can_edit, can_delete, record_status)
          VALUES (${role.id}, ${screenKey}, ${tenantId}, ${perms.canView}, ${perms.canCreate}, ${perms.canEdit}, ${perms.canDelete}, 1)
        `);
        inserted++;
      } else if (isUnlocked) {
        // Row exists — if it was plan-locked (all zeros), unlock it now
        const row = existing.rows[0] as any;
        const allZeros = !row.can_view && !row.can_create && !row.can_edit && !row.can_delete;
        if (allZeros) {
          const perms = defaultPerms(role.name, screenKey);
          await db.execute(sql`
            UPDATE role_permissions
            SET can_view=${perms.canView}, can_create=${perms.canCreate},
                can_edit=${perms.canEdit}, can_delete=${perms.canDelete}
            WHERE role_id = ${role.id} AND screen_key = ${screenKey} AND tenant_id = ${tenantId}
          `);
          unlocked++;
        } else {
          skipped++;
        }
      } else {
        skipped++;
      }
    }
  }

  return { inserted, unlocked, skipped };
}
