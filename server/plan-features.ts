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
  masters: [
    "masters/hsn-codes",
    "masters/sac-codes",
    "masters/tax-config",
    "masters/states-countries",
    "masters/bank-master",
    "masters/branches",
    "masters/doc-numbering",
    "masters/email-templates",
    "masters/sms-templates",
    "masters/approval-matrix",
    "masters/feature-flags",
    "masters/print-templates",
    "masters/webhooks",
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
    "manufacturing/job-cards",
    "manufacturing/sub-contracting",
    "manufacturing/machine-oee",
    "manufacturing/mrp",
    "manufacturing/work-orders",
    "manufacturing/quality",
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
    "tax-engine",
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
  // ── Extended App Suite — sellable as add-ons or bundled in enterprise plans ──
  swachsign: ["swachsign"],
  swachdesk: ["swachdesk", "swachdesk-reports", "swachdesk-section"],
  swachmeet: ["swachmeet"],
  swachsocial: ["swachsocial"],
  swachforms: ["swachforms", "swachforms-builder", "swachforms-section"],
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
    "manufacturing/machine-oee",
  ],
  crm: [
    "crm-leads", "crm-surveys", "crm-enterprise",
    "crm/pipeline", "crm/contacts", "crm/accounts",
    "crm/activities", "crm/leads", "crm/campaigns",
    "crm/email-campaigns", "crm/whatsapp-campaigns", "crm/whatsapp",
    "crm/customer360", "crm/customer-360", "crm/quotations", "crm/lead-scoring",
    "crm/drip-campaigns", "crm/telephony", "crm/reports",
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
  restaurant: [
    "restaurant", "restaurant-enterprise", "restaurant-erp-section",
    "restaurant-pos", "restaurant/pos",
    "restaurant-kitchen", "restaurant/kitchen",
    "restaurant-tables", "restaurant/tables",
    "restaurant-menu", "restaurant/menu",
    "restaurant-orders", "restaurant/orders",
    "restaurant-delivery", "restaurant/delivery",
    "restaurant-reservations", "restaurant/reservations",
    "restaurant-shifts", "restaurant/shifts",
    "restaurant-customers", "restaurant/customers",
    "restaurant-inventory", "restaurant/inventory",
    "restaurant-outlets", "restaurant/outlets",
    "restaurant-reports", "restaurant/reports",
    "restaurant-aggregators", "restaurant-analytics",
    "restaurant-staff", "restaurant-steward", "restaurant-kiosk",
    "restaurant-franchise", "restaurant-tax-settings", "restaurant-gift-cards",
    "restaurant-central-kitchen", "restaurant-menu-translations",
    "restaurant-recipes", "restaurant-campaigns", "restaurant-table-order", "restaurant-cds",
    "restaurant-payment-terminal",
    "restaurant/ondc-integration", "restaurant/loyalty-expiry",
  ],
  hotel: [
    "hotel", "hotel-enterprise",
    "hotel/front-desk", "hotel/reservations", "hotel/checkin",
    "hotel/rooms", "hotel/folio", "hotel/housekeeping",
    "hotel/rates", "hotel/corporate", "hotel/night-audit", "hotel/reports",
    "hotel/channel-manager", "hotel/revenue-management", "hotel/banquet",
  ],
  healthcare: [
    "healthcare", "healthcare-enterprise", "healthcare-enterprise2",
    "healthcare/patients", "healthcare/opd", "healthcare/ipd", "healthcare/beds",
    "healthcare/ot", "healthcare/lab", "healthcare/nursing", "healthcare/insurance",
    "healthcare/doctors", "healthcare/blood-bank", "healthcare/reports",
    "healthcare/abdm", "healthcare/emr", "healthcare/tpa-claims",
  ],
  pharmacy: [
    "pharmacy", "pharmacy-enterprise",
    "pharmacy/billing", "pharmacy/drugs", "pharmacy/stock", "pharmacy/purchases",
    "pharmacy/schedule-h", "pharmacy/schedule-x", "pharmacy/licenses",
    "pharmacy/expiry", "pharmacy/reports",
    "pharmacy/prescriptions", "pharmacy/narcotics-register", "pharmacy/e-invoice",
  ],
  education: [
    "education", "education-enterprise", "education-enterprise2",
    "education/students", "education/admissions", "education/classes",
    "education/attendance", "education/exams", "education/fees",
    "education/timetable", "education/homework", "education/online-exams",
    "education/library", "education/transport", "education/hostel",
    "education/parent-portal", "education/reports",
    "education/nep-compliance", "education/certificates",
  ],
  logistics_transport: [
    "logistics", "logistics-enterprise",
    "logistics/fleet", "logistics/drivers", "logistics/trips", "logistics/gps",
    "logistics/consignments", "logistics/documents", "logistics/freight",
    "logistics/freight-billing", "logistics/eway-bills", "logistics/eway-bill",
    "logistics/epod", "logistics/fuel", "logistics/routes", "logistics/store-transfers",
    "logistics/reports", "logistics/live-gps", "logistics/route-optimization",
  ],
  real_estate: [
    "real-estate", "real-estate-enterprise",
    "real-estate/projects", "real-estate/crm", "real-estate/bookings",
    "real-estate/collections", "real-estate/demand-letters", "real-estate/brokers",
    "real-estate/construction", "real-estate/documents", "real-estate/rera",
    "real-estate/society", "real-estate/construction-loans",
    "real-estate/subcontractors", "real-estate/customer-portal", "real-estate/reports",
    "real-estate/bank-loans", "real-estate/project-pl",
  ],
  pos: [
    "pos", "retail-enterprise",
    "retail/omni-channel", "retail/loyalty", "retail/franchise",
    "retail/b2b-portal", "retail/pos-hardware", "retail/store-transfers",
  ],
  agriculture: [
    "agriculture", "agriculture-enterprise",
    "agriculture/farms", "agriculture/crops", "agriculture/harvest",
    "agriculture/inputs", "agriculture/fpo", "agriculture/mandi", "agriculture/mandi-prices",
    "agriculture/market", "agriculture/weather", "agriculture/traceability",
    "agriculture/schemes", "agriculture/pmfby", "agriculture/reports",
  ],
  ngo: [
    "ngo", "ngo-enterprise",
    "ngo/donors", "ngo/donations", "ngo/projects", "ngo/beneficiaries",
    "ngo/grants", "ngo/volunteers", "ngo/80g", "ngo/80g-bulk", "ngo/fcra",
    "ngo/csr", "ngo/reports", "ngo/funds", "ngo/donor-admin",
  ],
  nidhi: [
    "nidhi", "nidhi-enterprise",
    "nidhi/members", "nidhi/deposits", "nidhi/loans", "nidhi/emi",
    "nidhi/collection", "nidhi/shares", "nidhi/gold-rates", "nidhi/interest-rates",
    "nidhi/daily-collection", "nidhi/mobile-collection", "nidhi/compliance", "nidhi/reports",
    "nidhi/loan-sanction", "nidhi/pdc-tracking", "nidhi/rbi-returns",
  ],
  ecommerce: [
    "ecommerce", "ecommerce-enterprise",
    "ecommerce/dashboard", "ecommerce/orders", "ecommerce/listings",
    "ecommerce/returns", "ecommerce/settlements", "ecommerce/shipments",
    "ecommerce/channels", "ecommerce/inventory-sync", "ecommerce/warehouses", "ecommerce/reports",
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
    // Additional screens
    "gold-erp-live-rates", "gold-erp-hallmarking-page", "gold-erp-sebi-reporting", "gold-erp-digital-gold",
    "gold-erp-karigar-attendance", "gold-erp-chit-collection-register", "gold-erp-vault-movement",
    "gold-erp-bullion-rate-cuts",
  ],
};

