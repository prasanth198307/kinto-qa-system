import { db } from "./db";
import { roles, chartOfAccounts } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

// ─── Default Roles ────────────────────────────────────────────────────────────

const DEFAULT_ROLES = [
  { name: "admin",          description: "Full system access" },
  { name: "manager",        description: "Operational management access" },
  { name: "accountsmanager",description: "Accounts and finance access" },
  { name: "operator",       description: "Day-to-day operations access" },
  { name: "reviewer",       description: "Read-only review access" },
];

export async function seedTenantRoles(tenantId: number): Promise<{ adminRoleId: string }> {
  const created: Record<string, string> = {};

  for (const role of DEFAULT_ROLES) {
    // Idempotent: skip if already exists for this tenant
    const [existing] = await db
      .select({ id: roles.id })
      .from(roles)
      .where(and(eq(roles.name, role.name), eq(roles.tenantId, tenantId)))
      .limit(1);

    if (existing) {
      created[role.name] = existing.id;
      continue;
    }

    const [inserted] = await db
      .insert(roles)
      .values({ name: role.name, description: role.description, tenantId, recordStatus: 1 })
      .returning({ id: roles.id });

    created[role.name] = inserted.id;
  }

  return { adminRoleId: created["admin"] };
}

// ─── Indian Manufacturing Chart of Accounts ───────────────────────────────────
// Standard COA for Indian manufacturing companies (GST-compliant)

type CoaRow = {
  code: string;
  name: string;
  accountType: "asset" | "liability" | "equity" | "revenue" | "expense";
  nodeType: "group" | "ledger";
  level: number;
  subType?: string;
  parentCode?: string;
};

