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
    "vendor-history",
    "pending-payments",
    "purchase-requisitions",
    "goods-receipt-notes",
  ],
  basic_inventory: [
    "products",
    "product-categories",
    "product-types",
    "add-product",
    "uom",
    "inventory-bulk-import",
    "inventory-grn-scan",
    "inventory-stock-adjustments",
    "users",
    "role-permissions",
    "template-management",
    "notification-settings",
    "data-import",
    "admin-tools",
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
  ],
  production: [
    "sales-officers",
    "mis-production",
    "mis-manufacturing",
    "raw-materials",
    "add-raw-material",
    "raw-material-types",
    "finished-goods",
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
    "spare-parts",
    "spare-parts-stock",
  ],
  crm: [
    "crm-leads",
    "crm-surveys",
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
    "hr-onboarding",
    "hr-letters",
    "hr-support-desk",
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
  healthcare: [
    "healthcare",
  ],
  education: [
    "education",
  ],
  logistics_transport: [
    "logistics",
  ],
  real_estate: [
    "real-estate",
  ],
  pos: [
    "pos",
  ],
  agriculture: [
    "agriculture",
  ],
  gold_erp: [
    "gold-erp",
    // Core
    "gold-erp-overview", "gold-erp-rates", "gold-erp-karigar", "gold-erp-items", "gold-erp-estimates",
    "gold-erp-metal-ledger", "gold-erp-analytics",
    // Production
    "gold-erp-production", "gold-erp-jobwork", "gold-erp-sketch",
    "gold-erp-cad", "gold-erp-cam",
    "gold-erp-ghat", "gold-erp-settlement", "gold-erp-finalize", "gold-erp-karigar-ledger", "gold-erp-repairs",
    "gold-erp-karigar-attendance",
    // Wholesale & B2B
    "gold-erp-wholesale-b2b-orders", "gold-erp-wholesale-jobwork", "gold-erp-hallmarking-batches",
    // Retail
    "gold-erp-jewellery-pos",
    "gold-erp-counter-bookings", "gold-erp-customer-approvals", "gold-erp-buyback",
    "gold-erp-physical-audit", "gold-erp-loyalty", "gold-erp-promotions", "gold-erp-refining",
    "gold-erp-pos-old-gold", "gold-erp-hallmarking",
    // Bullion & Vault
    "gold-erp-bullion", "gold-erp-bullion-rate-cuts", "gold-erp-vault-movement",
    "gold-erp-bullion-bookings", "gold-erp-vault-audit",
    // Chit Schemes
    "gold-erp-chit", "gold-erp-chit-collection-register",
    "gold-erp-chit-maturity", "gold-erp-chit-defaulters", "gold-erp-chit-redemptions",
    // Digital & OMS
    "gold-erp-ecatalog", "gold-erp-oms-orders", "gold-erp-oms-notify", "gold-erp-ecommerce",
    // RFID, Finance, Integrations
    "gold-erp-rfid", "gold-erp-metal-finance", "gold-erp-integrations-config",
  ],
};

// ── Plan → module list ────────────────────────────────────────────────────────

// DB subscription_plans.modules is the authoritative source — these code constants
// serve as the fallback when a plan slug has no DB record.
// Keep in sync with the subscription_plans table values.
const INDUSTRY_MODULES     = ["healthcare", "education", "logistics_transport", "real_estate", "pos", "agriculture", "gold_erp"];
const TRIAL_MODULES        = ["invoicing", "purchase_orders", "basic_inventory", "gatepasses", "sales_orders", "production", "quality_returns", "accounting", "mis", "expenses", "documents", "crm", "whatsapp", "maintenance", "hr_payroll", "recurring_invoices", "warehouses", "projects", "fixed_assets", "multi_currency", ...INDUSTRY_MODULES];
const BASIC_MODULES        = ["invoicing", "purchase_orders", "basic_inventory", "gatepasses", "sales_orders", "expenses", "documents"];
const PROFESSIONAL_MODULES = ["invoicing", "purchase_orders", "basic_inventory", "gatepasses", "sales_orders", "production", "quality_returns", "accounting", "mis", "expenses", "documents", "whatsapp", "maintenance", "crm", "api_hub", "recurring_invoices", "warehouses"];
const ENTERPRISE_MODULES   = ["invoicing", "purchase_orders", "basic_inventory", "gatepasses", "sales_orders", "production", "quality_returns", "accounting", "mis", "expenses", "documents", "whatsapp", "maintenance", "hr_payroll", "crm", "api_hub", "recurring_invoices", "warehouses", "projects", "fixed_assets", "multi_currency", ...INDUSTRY_MODULES];
// "pos" intentionally excluded — Gold ERP plan uses Jewellery POS (gold-erp-jewellery-pos) instead of the
// generic retail POS. Showing both would confuse jewellers. Standard POS is hidden from the sidebar.
const GOLD_ERP_MODULES     = ["gold_erp", "invoicing", "purchase_orders", "basic_inventory", "gatepasses", "sales_orders", "production", "quality_returns", "accounting", "mis", "expenses", "documents", "whatsapp", "maintenance", "hr_payroll", "crm", "api_hub", "recurring_invoices", "warehouses", "projects", "fixed_assets", "multi_currency"];