// ── Plan → module list ────────────────────────────────────────────────────────

// DB subscription_plans.modules is the authoritative source — these code constants
// serve as the fallback when a plan slug has no DB record.
// Keep in sync with the subscription_plans table values.
const INDUSTRY_MODULES     = ["healthcare", "pharmacy", "education", "logistics_transport", "real_estate", "pos", "agriculture", "gold_erp", "restaurant", "hotel", "ngo", "nidhi", "ecommerce"];
const TRIAL_MODULES        = ["invoicing", "purchase_orders", "basic_inventory", "gatepasses", "sales_orders", "production", "quality_returns", "accounting", "mis", "expenses", "documents", "crm", "whatsapp", "maintenance", "hr_payroll", "recurring_invoices", "warehouses", "projects", "fixed_assets", "multi_currency", ...INDUSTRY_MODULES];
const BASIC_MODULES        = ["invoicing", "purchase_orders", "basic_inventory", "gatepasses", "sales_orders", "expenses", "documents"];
const PROFESSIONAL_MODULES = ["invoicing", "purchase_orders", "basic_inventory", "gatepasses", "sales_orders", "production", "quality_returns", "accounting", "mis", "expenses", "documents", "whatsapp", "maintenance", "crm", "api_hub", "recurring_invoices", "warehouses"];
const EXTENDED_SUITE_MODULES = ["swachsign", "swachdesk", "swachmeet", "swachsocial", "swachforms"];
const ENTERPRISE_MODULES   = ["invoicing", "purchase_orders", "basic_inventory", "gatepasses", "sales_orders", "production", "quality_returns", "accounting", "mis", "expenses", "documents", "whatsapp", "maintenance", "hr_payroll", "crm", "api_hub", "recurring_invoices", "warehouses", "projects", "fixed_assets", "multi_currency", ...INDUSTRY_MODULES, ...EXTENDED_SUITE_MODULES];
// "pos" intentionally excluded — Gold ERP plan uses Jewellery POS (gold-erp-jewellery-pos) instead of the
// generic retail POS. Showing both would confuse jewellers. Standard POS is hidden from the sidebar.
const GOLD_ERP_MODULES     = ["gold_erp", "invoicing", "purchase_orders", "basic_inventory", "gatepasses", "sales_orders", "production", "quality_returns", "accounting", "mis", "expenses", "documents", "whatsapp", "maintenance", "hr_payroll", "crm", "api_hub", "recurring_invoices", "warehouses", "projects", "fixed_assets", "multi_currency"];