const DEFAULT_COA: CoaRow[] = [
  // ── ASSETS ──────────────────────────────────────────────────────────────────
  { code: "1000", name: "Assets",                          accountType: "asset",     nodeType: "group",  level: 1 },
  { code: "1100", name: "Fixed Assets",                    accountType: "asset",     nodeType: "group",  level: 2, subType: "fixed_asset",      parentCode: "1000" },
  { code: "1101", name: "Land & Building",                 accountType: "asset",     nodeType: "ledger", level: 3, subType: "fixed_asset",      parentCode: "1100" },
  { code: "1102", name: "Plant & Machinery",               accountType: "asset",     nodeType: "ledger", level: 3, subType: "fixed_asset",      parentCode: "1100" },
  { code: "1103", name: "Furniture & Fixtures",            accountType: "asset",     nodeType: "ledger", level: 3, subType: "fixed_asset",      parentCode: "1100" },
  { code: "1104", name: "Computers & IT Equipment",        accountType: "asset",     nodeType: "ledger", level: 3, subType: "fixed_asset",      parentCode: "1100" },
  { code: "1105", name: "Vehicles",                        accountType: "asset",     nodeType: "ledger", level: 3, subType: "fixed_asset",      parentCode: "1100" },
  { code: "1106", name: "Accumulated Depreciation",        accountType: "asset",     nodeType: "ledger", level: 3, subType: "fixed_asset",      parentCode: "1100" },
  { code: "1200", name: "Current Assets",                  accountType: "asset",     nodeType: "group",  level: 2, subType: "current_asset",    parentCode: "1000" },
  { code: "1201", name: "Raw Material Inventory",          accountType: "asset",     nodeType: "ledger", level: 3, subType: "inventory",        parentCode: "1200" },
  { code: "1202", name: "Work in Progress",                accountType: "asset",     nodeType: "ledger", level: 3, subType: "inventory",        parentCode: "1200" },
  { code: "1203", name: "Finished Goods Inventory",        accountType: "asset",     nodeType: "ledger", level: 3, subType: "inventory",        parentCode: "1200" },
  { code: "1204", name: "Packing Material Stock",          accountType: "asset",     nodeType: "ledger", level: 3, subType: "inventory",        parentCode: "1200" },
  { code: "1210", name: "Trade Receivables (Debtors)",     accountType: "asset",     nodeType: "ledger", level: 3, subType: "trade_receivable", parentCode: "1200" },
  { code: "1211", name: "Advance to Suppliers",            accountType: "asset",     nodeType: "ledger", level: 3, subType: "current_asset",    parentCode: "1200" },
  { code: "1220", name: "GST Input Tax Credit",            accountType: "asset",     nodeType: "group",  level: 3, subType: "tax",              parentCode: "1200" },
  { code: "1221", name: "CGST Input Credit",               accountType: "asset",     nodeType: "ledger", level: 4, subType: "tax",              parentCode: "1220" },
  { code: "1222", name: "SGST Input Credit",               accountType: "asset",     nodeType: "ledger", level: 4, subType: "tax",              parentCode: "1220" },
  { code: "1223", name: "IGST Input Credit",               accountType: "asset",     nodeType: "ledger", level: 4, subType: "tax",              parentCode: "1220" },
  { code: "1230", name: "Cash in Hand",                    accountType: "asset",     nodeType: "ledger", level: 3, subType: "cash",             parentCode: "1200" },
  { code: "1231", name: "Bank Accounts",                   accountType: "asset",     nodeType: "group",  level: 3, subType: "bank",             parentCode: "1200" },
  { code: "1240", name: "TDS Receivable",                  accountType: "asset",     nodeType: "ledger", level: 3, subType: "current_asset",    parentCode: "1200" },
  { code: "1241", name: "Security Deposits",               accountType: "asset",     nodeType: "ledger", level: 3, subType: "current_asset",    parentCode: "1200" },
  { code: "1242", name: "Employee Advances",               accountType: "asset",     nodeType: "ledger", level: 3, subType: "current_asset",    parentCode: "1200" },
  { code: "1243", name: "Other Current Assets",            accountType: "asset",     nodeType: "ledger", level: 3, subType: "current_asset",    parentCode: "1200" },

  // ── LIABILITIES ─────────────────────────────────────────────────────────────
  { code: "2000", name: "Liabilities",                     accountType: "liability", nodeType: "group",  level: 1 },
  { code: "2100", name: "Long-Term Liabilities",           accountType: "liability", nodeType: "group",  level: 2, subType: "long_term_liability", parentCode: "2000" },
  { code: "2101", name: "Long Term Loans",                 accountType: "liability", nodeType: "ledger", level: 3, subType: "long_term_liability", parentCode: "2100" },
  { code: "2102", name: "Director's Loan",                 accountType: "liability", nodeType: "ledger", level: 3, subType: "long_term_liability", parentCode: "2100" },
  { code: "2200", name: "Current Liabilities",             accountType: "liability", nodeType: "group",  level: 2, subType: "current_liability",   parentCode: "2000" },
  { code: "2201", name: "Trade Payables (Creditors)",      accountType: "liability", nodeType: "ledger", level: 3, subType: "trade_payable",        parentCode: "2200" },
  { code: "2202", name: "Customer Advances",               accountType: "liability", nodeType: "ledger", level: 3, subType: "current_liability",    parentCode: "2200" },
  { code: "2210", name: "GST Output Tax Liability",        accountType: "liability", nodeType: "group",  level: 3, subType: "tax",                  parentCode: "2200" },
  { code: "2211", name: "CGST Output",                     accountType: "liability", nodeType: "ledger", level: 4, subType: "tax",                  parentCode: "2210" },
  { code: "2212", name: "SGST Output",                     accountType: "liability", nodeType: "ledger", level: 4, subType: "tax",                  parentCode: "2210" },
  { code: "2213", name: "IGST Output",                     accountType: "liability", nodeType: "ledger", level: 4, subType: "tax",                  parentCode: "2210" },
  { code: "2220", name: "TDS Payable",                     accountType: "liability", nodeType: "ledger", level: 3, subType: "tax",                  parentCode: "2200" },
  { code: "2221", name: "Salary Payable",                  accountType: "liability", nodeType: "ledger", level: 3, subType: "current_liability",    parentCode: "2200" },
  { code: "2222", name: "GST TDS Payable",                 accountType: "liability", nodeType: "ledger", level: 3, subType: "tax",                  parentCode: "2200" },
  { code: "2223", name: "Other Current Liabilities",       accountType: "liability", nodeType: "ledger", level: 3, subType: "current_liability",    parentCode: "2200" },

  // ── EQUITY ──────────────────────────────────────────────────────────────────
  { code: "3000", name: "Equity",                          accountType: "equity",    nodeType: "group",  level: 1 },
  { code: "3001", name: "Share Capital",                   accountType: "equity",    nodeType: "ledger", level: 2, subType: "equity",  parentCode: "3000" },
  { code: "3002", name: "Retained Earnings",               accountType: "equity",    nodeType: "ledger", level: 2, subType: "equity",  parentCode: "3000" },
  { code: "3003", name: "Owner's Drawing",                 accountType: "equity",    nodeType: "ledger", level: 2, subType: "equity",  parentCode: "3000" },
  { code: "3004", name: "Current Year Profit / Loss",      accountType: "equity",    nodeType: "ledger", level: 2, subType: "equity",  parentCode: "3000" },

  // ── REVENUE ─────────────────────────────────────────────────────────────────
  { code: "4000", name: "Revenue",                         accountType: "revenue",   nodeType: "group",  level: 1 },
  { code: "4001", name: "Sales - Finished Goods",          accountType: "revenue",   nodeType: "ledger", level: 2, subType: "operating_revenue",   parentCode: "4000" },
  { code: "4002", name: "Scrap Sales",                     accountType: "revenue",   nodeType: "ledger", level: 2, subType: "operating_revenue",   parentCode: "4000" },
  { code: "4003", name: "Freight Income",                  accountType: "revenue",   nodeType: "ledger", level: 2, subType: "operating_revenue",   parentCode: "4000" },
  { code: "4004", name: "Service Income",                  accountType: "revenue",   nodeType: "ledger", level: 2, subType: "operating_revenue",   parentCode: "4000" },
  { code: "4010", name: "Sales Returns & Allowances",      accountType: "revenue",   nodeType: "ledger", level: 2, subType: "contra_revenue",      parentCode: "4000" },
  { code: "4020", name: "Interest Income",                 accountType: "revenue",   nodeType: "ledger", level: 2, subType: "other_income",        parentCode: "4000" },
  { code: "4021", name: "Other Income",                    accountType: "revenue",   nodeType: "ledger", level: 2, subType: "other_income",        parentCode: "4000" },
  { code: "4022", name: "Credit Notes Issued",             accountType: "revenue",   nodeType: "ledger", level: 2, subType: "contra_revenue",      parentCode: "4000" },

  // ── EXPENSES ────────────────────────────────────────────────────────────────
  { code: "5000", name: "Expenses",                        accountType: "expense",   nodeType: "group",  level: 1 },
  { code: "5100", name: "Cost of Goods Sold",              accountType: "expense",   nodeType: "group",  level: 2, subType: "cogs",             parentCode: "5000" },
  { code: "5101", name: "Raw Material Consumption",        accountType: "expense",   nodeType: "ledger", level: 3, subType: "cogs",             parentCode: "5100" },
  { code: "5102", name: "Direct Labour",                   accountType: "expense",   nodeType: "ledger", level: 3, subType: "cogs",             parentCode: "5100" },
  { code: "5103", name: "Manufacturing Overhead",          accountType: "expense",   nodeType: "ledger", level: 3, subType: "cogs",             parentCode: "5100" },
  { code: "5104", name: "Factory Rent",                    accountType: "expense",   nodeType: "ledger", level: 3, subType: "cogs",             parentCode: "5100" },
  { code: "5105", name: "Depreciation",                    accountType: "expense",   nodeType: "ledger", level: 3, subType: "cogs",             parentCode: "5100" },
  { code: "5106", name: "Packing Material Expense",        accountType: "expense",   nodeType: "ledger", level: 3, subType: "cogs",             parentCode: "5100" },
  { code: "5200", name: "Operating Expenses",              accountType: "expense",   nodeType: "group",  level: 2, subType: "operating_expense", parentCode: "5000" },
  { code: "5201", name: "Salaries & Wages",                accountType: "expense",   nodeType: "ledger", level: 3, subType: "operating_expense", parentCode: "5200" },
  { code: "5202", name: "Office Rent",                     accountType: "expense",   nodeType: "ledger", level: 3, subType: "operating_expense", parentCode: "5200" },
  { code: "5203", name: "Electricity & Utilities",         accountType: "expense",   nodeType: "ledger", level: 3, subType: "operating_expense", parentCode: "5200" },
  { code: "5204", name: "Telephone & Internet",            accountType: "expense",   nodeType: "ledger", level: 3, subType: "operating_expense", parentCode: "5200" },
  { code: "5205", name: "Travelling & Conveyance",         accountType: "expense",   nodeType: "ledger", level: 3, subType: "operating_expense", parentCode: "5200" },
  { code: "5206", name: "Vehicle Expenses",                accountType: "expense",   nodeType: "ledger", level: 3, subType: "operating_expense", parentCode: "5200" },
  { code: "5207", name: "Office Supplies & Stationery",    accountType: "expense",   nodeType: "ledger", level: 3, subType: "operating_expense", parentCode: "5200" },
  { code: "5208", name: "Professional & Legal Fees",       accountType: "expense",   nodeType: "ledger", level: 3, subType: "operating_expense", parentCode: "5200" },
  { code: "5209", name: "Advertisement & Marketing",       accountType: "expense",   nodeType: "ledger", level: 3, subType: "operating_expense", parentCode: "5200" },
  { code: "5210", name: "Bank Charges & Interest",         accountType: "expense",   nodeType: "ledger", level: 3, subType: "operating_expense", parentCode: "5200" },
  { code: "5211", name: "Insurance",                       accountType: "expense",   nodeType: "ledger", level: 3, subType: "operating_expense", parentCode: "5200" },
  { code: "5212", name: "Repairs & Maintenance",           accountType: "expense",   nodeType: "ledger", level: 3, subType: "operating_expense", parentCode: "5200" },
  { code: "5213", name: "Freight & Forwarding Expense",    accountType: "expense",   nodeType: "ledger", level: 3, subType: "operating_expense", parentCode: "5200" },
  { code: "5214", name: "Sales Discount Allowed",          accountType: "expense",   nodeType: "ledger", level: 3, subType: "operating_expense", parentCode: "5200" },
  { code: "5215", name: "Purchase Discount Received",      accountType: "expense",   nodeType: "ledger", level: 3, subType: "operating_expense", parentCode: "5200" },
  { code: "5216", name: "Write-Off Expense",               accountType: "expense",   nodeType: "ledger", level: 3, subType: "operating_expense", parentCode: "5200" },
  { code: "5217", name: "Miscellaneous Expenses",          accountType: "expense",   nodeType: "ledger", level: 3, subType: "operating_expense", parentCode: "5200" },
];

