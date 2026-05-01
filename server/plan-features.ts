/**
 * Plan-based feature gating for Kinto Smart Ops SaaS
 *
 * Plans:  trial → basic → professional → enterprise
 * Each plan is a superset of the previous.
 */

// ── Module definitions ────────────────────────────────────────────────────────
// Each module key maps to a list of nav-item IDs visible when that module is active.

export const MODULE_NAV_ITEMS: Record<string, string[]> = {
  invoicing: [
    "overview",
    "sales-dashboard",
    "vendor-analytics",
    "reports",
    "invoices",
    "vendor-history",
    "pending-payments",
    "customer-outstanding-report",
    "payment-management",
    "customer-advances",
    "credit-notes",
    "cancelled-invoices",
    "write-off-report",
  ],
  purchase_orders: [
    "purchase-orders",
    "add-purchase-order",
    "vendors",
    "vendor-types",
    "vendor-debit-notes",
    "purchase-requisitions",
    "goods-receipt-notes",
  ],
  basic_inventory: [
    "products",
    "product-categories",
    "product-types",
    "add-product",
    "raw-materials",
    "add-raw-material",
    "raw-material-types",
    "finished-goods",
    "uom",
    "users",
    "role-permissions",
    "template-management",
    "notification-settings",
    "data-import",
    "admin-tools",
    "spare-parts",
    "spare-parts-stock",
    "company-settings",
    "price-lists",
    "approval-workflows",
    "audit-log",
    "cost-centres",
    "gstr-reports",
  ],
  api_hub: [
    "api-keys",
  ],
  gatepasses: [
    "gatepasses",
    "create-gatepass",
    "dispatch-tracking",
    "dispatch-masters",
  ],
  sales_orders: [
    "sales-orders",
    "sales-officers",
  ],
  production: [
    "raw-material-issuance",
    "create-issuance",
    "production-entries",
    "production-reconciliations",
    "production-reconciliation-report",
    "variance-analytics",
    "scrap-management",
    "purchase-returns",
  ],
  quality_returns: [
    "sales-returns",
  ],
  accounting: [
    "chart-of-accounts",
    "journal-entries",
    "journal-entry-new",
    "bank-transactions",
    "trial-balance",
    "profit-loss",
    "balance-sheet",
    "ledger-view",
    "day-book",
    "aging-report",
    "cash-flow-statement",
    "group-summary",
    "budget-variance",
    "tds-management",
    "currency-management",
  ],
  mis: [
    "mis-dashboard",
    "mis-production",
    "mis-inventory",
    "mis-sales",
    "mis-delivery",
    "mis-cash",
    "mis-financial",
  ],
  expenses: [
    "expenses",
    "expense-categories",
    "monthly-expenses",
    "cash-register",
    "cash-register-report",
  ],
  documents: [
    "documents",
  ],
  whatsapp: [
    "checklists",
    "checklist-assignments",
    "machine-startup-reminders",
    "whatsapp-analytics",
  ],
  maintenance: [
    "machines",
    "machine-types",
    "pm-templates",
    "maintenance",
    "pm-history",
    "schedule-maintenance",
  ],
  crm: [
    "crm-leads",
  ],
  hr_payroll: [
    "hr-employees",
    "hr-attendance",
    "hr-leaves",
    "hr-payroll",
    "hr-exit-management",
    "hr-loans",
    "hr-tds",
    "hr-recruitment",
    "hr-reports",
    "hr-masters",
    "hr-ess-admin",
    "hr-expense-claims",
    "timesheets",
    "hr-appraisals",
  ],
  recurring_invoices: [
    "recurring-invoices",
  ],
  warehouses: [
    "warehouses",
  ],
  projects: [
    "projects",
  ],
  fixed_assets: [
    "fixed-assets",
  ],
  multi_currency: [
    "currency-management",
  ],
};

// ── Plan → module list ────────────────────────────────────────────────────────