// ── Restaurant vertical plans ─────────────────────────────────────────────────
const RESTAURANT_STARTER_MODULES = [
  "invoicing", "purchase_orders", "basic_inventory", "expenses", "documents",
  "restaurant",
];
const RESTAURANT_PROFESSIONAL_MODULES = [
  "invoicing", "purchase_orders", "basic_inventory", "gatepasses", "expenses",
  "documents", "accounting", "mis", "crm", "production", "warehouses",
  "api_hub", "whatsapp", "restaurant",
];
const RESTAURANT_ENTERPRISE_MODULES = [
  "invoicing", "purchase_orders", "basic_inventory", "gatepasses", "sales_orders",
  "expenses", "documents", "accounting", "mis", "crm", "production", "warehouses",
  "api_hub", "whatsapp", "hr_payroll", "projects", "fixed_assets", "multi_currency",
  "restaurant",
];

// ── Hotel vertical plans ──────────────────────────────────────────────────────
const HOTEL_STARTER_MODULES = [
  "invoicing", "purchase_orders", "basic_inventory", "expenses", "documents",
  "hotel",
];
const HOTEL_PROFESSIONAL_MODULES = [
  "invoicing", "purchase_orders", "basic_inventory", "expenses", "documents",
  "accounting", "mis", "crm", "warehouses", "api_hub", "whatsapp", "hotel",
];
const HOTEL_ENTERPRISE_MODULES = [
  "invoicing", "purchase_orders", "basic_inventory", "gatepasses", "expenses",
  "documents", "accounting", "mis", "crm", "warehouses", "api_hub", "whatsapp",
  "hr_payroll", "projects", "fixed_assets", "multi_currency", "hotel",
];

// ── Healthcare vertical plans ─────────────────────────────────────────────────
const HEALTHCARE_STARTER_MODULES = ["invoicing", "expenses", "documents", "healthcare"];
const HEALTHCARE_PROFESSIONAL_MODULES = [
  "invoicing", "purchase_orders", "basic_inventory", "expenses", "documents",
  "accounting", "mis", "crm", "api_hub", "whatsapp", "healthcare",
];
const HEALTHCARE_ENTERPRISE_MODULES = [
  "invoicing", "purchase_orders", "basic_inventory", "expenses", "documents",
  "accounting", "mis", "crm", "api_hub", "whatsapp", "hr_payroll",
  "fixed_assets", "multi_currency", "healthcare",
];

// ── Pharmacy vertical plans ───────────────────────────────────────────────────
const PHARMACY_STARTER_MODULES = ["invoicing", "basic_inventory", "expenses", "pharmacy"];
const PHARMACY_PROFESSIONAL_MODULES = [
  "invoicing", "purchase_orders", "basic_inventory", "expenses", "documents",
  "accounting", "mis", "whatsapp", "pharmacy",
];
const PHARMACY_ENTERPRISE_MODULES = [
  "invoicing", "purchase_orders", "basic_inventory", "expenses", "documents",
  "accounting", "mis", "crm", "whatsapp", "hr_payroll", "pharmacy",
];

