export interface ModuleDefinition {
  slug: string;
  name: string;
  description: string;
  category: string;
  priceMonthly: number;
  free: boolean;
  popular?: boolean;
  dependencies?: string[];   // other module slugs this one depends on
  dependents?: string[];     // modules that depend on this one (computed below)
}

export const MODULE_CATALOG: ModuleDefinition[] = [
  // ── Always free ──────────────────────────────────────────────────────────────
  { slug: "user_management",  name: "User Management",      description: "Add/manage users and set passwords",                   category: "Core",           priceMonthly: 0,   free: true },
  { slug: "roles",            name: "Roles & Permissions",  description: "Screen-level access control per role",                 category: "Core",           priceMonthly: 0,   free: true },
  { slug: "company_settings", name: "Company Settings",     description: "Profile, branding, GST details",                       category: "Core",           priceMonthly: 0,   free: true },
  { slug: "dashboard",        name: "Dashboard & Reports",  description: "MIS overview, analytics, KPIs",                        category: "Core",           priceMonthly: 0,   free: true },

  // ── Finance & Billing ─────────────────────────────────────────────────────────
  { slug: "invoicing",        name: "GST Invoicing",        description: "Tax invoices, credit/debit notes, proforma",           category: "Finance",        priceMonthly: 699, popular: true },
  { slug: "accounting",       name: "Accounting & Ledger",  description: "Double-entry, COA, journals, P&L, balance sheet",     category: "Finance",        priceMonthly: 899 },
  { slug: "expense_claims",   name: "Expense Claims",       description: "Employee expense submission & approvals",              category: "Finance",        priceMonthly: 299 },
  { slug: "tds_management",   name: "TDS Management",       description: "TDS calculation, challans, Form 26Q",                  category: "Finance",        priceMonthly: 399 },

  // ── Inventory & Supply Chain ──────────────────────────────────────────────────
  { slug: "inventory",        name: "Inventory",            description: "Stock, batches, FIFO, reorder alerts",                 category: "Inventory",      priceMonthly: 599, popular: true },
  { slug: "purchase",         name: "Purchase & PO",        description: "RFQ, PO, GRN, vendor invoices, three-way match",      category: "Inventory",      priceMonthly: 499, dependencies: ["inventory"] },
  { slug: "warehouses",       name: "Multi-Warehouse",      description: "Multiple locations, stock transfers, UOM conversions",  category: "Inventory",      priceMonthly: 399, dependencies: ["inventory"] },
  { slug: "gatepasses",       name: "Gatepasses",           description: "Outward gatepasses, dispatch, serial/lot tracking",    category: "Inventory",      priceMonthly: 299, dependencies: ["inventory"] },

  // ── Production & Operations ───────────────────────────────────────────────────
  { slug: "production",       name: "Production / BOM",     description: "Work orders, BOM, FG tracking, routing",              category: "Production",     priceMonthly: 699 },
  { slug: "quality",          name: "Quality Assurance",    description: "QA checklists, inspection, rejection logs",            category: "Production",     priceMonthly: 399 },
  { slug: "maintenance",      name: "Preventive Maintenance",description: "PM schedules, machine downtime tracking",             category: "Production",     priceMonthly: 349 },
  { slug: "projects",         name: "Project Management",   description: "BOQ, milestones, timesheets, project P&L",            category: "Production",     priceMonthly: 599 },

  // ── HR & People ───────────────────────────────────────────────────────────────
  { slug: "hr_payroll",       name: "HR & Payroll",         description: "Employee master, payroll, payslips, CTC",             category: "HR",             priceMonthly: 799, popular: true },
  { slug: "attendance",       name: "Attendance & Leave",   description: "Daily attendance, leave requests, holiday calendar",   category: "HR",             priceMonthly: 349 },
  { slug: "ess",              name: "ESS Portal",           description: "Employee self-service — claims, leaves, payslips",    category: "HR",             priceMonthly: 249 },
  { slug: "appraisals",       name: "Performance Appraisals",description: "Appraisal cycles, ratings, goals",                  category: "HR",             priceMonthly: 299 },

  // ── Sales & CRM ───────────────────────────────────────────────────────────────
  { slug: "crm",              name: "CRM & Leads",          description: "Lead pipeline, follow-ups, conversion tracking",       category: "Sales",          priceMonthly: 499 },
  { slug: "sales",            name: "Sales Orders",         description: "Quotations, sales orders, delivery challans",          category: "Sales",          priceMonthly: 399 },

  // ── Industry Verticals ────────────────────────────────────────────────────────
  { slug: "healthcare",       name: "Healthcare",           description: "Patients, OPD/IPD, wards, appointments",              category: "Industry",       priceMonthly: 999 },
  { slug: "education",        name: "Education ERP",        description: "Students, fees, timetable, assessments",               category: "Industry",       priceMonthly: 999 },
  { slug: "logistics",        name: "Logistics & Fleet",    description: "Vehicles, trips, LR / consignment notes",             category: "Industry",       priceMonthly: 799 },
  { slug: "real_estate",      name: "Real Estate",          description: "Projects, units, bookings, payment schedules",         category: "Industry",       priceMonthly: 799 },
  { slug: "pos",              name: "Retail / POS",         description: "POS terminal, sessions, sales history",                category: "Industry",       priceMonthly: 699 },
  { slug: "agriculture",      name: "Agriculture",          description: "Farms, crop cycles, procurement, commodity prices",     category: "Industry",       priceMonthly: 699 },
];

export const FREE_MODULE_SLUGS = new Set(
  MODULE_CATALOG.filter(m => m.free).map(m => m.slug)
);

export const MODULE_BY_SLUG = new Map(MODULE_CATALOG.map(m => [m.slug, m]));

/** Compute monthly total for a list of selected slugs (excluding free ones). */
export function computeMonthlyAmount(selectedSlugs: string[]): number {
  return selectedSlugs
    .filter(s => !FREE_MODULE_SLUGS.has(s))
    .reduce((sum, s) => sum + (MODULE_BY_SLUG.get(s)?.priceMonthly ?? 0), 0);
}

/** Returns all slugs that depend on a given slug (direct dependents). */
export function getDependentSlugs(slug: string): string[] {
  return MODULE_CATALOG.filter(m => m.dependencies?.includes(slug)).map(m => m.slug);
}