// DB subscription_plans.modules is the authoritative source — these code constants
// serve as the fallback when a plan slug has no DB record.
// Keep in sync with the subscription_plans table values.
const TRIAL_MODULES        = ["invoicing", "purchase_orders", "basic_inventory", "gatepasses", "sales_orders", "production", "quality_returns", "accounting", "mis", "expenses", "documents", "crm", "whatsapp", "maintenance", "hr_payroll", "recurring_invoices", "warehouses", "projects", "fixed_assets", "multi_currency"];
const BASIC_MODULES        = ["invoicing", "purchase_orders", "basic_inventory", "gatepasses", "sales_orders", "expenses", "documents"];
const PROFESSIONAL_MODULES = ["invoicing", "purchase_orders", "basic_inventory", "gatepasses", "sales_orders", "production", "quality_returns", "accounting", "mis", "expenses", "documents", "whatsapp", "maintenance", "crm", "api_hub", "recurring_invoices", "warehouses"];
const ENTERPRISE_MODULES   = ["invoicing", "purchase_orders", "basic_inventory", "gatepasses", "sales_orders", "production", "quality_returns", "accounting", "mis", "expenses", "documents", "whatsapp", "maintenance", "hr_payroll", "crm", "api_hub", "recurring_invoices", "warehouses", "projects", "fixed_assets", "multi_currency"];

export const PLAN_MODULES: Record<string, string[]> = {
  trial:        TRIAL_MODULES,
  basic:        BASIC_MODULES,
  professional: PROFESSIONAL_MODULES,
  enterprise:   ENTERPRISE_MODULES,
};

// ── Route prefix → minimum plan ───────────────────────────────────────────────
// Maps API path prefixes to the plan that unlocks them.

export const ROUTE_PLAN_REQUIREMENTS: Array<{ prefix: string; module: string; minPlan: string }> = [
  // Gatepasses
  { prefix: "/api/gatepasses",          module: "gatepasses",     minPlan: "basic" },
  { prefix: "/api/dispatch",            module: "gatepasses",     minPlan: "basic" },

  // Sales Orders
  { prefix: "/api/sales-orders",        module: "sales_orders",   minPlan: "basic" },
  { prefix: "/api/sales-officers",      module: "sales_orders",   minPlan: "basic" },

  // Production
  { prefix: "/api/raw-material-issuance", module: "production",   minPlan: "professional" },
  { prefix: "/api/production-entries",  module: "production",     minPlan: "professional" },
  { prefix: "/api/production-reconciliations", module: "production", minPlan: "professional" },
  { prefix: "/api/variance-analytics",  module: "production",     minPlan: "professional" },

  // Sales Returns / Quality
  { prefix: "/api/sales-returns",       module: "quality_returns",minPlan: "professional" },
  { prefix: "/api/credit-notes",        module: "quality_returns",minPlan: "professional" },

  // Accounting / COA
  { prefix: "/api/chart-of-accounts",   module: "accounting",     minPlan: "professional" },
  { prefix: "/api/journal-entries",     module: "accounting",     minPlan: "professional" },
  { prefix: "/api/journal-lines",       module: "accounting",     minPlan: "professional" },
  { prefix: "/api/trial-balance",       module: "accounting",     minPlan: "professional" },
  { prefix: "/api/group-summary",       module: "accounting",     minPlan: "professional" },
  { prefix: "/api/bank-transactions",   module: "accounting",     minPlan: "professional" },
  { prefix: "/api/bank-statement",      module: "accounting",     minPlan: "professional" },
  { prefix: "/api/budgets",             module: "accounting",     minPlan: "professional" },

  // MIS
  { prefix: "/api/mis",                 module: "mis",            minPlan: "professional" },

  // Expenses & Cash Register (basic+)
  { prefix: "/api/expense-vouchers",    module: "expenses",       minPlan: "basic" },
  { prefix: "/api/expense-categories",  module: "expenses",       minPlan: "basic" },
  { prefix: "/api/monthly-expenses",    module: "expenses",       minPlan: "basic" },
  { prefix: "/api/cash-register",       module: "expenses",       minPlan: "basic" },

  // Documents (basic+)
  { prefix: "/api/documents",           module: "documents",      minPlan: "basic" },
  { prefix: "/api/document-categories", module: "documents",      minPlan: "basic" },

  // WhatsApp / Checklists (professional+)
  { prefix: "/api/checklist",           module: "whatsapp",       minPlan: "professional" },
  { prefix: "/api/whatsapp",            module: "whatsapp",       minPlan: "professional" },

  // Maintenance / PM (professional+)
  { prefix: "/api/maintenance",         module: "maintenance",    minPlan: "professional" },
  { prefix: "/api/pm-",                 module: "maintenance",    minPlan: "professional" },
  { prefix: "/api/machines",            module: "maintenance",    minPlan: "professional" },
  { prefix: "/api/machine-types",       module: "maintenance",    minPlan: "professional" },
  { prefix: "/api/spare-parts",         module: "maintenance",    minPlan: "professional" },

  // CRM (Professional)
  { prefix: "/api/crm",                 module: "crm",            minPlan: "professional" },

  // HR & Payroll (Enterprise)
  { prefix: "/api/hr",                  module: "hr_payroll",     minPlan: "enterprise" },

  // Recurring Invoices (Professional+)
  { prefix: "/api/assets/recurring-invoices", module: "recurring_invoices", minPlan: "professional" },

  // Warehouses & Multi-location Inventory (Professional+)
  { prefix: "/api/inventory/warehouses",     module: "warehouses",    minPlan: "professional" },
  { prefix: "/api/inventory/stock-transfers",module: "warehouses",    minPlan: "professional" },
  { prefix: "/api/inventory/uom",            module: "warehouses",    minPlan: "professional" },
  { prefix: "/api/inventory/serial",         module: "warehouses",    minPlan: "professional" },

  // Projects (Enterprise)
  { prefix: "/api/projects",                 module: "projects",      minPlan: "enterprise" },

  // Fixed Assets (Enterprise)
  { prefix: "/api/assets/fixed-assets",      module: "fixed_assets",  minPlan: "enterprise" },

  // Multi-currency (Enterprise)
  { prefix: "/api/assets/currencies",        module: "multi_currency", minPlan: "enterprise" },
  { prefix: "/api/assets/exchange-rates",    module: "multi_currency", minPlan: "enterprise" },
];