// ── NGO vertical plans ────────────────────────────────────────────────────────
const NGO_STARTER_MODULES = ["invoicing", "expenses", "documents", "ngo"];
const NGO_PROFESSIONAL_MODULES = [
  "invoicing", "purchase_orders", "basic_inventory", "expenses", "documents",
  "accounting", "mis", "whatsapp", "ngo",
];
const NGO_ENTERPRISE_MODULES = [
  "invoicing", "purchase_orders", "basic_inventory", "expenses", "documents",
  "accounting", "mis", "crm", "api_hub", "whatsapp", "hr_payroll",
  "projects", "fixed_assets", "multi_currency", "ngo",
];

// ── Nidhi Company vertical plans ─────────────────────────────────────────────
const NIDHI_STARTER_MODULES = ["invoicing", "expenses", "documents", "nidhi"];
const NIDHI_PROFESSIONAL_MODULES = [
  "invoicing", "basic_inventory", "expenses", "documents",
  "accounting", "mis", "whatsapp", "nidhi",
];
const NIDHI_ENTERPRISE_MODULES = [
  "invoicing", "purchase_orders", "basic_inventory", "expenses", "documents",
  "accounting", "mis", "api_hub", "whatsapp", "hr_payroll",
  "fixed_assets", "multi_currency", "nidhi",
];

// ── CRM vertical plans ────────────────────────────────────────────────────────
const CRM_STARTER_MODULES = ["invoicing", "expenses", "documents", "crm"];
const CRM_PROFESSIONAL_MODULES = [
  "invoicing", "purchase_orders", "basic_inventory", "expenses", "documents",
  "accounting", "mis", "whatsapp", "crm", "api_hub",
];
const CRM_ENTERPRISE_MODULES = [
  "invoicing", "purchase_orders", "basic_inventory", "gatepasses", "sales_orders",
  "expenses", "documents", "accounting", "mis", "whatsapp", "hr_payroll",
  "crm", "api_hub", "recurring_invoices", "projects", "multi_currency",
];

// ── Logistics vertical plans ──────────────────────────────────────────────────
const LOGISTICS_STARTER_MODULES = ["invoicing", "basic_inventory", "expenses", "documents", "logistics_transport"];
const LOGISTICS_PROFESSIONAL_MODULES = [
  "invoicing", "purchase_orders", "basic_inventory", "expenses", "documents",
  "accounting", "mis", "crm", "whatsapp", "logistics_transport",
];
const LOGISTICS_ENTERPRISE_MODULES = [
  "invoicing", "purchase_orders", "basic_inventory", "gatepasses", "sales_orders",
  "expenses", "documents", "accounting", "mis", "crm", "api_hub", "whatsapp",
  "hr_payroll", "fixed_assets", "multi_currency", "logistics_transport",
];

// ── Real Estate vertical plans ────────────────────────────────────────────────
const REAL_ESTATE_STARTER_MODULES = ["invoicing", "expenses", "documents", "real_estate"];
const REAL_ESTATE_PROFESSIONAL_MODULES = [
  "invoicing", "purchase_orders", "basic_inventory", "expenses", "documents",
  "accounting", "mis", "crm", "whatsapp", "real_estate",
];
const REAL_ESTATE_ENTERPRISE_MODULES = [
  "invoicing", "purchase_orders", "basic_inventory", "gatepasses", "expenses",
  "documents", "accounting", "mis", "crm", "api_hub", "whatsapp", "hr_payroll",
  "projects", "fixed_assets", "multi_currency", "real_estate",
];

// ── Agriculture vertical plans ────────────────────────────────────────────────
const AGRICULTURE_STARTER_MODULES = ["invoicing", "basic_inventory", "expenses", "documents", "agriculture"];
const AGRICULTURE_PROFESSIONAL_MODULES = [
  "invoicing", "purchase_orders", "basic_inventory", "expenses", "documents",
  "accounting", "mis", "whatsapp", "agriculture",
];
const AGRICULTURE_ENTERPRISE_MODULES = [
  "invoicing", "purchase_orders", "basic_inventory", "gatepasses", "expenses",
  "documents", "accounting", "mis", "crm", "api_hub", "whatsapp", "hr_payroll",
  "fixed_assets", "multi_currency", "agriculture",
];