export async function seedTenantCOA(tenantId: number): Promise<void> {
  // Build a map of code → inserted ID (for parent references)
  const codeToId: Record<string, string> = {};

  // First pass: check which codes already exist for this tenant
  const existing = await db
    .select({ code: chartOfAccounts.code, id: chartOfAccounts.id })
    .from(chartOfAccounts)
    .where(eq(chartOfAccounts.tenantId, tenantId));

  for (const row of existing) {
    codeToId[row.code] = row.id;
  }

  // Insert in order (parents first, children after)
  for (const row of DEFAULT_COA) {
    if (codeToId[row.code]) continue; // already seeded

    const parentId = row.parentCode ? (codeToId[row.parentCode] ?? null) : null;

    const [inserted] = await db
      .insert(chartOfAccounts)
      .values({
        code: row.code,
        name: row.name,
        accountType: row.accountType,
        nodeType: row.nodeType,
        level: row.level,
        subType: row.subType ?? null,
        parentId,
        isActive: 1,
        isSystemAccount: 1,
        tenantId,
        recordStatus: 1,
      })
      .returning({ id: chartOfAccounts.id });

    codeToId[row.code] = inserted.id;
  }
}

// ─── Full admin permissions list ──────────────────────────────────────────────
// Every new tenant's admin role gets view+create+edit+delete on all screens.
// Idempotent: uses ON CONFLICT DO UPDATE so it's safe to call multiple times.

