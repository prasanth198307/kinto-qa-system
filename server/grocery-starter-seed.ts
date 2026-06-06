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

  // ── Store Manager ─────────────────────────────────────────────────────────────
  // Oversees the whole store: sales, inventory view, staff ops, basic reports.
  // NOT: accounts, payroll, PO creation, vendor management.
  store_manager: [
    // Core
    ["dashboard",                   VIEW], ["overview",            VIEW],
    ["reports",                     VIEW], ["notification_settings", VIEW],
    // POS — view sessions, sales history, Z-report
    ["pos",                         VIEW],
    // Sales & Billing
    ["sales_dashboard",             VIEW],
    ["invoices",                    VCE ],
    ["payment_management",          VIEW],
    ["payments",                    VC  ],
    ["pending_payments",            VIEW],
    ["credit_notes",                VC  ],
    ["cancelled_invoices_report",   VIEW],
    ["sales_orders",                VCE ],
    ["sales_returns",               VIEW],
    // Inventory — view only (godown incharge manages stock)
    ["products",                    VIEW],
    ["inventory",                   VIEW],
    ["product_categories",          VIEW],
    ["uom",                         VIEW],
    ["price_lists",                 VIEW],
    ["serial_lot_register",         VIEW],
    // Stock adjustments — manager can approve/create write-offs
    ["inventory_stock_adjustments", VCE ],
    // Purchase — view only
    ["purchase_orders",             VIEW],
    ["vendors",                     VIEW],
    ["goods_receipt_notes",         VIEW],
    ["purchase_requisitions",       VIEW],
    // Warehouses — view only
    ["warehouses",                  VIEW],
    ["stock_transfers",             VIEW],
    // MIS Analytics — store-level dashboard
    ["mis_dashboard",               VIEW],
    ["mis_sales",                   VIEW],
    ["mis_inventory",               VIEW],
    ["mis_cash",                    VIEW],
    // Reports
    ["report_invoices",             VIEW],
    ["report_monthly_sales",        VIEW],
    ["report_cash_register",        VIEW],
    ["report_purchase_orders",      VIEW],
  ],

  // ── Cashier ───────────────────────────────────────────────────────────────────
  // Counter billing only. No accounts, no inventory, no management screens.
  cashier: [
    ["dashboard",            VIEW],
    // POS Terminal — primary screen
    ["pos",                  VC  ],
    // Manual billing (non-POS invoices)
    ["invoices",             VC  ],
    ["payments",             VC  ],
    // View own shift cash summary
    ["report_cash_register", VIEW],
  ],

  // ── Godown Incharge ───────────────────────────────────────────────────────────
  // Manages physical stock: receive goods, transfers, adjustments, bulk import.
  // NOT: billing, accounts, purchase orders creation, pricing decisions.
  godown_incharge: [
    ["dashboard",                   VIEW],
    // Products & Inventory — full control
    ["products",                    VCE ],
    ["inventory",                   FULL],
    ["product_categories",          VIEW],
    ["product_types",               VIEW],
    ["uom",                         VIEW],
    ["serial_lot_register",         FULL],
    // GRN — receive goods against purchase orders
    ["goods_receipt_notes",         FULL],
    ["inventory_grn_scan",          FULL],
    // Stock adjustments — damage, expiry, spoilage write-offs
    ["inventory_stock_adjustments", FULL],
    // Bulk import — for initial stock upload / new product onboarding
    ["inventory_bulk_import",       VC  ],
    // Warehouses & Transfers — move stock between godown and store
    ["warehouses",                  VIEW],
    ["stock_transfers",             FULL],
    // Purchase Orders — view only (to receive against them)
    ["purchase_orders",             VIEW],
    ["vendors",                     VIEW],
    ["purchase_requisitions",       VC  ],
    // Reports
    ["report_purchase_orders",      VIEW],
  ],

  // ── Purchase Manager ─────────────────────────────────────────────────────────
  // End-to-end procurement: POs, vendors, GRN approval, requisitions.
  // NOT: billing customers, HR, accounts.
  purchase_manager: [
    ["dashboard",                   VIEW],
    ["reports",                     VIEW],
    // Procurement — full
    ["purchase_orders",             FULL],
    ["vendors",                     FULL],
    ["vendor_types",                VCE ],
    ["vendor_debit_notes",          VCE ],
    ["vendor_analytics",            VIEW],
    ["vendor_history",              VIEW],
    ["purchase_requisitions",       FULL],
    // GRN — approve and record
    ["goods_receipt_notes",         FULL],
    ["inventory_grn_scan",          VIEW],
    // Approval workflows — GRN & high-value PO approvals
    ["approval_workflows",          VCE ],
    // Inventory — view to check stock levels before ordering
    ["products",                    VIEW],
    ["inventory",                   VIEW],
    ["product_categories",          VIEW],
    ["uom",                         VIEW],
    ["price_lists",                 VIEW],
    ["inventory_bulk_import",       VC  ],
    ["inventory_stock_adjustments", VIEW],
    ["warehouses",                  VIEW],
    ["serial_lot_register",         VIEW],
    // Reports
    ["report_purchase_orders",      VIEW],
    ["report_vendor_report",        VIEW],
  ],

  // ── Accountant ───────────────────────────────────────────────────────────────
  // Full accounts, GST, cash management. NOT: HR/payroll, inventory operations.
  accountant: [
    ["dashboard",                   VIEW],
    ["reports",                     VIEW],
    // Sales & Invoicing — full
    ["invoices",                    FULL],
    ["payment_management",          FULL],
    ["payments",                    FULL],
    ["sales_dashboard",             VIEW],
    ["customer_advances",           FULL],
    ["pending_payments",            VIEW],
    ["credit_notes",                FULL],
    ["cancelled_invoices_report",   VIEW],
    ["write_off_report",            VIEW],
    ["payment_writeoff",            FULL],
    ["invoice_templates",           VIEW],
    ["bulk_payment_report",         VIEW],
    // GST
    ["gst_reports",                 VCE ],
    // Double-entry Accounting — full
    ["chart_of_accounts",           FULL],
    ["account_subtypes",            FULL],
    ["journal_entries",             FULL],
    ["manual_journal_entry",        FULL],
    ["trial_balance",               VIEW],
    ["profit_loss",                 VIEW],
    ["balance_sheet",               VIEW],
    ["bank_transactions",           FULL],
    ["banks",                       FULL],
    ["ledger_view",                 VIEW],
    ["day_book",                    VIEW],
    ["aging_report",                VIEW],
    ["cash_flow_statement",         VIEW],
    ["group_summary",               VIEW],
    ["tds_management",              VCE ],
    ["debit_notes",                 VCE ],
    ["cost_centres",                VIEW],
    ["budget_variance",             VIEW],
    // Expenses & Cash Register
    ["expenses",                    FULL],
    ["expense_categories",          VCE ],
    ["monthly_expenses",            FULL],
    ["cash_register",               FULL],
    ["report_expenses",             VIEW],
    // Vendor — view only
    ["vendors",                     VIEW],
    ["purchase_orders",             VIEW],
    ["vendor_debit_notes",          VIEW],
    // Reports
    ["report_invoices",             VIEW],
    ["report_monthly_sales",        VIEW],
    ["report_cash_register",        VIEW],
    ["report_payments",             VIEW],
    // MIS — financial visibility
    ["mis_dashboard",               VIEW],
    ["mis_sales",                   VIEW],
    ["mis_cash",                    VIEW],
    ["mis_financial",               VIEW],
  ],

  // ── HR Manager ───────────────────────────────────────────────────────────────
  // All HR & Payroll. NOT: billing, inventory, accounts.
  hr_manager: [
    ["dashboard",           VIEW],
    ["hr_employees",        FULL],
    ["hr_attendance",       FULL],
    ["hr_leaves",           FULL],
    ["hr_payroll",          FULL],
    ["hr_exit_management",  FULL],
    ["hr_loans",            FULL],
    ["hr_tds",              FULL],
    ["hr_reports",          VIEW],
    ["hr_ess_admin",        FULL],
    ["hr_masters",          FULL],
    ["hr_expense_claims",   FULL],
    ["hr_appraisals",       FULL],
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