// ── Education vertical plans ──────────────────────────────────────────────────
const EDUCATION_STARTER_MODULES = ["invoicing", "expenses", "documents", "education"];
const EDUCATION_PROFESSIONAL_MODULES = [
  "invoicing", "purchase_orders", "basic_inventory", "expenses", "documents",
  "accounting", "mis", "whatsapp", "education",
];
const EDUCATION_ENTERPRISE_MODULES = [
  "invoicing", "purchase_orders", "basic_inventory", "expenses", "documents",
  "accounting", "mis", "crm", "api_hub", "whatsapp", "hr_payroll",
  "projects", "fixed_assets", "multi_currency", "education",
];

// ── Gold ERP vertical plans ───────────────────────────────────────────────────
const GOLD_STARTER_MODULES = ["invoicing", "basic_inventory", "expenses", "documents", "gold_erp"];
const GOLD_PROFESSIONAL_MODULES = [
  "invoicing", "purchase_orders", "basic_inventory", "sales_orders", "gatepasses",
  "expenses", "documents", "accounting", "mis", "production", "quality_returns", "gold_erp",
];
const GOLD_ENTERPRISE_MODULES = [
  "invoicing", "purchase_orders", "basic_inventory", "sales_orders", "gatepasses",
  "expenses", "documents", "accounting", "mis", "crm", "api_hub", "whatsapp",
  "hr_payroll", "production", "quality_returns", "fixed_assets", "multi_currency",
  "warehouses", "pos", "gold_erp",
];

// ── Retail / POS vertical plans ───────────────────────────────────────────────
const POS_STARTER_MODULES = ["invoicing", "basic_inventory", "expenses", "pos"];
const POS_PROFESSIONAL_MODULES = [
  "invoicing", "purchase_orders", "basic_inventory", "sales_orders", "gatepasses",
  "expenses", "accounting", "mis", "crm", "whatsapp", "pos",
];
const POS_ENTERPRISE_MODULES = [
  "invoicing", "purchase_orders", "basic_inventory", "sales_orders", "gatepasses",
  "expenses", "accounting", "mis", "crm", "api_hub", "whatsapp", "hr_payroll",
  "fixed_assets", "multi_currency", "warehouses", "quality_returns", "pos",
];

// ── Manufacturing vertical plans ──────────────────────────────────────────────
const MANUFACTURING_STARTER_MODULES = [
  "invoicing", "basic_inventory", "expenses", "documents", "production",
];
const MANUFACTURING_PROFESSIONAL_MODULES = [
  "invoicing", "purchase_orders", "basic_inventory", "sales_orders", "gatepasses",
  "expenses", "documents", "accounting", "mis", "production", "quality_returns",
  "serial_lot", "uom",
];
const MANUFACTURING_ENTERPRISE_MODULES = [
  "invoicing", "purchase_orders", "basic_inventory", "sales_orders", "gatepasses",
  "expenses", "documents", "accounting", "mis", "crm", "api_hub", "whatsapp",
  "hr_payroll", "production", "quality_returns", "serial_lot", "uom", "warehouses",
  "stock_transfers", "fixed_assets", "multi_currency", "projects", "timesheets",
  "purchase_requisitions", "grn", "price_lists", "item_variants", "approvals",
];

// ── HR & Payroll vertical plans ───────────────────────────────────────────────
const HR_STARTER_MODULES = ["hr_payroll", "expenses"];
const HR_PROFESSIONAL_MODULES = [
  "hr_payroll", "expenses", "documents", "mis", "api_hub",
];
const HR_ENTERPRISE_MODULES = [
  "hr_payroll", "expenses", "documents", "mis", "api_hub", "whatsapp",
  "accounting", "projects", "timesheets", "appraisals", "approvals",
];

// ── E-Commerce vertical plans ─────────────────────────────────────────────────
const ECOMMERCE_STARTER_MODULES = ["invoicing", "basic_inventory", "expenses", "documents", "ecommerce"];
const ECOMMERCE_PROFESSIONAL_MODULES = [
  "invoicing", "purchase_orders", "basic_inventory", "sales_orders", "expenses",
  "documents", "accounting", "mis", "whatsapp", "api_hub", "ecommerce",
];
const ECOMMERCE_ENTERPRISE_MODULES = [
  "invoicing", "purchase_orders", "basic_inventory", "gatepasses", "sales_orders",
  "expenses", "documents", "accounting", "mis", "crm", "api_hub", "whatsapp",
  "hr_payroll", "warehouses", "multi_currency", "pos", "ecommerce",
];