export const ALL_ADMIN_SCREEN_KEYS = [
  // Dashboard & Analytics
  'dashboard','sales_dashboard','vendor_analytics','reports',
  'report_finished_goods','report_monthly_production','report_vendor_report','report_gst',
  // MIS
  'mis_dashboard','mis_production','mis_inventory','mis_sales','mis_delivery',
  // Quality & Checklists
  'checklist_templates','checklist_assignments','checklists',
  'machine_startup_reminders','whatsapp_analytics',
  // Inventory
  'products','product_categories','product_types',
  'raw_materials','raw_material_types',
  'finished_goods','inventory','uom',
  'sales_orders','sales_officers',
  // Production
  'raw_material_issuance','production_entries','production_reconciliations',
  'production_reconciliation','variance_analytics',
  // Sales & Invoicing
  'invoices','payments','pending_payments','credit_notes',
  'cancelled_invoices_report','sales_returns','payment_writeoff',
  'customer_advances','payment_management',
  // Dispatch
  'gatepasses','dispatch_tracking','dispatch_masters',
  // Finance
  'cash_register','cash_register_report','expenses','monthly_expenses',
  // Documents
  'documents',
  // Maintenance
  'maintenance_plans','pm_execution','pm_templates',
  // Purchasing
  'purchase_orders','vendor_debit_notes',
  // Master Data
  'vendors','vendor_types','machines','machine_types',
  'spare_parts','banks','scrap_inventory',
  // Admin & Settings
  'users','roles','admin_tools','template_management',
  'notification_settings','data_import',
  // Accounting
  'chart_of_accounts','account_subtypes','journal_entries','manual_journal_entry',
  'trial_balance','profit_loss','balance_sheet','ledger_view','day_book',
  'aging_report','cash_flow_statement','group_summary','budget_variance','bank_transactions',
];

export async function seedTenantPermissions(tenantId: number, adminRoleId: string): Promise<void> {
  for (const key of ALL_ADMIN_SCREEN_KEYS) {
    await db.execute(sql`
      INSERT INTO role_permissions (role_id, screen_key, can_view, can_create, can_edit, can_delete, tenant_id)
      VALUES (${adminRoleId}, ${key}, 1, 1, 1, 1, ${tenantId})
      ON CONFLICT (role_id, screen_key) DO UPDATE
        SET can_view=1, can_create=1, can_edit=1, can_delete=1
    `);
  }
  console.log(`✅ Seeded ${ALL_ADMIN_SCREEN_KEYS.length} permissions for admin role in tenant #${tenantId}`);
}

// ─── Single entry point ───────────────────────────────────────────────────────

export async function seedNewTenant(tenantId: number): Promise<{ adminRoleId: string }> {
  const { adminRoleId } = await seedTenantRoles(tenantId);
  await seedTenantCOA(tenantId);
  await seedTenantPermissions(tenantId, adminRoleId);
  console.log(`✅ Seeded roles + COA + permissions for tenant #${tenantId}`);
  return { adminRoleId };
}