// ── Plan order for comparison ─────────────────────────────────────────────────

const PLAN_ORDER: Record<string, number> = {
  trial: 0, basic: 1, professional: 2, enterprise: 3,
};

export function planMeetsMinimum(tenantPlan: string, minPlan: string): boolean {
  // Trial gets full enterprise-level access — matches the "14-day full access" promise
  if (tenantPlan === "trial") return true;
  const tenantLevel = PLAN_ORDER[tenantPlan] ?? 0;
  const requiredLevel = PLAN_ORDER[minPlan] ?? 0;
  return tenantLevel >= requiredLevel;
}

// ── All available module keys (for the plan management UI) ───────────────────
export const ALL_MODULE_KEYS = Object.keys(MODULE_NAV_ITEMS);

// ── Feature summary for a given plan (code-based fallback) ───────────────────
export function getPlanFeatures(plan: string) {
  const modules = PLAN_MODULES[plan] ?? PLAN_MODULES["trial"];
  const navItems = new Set<string>();
  for (const mod of modules) {
    for (const item of MODULE_NAV_ITEMS[mod] ?? []) {
      navItems.add(item);
    }
  }
  return { plan, modules, allowedNavItems: [...navItems] };
}

// ── Feature summary using DB-sourced module list ──────────────────────────────
// Use this when the plan record has been loaded from the DB (modules is a JSON array).
export function getPlanFeaturesFromModules(plan: string, modules: string[]) {
  const navItems = new Set<string>();
  for (const mod of modules) {
    for (const item of MODULE_NAV_ITEMS[mod] ?? []) {
      navItems.add(item);
    }
  }
  return { plan, modules, allowedNavItems: [...navItems] };
}
