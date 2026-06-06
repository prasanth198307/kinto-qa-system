/**
 * Grocery Store Starter Pack — Master Data Seeder
 * Seeds 6 grocery-specific roles (admin already exists) with
 * precise per-screen permissions, plus 2 warehouses.
 */
import { db } from "./db";
import { sql } from "drizzle-orm";

// ── Permission helper type ─────────────────────────────────────────────────────
type Perm = { v: number; c: number; e: number; d: number };
const FULL: Perm   = { v: 1, c: 1, e: 1, d: 1 };
const VCE: Perm    = { v: 1, c: 1, e: 1, d: 0 };
const VC: Perm     = { v: 1, c: 1, e: 0, d: 0 };
const VIEW: Perm   = { v: 1, c: 0, e: 0, d: 0 };
const NONE: Perm   = { v: 0, c: 0, e: 0, d: 0 };

type ScreenPerm = [string, Perm];

// ── Per-role screen permissions ────────────────────────────────────────────────
const ROLE_PERMISSIONS: Record<string, ScreenPerm[]> = {

  store_manager: [
    // Core
    ["dashboard",           VIEW], ["overview",          VIEW],
    ["reports",             VIEW], ["notification_settings", VIEW],
    // POS Terminal — view sessions, sales history, returns, promotions
    ["pos",                 VIEW],
    // Sales & Billing
    ["sales_dashboard",     VIEW], ["invoices",           VCE],
    ["payments",            VC  ], ["pending_payments",   VIEW],
    ["customer_advances",   VIEW], ["credit_notes",       VC  ],
    ["cancelled_invoices_report", VIEW],
    ["report_invoices",     VIEW], ["report_monthly_sales", VIEW],
    ["report_cash_register", VIEW],
    // Inventory — view only
    ["products",            VIEW], ["inventory",          VIEW],
    ["product_categories",  VIEW], ["uom",                VIEW],
    ["price_lists",         VIEW], ["finished_goods",     VIEW],
    // Stock adjustments — store manager can create write-offs
    ["inventory_stock_adjustments", VCE],
    // Sales Orders
    ["sales_orders",        VCE ], ["sales_officers",     VIEW],
    // Purchase — view only
    ["purchase_orders",     VIEW], ["vendors",            VIEW],
    ["goods_receipt_notes", VIEW], ["purchase_requisitions", VIEW],
    // Warehouses — view only
    ["warehouses",          VIEW], ["stock_transfers",    VIEW],
    // Report
    ["report_purchase_orders", VIEW],
  ],

  cashier: [
    // Core
    ["dashboard",       VIEW],
    // POS Terminal — full billing access
    ["pos",             VC  ],
    // Billing sub-screens
    ["sales_dashboard", VIEW], ["invoices",         VC  ],
    ["payments",        VC  ], ["pending_payments", VIEW],
    ["customer_advances", VIEW], ["credit_notes",   VIEW],
    ["report_cash_register", VIEW],
  ],

  godown_incharge: [
    // Core
    ["dashboard",       VIEW],
    // Inventory — full
    ["products",        VCE ], ["inventory",        FULL],
    ["product_categories", VIEW], ["uom",            VIEW],
    ["price_lists",     VIEW], ["finished_goods",   VCE ],
    // GRN — full (including barcode scan)
    ["goods_receipt_notes",       FULL],
    ["inventory_grn_scan",        FULL],
    // Stock adjustments — godown incharge records damage/expiry
    ["inventory_stock_adjustments", FULL],
    // Bulk import — for initial stock loading
    ["inventory_bulk_import",     VC  ],
    // Warehouses & Transfers — full
    ["warehouses",      VIEW], ["stock_transfers",  FULL],
    // Purchase Orders — view only
    ["purchase_orders", VIEW], ["vendors",          VIEW],
    ["purchase_requisitions", VIEW],
  ],

  purchase_manager: [
    // Core
    ["dashboard",       VIEW], ["reports",          VIEW],
    // Purchase — full
    ["purchase_orders", FULL], ["vendors",          FULL],
    ["vendor_types",    VCE ], ["vendor_debit_notes", VCE],
    ["vendor_analytics", VIEW], ["vendor_history",  VIEW],
    ["purchase_requisitions", FULL],
    // GRN — full (including barcode scan view + GRN approval)
    ["goods_receipt_notes",   FULL],
    ["inventory_grn_scan",    VIEW],
    // Approval workflows — Purchase Manager approves GRNs & stock adjustments above threshold
    ["approval_workflows",    VCE ],
    // Inventory — view + bulk import for onboarding new items
    ["products",        VIEW], ["inventory",        VIEW],
    ["product_categories", VIEW], ["uom",            VIEW],
    ["inventory_bulk_import",           VC  ],
    ["inventory_stock_adjustments",     VIEW],
    // Reports
    ["report_purchase_orders", VIEW], ["report_vendor_report", VIEW],
    // Warehouses — view
    ["warehouses",      VIEW],
  ],

  accountant: [
    // Core
    ["dashboard",       VIEW], ["reports",          VIEW],
    // Sales & Invoicing — full
    ["invoices",        FULL], ["payments",         FULL],
    ["sales_dashboard", VIEW], ["customer_advances", FULL],
    ["pending_payments", VIEW], ["credit_notes",    FULL],
    ["cancelled_invoices_report", VIEW], ["write_off_report", VIEW],
    ["payment_writeoff", FULL], ["invoice_templates", VIEW],
    // GST
    ["gst_reports",     VCE ],
    // Accounting — full
    ["chart_of_accounts", FULL], ["account_subtypes", FULL],
    ["journal_entries", FULL], ["manual_journal_entry", FULL],
    ["trial_balance",   VIEW], ["profit_loss",       VIEW],
    ["balance_sheet",   VIEW], ["bank_transactions",  FULL],
    ["banks",           FULL], ["ledger_view",        VIEW],
    ["day_book",        VIEW], ["aging_report",       VIEW],
    ["cash_flow_statement", VIEW], ["group_summary",  VIEW],
    ["tds_management",  VCE ], ["debit_notes",       VCE ],
    ["cost_centres",    VIEW], ["budget_variance",   VIEW],
    // Expenses
    ["expenses",        FULL], ["expense_categories", VCE],
    ["monthly_expenses", FULL], ["cash_register",    FULL],
    ["cash_register_report", VIEW], ["report_expenses", VIEW],
    // Vendor — view
    ["vendors",         VIEW], ["purchase_orders",   VIEW],
    ["vendor_debit_notes", VIEW],
    // Reports
    ["report_invoices", VIEW], ["report_gst",        VIEW],
    ["report_payments", VIEW], ["report_monthly_sales", VIEW],
    ["bulk_payment_report", VIEW],
  ],

  hr_manager: [
    // Core
    ["dashboard",           VIEW],
    // HR — full
    ["hr_employees",        FULL], ["hr_attendance",    FULL],
    ["hr_leaves",           FULL], ["hr_payroll",       FULL],
    ["hr_exit_management",  FULL], ["hr_loans",         FULL],
    ["hr_tds",              FULL], ["hr_reports",       VIEW],
    ["hr_ess_admin",        FULL], ["hr_masters",       FULL],
    ["hr_expense_claims",   FULL], ["hr_appraisals",    FULL],
    ["hr_recruitment",      FULL],
  ],
};

