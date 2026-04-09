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
    "hpcl-migration",
    "spare-parts",
    "spare-parts-stock",
    "company-settings",
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
  hr_payroll: [
    "hr-employees",
    "hr-attendance",
    "hr-leaves",
    "hr-payroll",
    "hr-exit-management",
    "hr-loans",
    "hr-reports",
    "hr-masters",
  ],
};

// ── Plan → module list ────────────────────────────────────────────────────────

const TRIAL_MODULES       = ["invoicing", "purchase_orders", "basic_inventory"];
const BASIC_MODULES       = [...TRIAL_MODULES,       "gatepasses", "sales_orders"];
const PROFESSIONAL_MODULES= [...BASIC_MODULES,       "production", "quality_returns", "accounting", "mis", "expenses", "documents"];
const ENTERPRISE_MODULES  = [...PROFESSIONAL_MODULES,"whatsapp",   "maintenance", "hr_payroll"];

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

  // Expenses & Cash Register
  { prefix: "/api/expense-vouchers",    module: "expenses",       minPlan: "professional" },
  { prefix: "/api/expense-categories",  module: "expenses",       minPlan: "professional" },
  { prefix: "/api/monthly-expenses",    module: "expenses",       minPlan: "professional" },
  { prefix: "/api/cash-register",       module: "expenses",       minPlan: "professional" },

  // Documents
  { prefix: "/api/documents",           module: "documents",      minPlan: "professional" },
  { prefix: "/api/document-categories", module: "documents",      minPlan: "professional" },

  // WhatsApp / Checklists (Enterprise)
  { prefix: "/api/checklist",           module: "whatsapp",       minPlan: "enterprise" },
  { prefix: "/api/whatsapp",            module: "whatsapp",       minPlan: "enterprise" },

  // Maintenance / PM (Enterprise)
  { prefix: "/api/maintenance",         module: "maintenance",    minPlan: "enterprise" },
  { prefix: "/api/pm-",                 module: "maintenance",    minPlan: "enterprise" },
  { prefix: "/api/machines",            module: "maintenance",    minPlan: "enterprise" },
  { prefix: "/api/machine-types",       module: "maintenance",    minPlan: "enterprise" },
  { prefix: "/api/spare-parts",         module: "maintenance",    minPlan: "enterprise" },

  // HR & Payroll (Enterprise)
  { prefix: "/api/hr",                  module: "hr_payroll",     minPlan: "enterprise" },
];

// ── Plan order for comparison ─────────────────────────────────────────────────

const PLAN_ORDER: Record<string, number> = {
  trial: 0, basic: 1, professional: 2, enterprise: 3,
};

export function planMeetsMinimum(tenantPlan: string, minPlan: string): boolean {
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