// ── Shared module matrix ───────────────────────────────────────────────────────
// Each vertical ERP gets only the shared modules it actually needs.
// Generic plans (trial/basic/professional/enterprise) are for manufacturing/trading.
// Industry vertical plans bundle the vertical module + relevant shared modules only.
// The subscription_plans DB table is authoritative — these are fallback defaults.
export const PLAN_MODULES: Record<string, string[]> = {
  trial:         TRIAL_MODULES,
  basic:         BASIC_MODULES,
  professional:  PROFESSIONAL_MODULES,
  enterprise:    ENTERPRISE_MODULES,
  gold_erp_plan: GOLD_ERP_MODULES,

  restaurant_starter:      RESTAURANT_STARTER_MODULES,
  restaurant_professional: RESTAURANT_PROFESSIONAL_MODULES,
  restaurant_enterprise:   RESTAURANT_ENTERPRISE_MODULES,
  hotel_starter:           HOTEL_STARTER_MODULES,
  hotel_professional:      HOTEL_PROFESSIONAL_MODULES,
  hotel_enterprise:        HOTEL_ENTERPRISE_MODULES,
  healthcare_starter:      HEALTHCARE_STARTER_MODULES,
  healthcare_professional: HEALTHCARE_PROFESSIONAL_MODULES,
  healthcare_enterprise:   HEALTHCARE_ENTERPRISE_MODULES,
  pharmacy_starter:        PHARMACY_STARTER_MODULES,
  pharmacy_professional:   PHARMACY_PROFESSIONAL_MODULES,
  pharmacy_enterprise:     PHARMACY_ENTERPRISE_MODULES,

  ngo_starter:             NGO_STARTER_MODULES,
  ngo_professional:        NGO_PROFESSIONAL_MODULES,
  ngo_enterprise:          NGO_ENTERPRISE_MODULES,
  nidhi_starter:           NIDHI_STARTER_MODULES,
  nidhi_professional:      NIDHI_PROFESSIONAL_MODULES,
  nidhi_enterprise:        NIDHI_ENTERPRISE_MODULES,
  crm_starter:             CRM_STARTER_MODULES,
  crm_professional:        CRM_PROFESSIONAL_MODULES,
  crm_enterprise:          CRM_ENTERPRISE_MODULES,
  logistics_starter:       LOGISTICS_STARTER_MODULES,
  logistics_professional:  LOGISTICS_PROFESSIONAL_MODULES,
  logistics_enterprise:    LOGISTICS_ENTERPRISE_MODULES,
  real_estate_starter:     REAL_ESTATE_STARTER_MODULES,
  real_estate_professional:REAL_ESTATE_PROFESSIONAL_MODULES,
  real_estate_enterprise:  REAL_ESTATE_ENTERPRISE_MODULES,
  agriculture_starter:     AGRICULTURE_STARTER_MODULES,
  agriculture_professional:AGRICULTURE_PROFESSIONAL_MODULES,
  agriculture_enterprise:  AGRICULTURE_ENTERPRISE_MODULES,
  education_starter:       EDUCATION_STARTER_MODULES,
  education_professional:  EDUCATION_PROFESSIONAL_MODULES,
  education_enterprise:    EDUCATION_ENTERPRISE_MODULES,
  ecommerce_starter:       ECOMMERCE_STARTER_MODULES,
  ecommerce_professional:  ECOMMERCE_PROFESSIONAL_MODULES,
  ecommerce_enterprise:    ECOMMERCE_ENTERPRISE_MODULES,

  gold_starter:            GOLD_STARTER_MODULES,
  gold_professional:       GOLD_PROFESSIONAL_MODULES,
  gold_enterprise:         GOLD_ENTERPRISE_MODULES,
  pos_starter:             POS_STARTER_MODULES,
  pos_professional:        POS_PROFESSIONAL_MODULES,
  pos_enterprise:          POS_ENTERPRISE_MODULES,
  manufacturing_starter:   MANUFACTURING_STARTER_MODULES,
  manufacturing_professional: MANUFACTURING_PROFESSIONAL_MODULES,
  manufacturing_enterprise:   MANUFACTURING_ENTERPRISE_MODULES,
  hr_starter:              HR_STARTER_MODULES,
  hr_professional:         HR_PROFESSIONAL_MODULES,
  hr_enterprise:           HR_ENTERPRISE_MODULES,
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
  retail_pos:      "pos",
  gold:            "gold_erp",
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