// ── Role display names & descriptions ─────────────────────────────────────────
const ROLE_META: Record<string, { display: string; description: string }> = {
  store_manager:    { display: "Store Manager",    description: "Sales, POS, inventory view, reports — no payroll or accounts" },
  cashier:          { display: "Cashier",           description: "POS Terminal only — create bills, view sales history" },
  godown_incharge:  { display: "Godown Incharge",   description: "Receive goods (GRN), stock transfers, serial/lot — no billing or accounts" },
  purchase_manager: { display: "Purchase Manager",  description: "Create purchase orders, approve GRNs, manage vendors" },
  accountant:       { display: "Accountant",        description: "Invoices, payments, GST reports, journal entries — no HR/payroll" },
  hr_manager:       { display: "HR Manager",        description: "HR & Payroll — employee records, salary, leave, recruitment" },
};

// ── Warehouses to create ───────────────────────────────────────────────────────
const WAREHOUSES = [
  { name: "Main Store — Shelf Stock", code: "MAIN-STORE", isDefault: true  },
  { name: "Godown — Bulk Storage",    code: "GODOWN",     isDefault: false },
];

// ── Main seeder function ───────────────────────────────────────────────────────
export async function seedGroceryStarterData(tenantId: number): Promise<{
  rolesCreated: string[];
  rolesSkipped: string[];
  warehousesCreated: string[];
  permissionsInserted: number;
}> {
  const rolesCreated: string[] = [];
  const rolesSkipped: string[] = [];
  const warehousesCreated: string[] = [];
  let permissionsInserted = 0;

  // ── 1. Create grocery roles ──────────────────────────────────────────────────
  for (const [roleKey, meta] of Object.entries(ROLE_META)) {
    const existing = await db.execute(sql`
      SELECT id FROM roles WHERE name = ${meta.display} AND tenant_id = ${tenantId} LIMIT 1
    `);
    if (existing.rows && existing.rows.length > 0) {
      rolesSkipped.push(meta.display);
      continue;
    }
    await db.execute(sql`
      INSERT INTO roles (name, tenant_id, description)
      VALUES (${meta.display}, ${tenantId}, ${meta.description})
    `);
    rolesCreated.push(meta.display);
  }

  // ── 2. Seed permissions for each role ────────────────────────────────────────
  for (const [roleKey, screenPerms] of Object.entries(ROLE_PERMISSIONS)) {
    const meta = ROLE_META[roleKey];
    const roleRow = await db.execute(sql`
      SELECT id FROM roles WHERE name = ${meta.display} AND tenant_id = ${tenantId} LIMIT 1
    `);
    const roleId = (roleRow.rows?.[0] as any)?.id;
    if (!roleId) continue;

    for (const [screenKey, perm] of screenPerms) {
      await db.execute(sql`
        INSERT INTO role_permissions (role_id, screen_key, can_view, can_create, can_edit, can_delete, tenant_id)
        VALUES (${roleId}, ${screenKey}, ${perm.v}, ${perm.c}, ${perm.e}, ${perm.d}, ${tenantId})
        ON CONFLICT (role_id, screen_key) DO UPDATE SET
          can_view   = EXCLUDED.can_view,
          can_create = EXCLUDED.can_create,
          can_edit   = EXCLUDED.can_edit,
          can_delete = EXCLUDED.can_delete,
          tenant_id  = EXCLUDED.tenant_id
      `);
      permissionsInserted++;
    }
  }

  // ── 3. Create warehouses ─────────────────────────────────────────────────────
  for (const wh of WAREHOUSES) {
    const existing = await db.execute(sql`
      SELECT id FROM warehouses WHERE code = ${wh.code} AND tenant_id = ${tenantId} LIMIT 1
    `);
    if (existing.rows && existing.rows.length > 0) continue;

    await db.execute(sql`
      INSERT INTO warehouses (tenant_id, name, code, is_default, record_status)
      VALUES (${tenantId}, ${wh.name}, ${wh.code}, ${wh.isDefault}, 1)
    `);
    warehousesCreated.push(wh.name);
  }

  // ── 4. Set grocery-specific module label overrides ───────────────────────────
  // Rename generic sections to grocery-friendly names
  const GROCERY_MODULE_LABELS = [
    { key: "products",        label: "Inventory Management" },  // "Production & Inventory" → "Inventory Management"
    { key: "gatepasses",      label: "Delivery & Dispatch"  },  // "Dispatch & Logistics"  → "Delivery & Dispatch"
    { key: "purchase_orders", label: "Purchase & Vendors"   },  // "Purchases"             → "Purchase & Vendors"
    { key: "invoices",        label: "Sales & Billing"      },  // "Finance & Sales"       → "Sales & Billing"
  ];
  for (const { key, label } of GROCERY_MODULE_LABELS) {
    await db.execute(sql`
      INSERT INTO tenant_module_labels (tenant_id, module_key, custom_label)
      VALUES (${tenantId}, ${key}, ${label})
      ON CONFLICT (tenant_id, module_key) DO UPDATE SET custom_label = EXCLUDED.custom_label
    `);
  }

  return { rolesCreated, rolesSkipped, warehousesCreated, permissionsInserted };
}