export const PLAN_MODULES: Record<string, string[]> = {
  trial:         TRIAL_MODULES,
  basic:         BASIC_MODULES,
  professional:  PROFESSIONAL_MODULES,
  enterprise:    ENTERPRISE_MODULES,
  gold_erp_plan: GOLD_ERP_MODULES,
};

// ── Route prefix → minimum plan ───────────────────────────────────────────────
// Maps API path prefixes to the plan that unlocks them.

export const ROUTE_PLAN_REQUIREMENTS: Array<{ prefix: string; module: string; minPlan: string }> = [
  // Gatepasses
  { prefix: "/api/gatepasses",          module: "gatepasses",     minPlan: "basic" },
  { prefix: "/api/dispatch",            module: "gatepasses",     minPlan: "basic" },

  // Sales Orders
  { prefix: "/api/sales-orders",        module: "sales_orders",   minPlan: "basic" },
  { prefix: "/api/sales-officers",      module: "production",     minPlan: "professional" },

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
  { prefix: "/api/assets/currencies",        module: "multi_currency",     minPlan: "enterprise" },
  { prefix: "/api/assets/exchange-rates",    module: "multi_currency",     minPlan: "enterprise" },

  // Industry Verticals (Enterprise add-ons)
  { prefix: "/api/healthcare",               module: "healthcare",          minPlan: "enterprise" },
  { prefix: "/api/education",                module: "education",           minPlan: "enterprise" },
  { prefix: "/api/logistics",                module: "logistics_transport", minPlan: "enterprise" },
  { prefix: "/api/real-estate",              module: "real_estate",         minPlan: "enterprise" },
  { prefix: "/api/pos",                      module: "pos",                 minPlan: "enterprise" },
  { prefix: "/api/agriculture",              module: "agriculture",         minPlan: "enterprise" },
  { prefix: "/api/gold-erp",                module: "gold_erp",            minPlan: "enterprise" },
];

// ── Plan order for comparison ─────────────────────────────────────────────────

const PLAN_ORDER: Record<string, number> = {
  trial: 0, basic: 1, professional: 2, enterprise: 3, gold_erp_plan: 3,
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

// ── Catalog slug → plan-level module key aliases ─────────────────────────────
// The Module Marketplace catalog uses short slugs (e.g. "inventory", "sales").
// MODULE_NAV_ITEMS uses the full plan-level keys (e.g. "basic_inventory", "sales_orders").
// This map expands catalog slugs so purchased modules correctly unlock nav items
// and enable hasModule() checks on the frontend.
const CATALOG_TO_PLAN_MODULE: Record<string, string> = {
  inventory:       "basic_inventory",
  purchase:        "purchase_orders",
  quality:         "quality_returns",
  sales:           "sales_orders",
  logistics:       "logistics_transport",
  expense_claims:  "expenses",
  tds_management:  "accounting",
  attendance:      "hr_payroll",
  ess:             "hr_payroll",
  appraisals:      "hr_payroll",
  dashboard:       "mis",
  user_management: "basic_inventory",
  roles:           "basic_inventory",
  company_settings:"basic_inventory",
};

// ── Feature summary using DB-sourced module list ──────────────────────────────
// Use this when the plan record has been loaded from the DB (modules is a JSON array).
// Automatically expands catalog slugs to their plan-level equivalents so that:
//   1. allowedNavItems includes the correct nav items for marketplace purchases
//   2. The returned modules array includes both original + expanded slugs so
//      hasModule('basic_inventory') returns true even when 'inventory' was purchased
export function getPlanFeaturesFromModules(plan: string, rawModules: string[]) {
  // Expand each catalog slug to its plan-level key (or keep as-is if already plan-level)
  const expanded = rawModules.map(m => CATALOG_TO_PLAN_MODULE[m] ?? m);
  // Deduplicate: union of original catalog slugs + expanded plan-level keys
  const allModules = [...new Set([...rawModules, ...expanded])];

  const navItems = new Set<string>();
  for (const mod of allModules) {
    for (const item of MODULE_NAV_ITEMS[mod] ?? []) {
      navItems.add(item);
    }
  }
  return { plan, modules: allModules, allowedNavItems: [...navItems] };
}
