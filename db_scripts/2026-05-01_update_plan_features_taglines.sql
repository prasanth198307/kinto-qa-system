-- Update subscription_plans: refresh features arrays and taglines
-- to reflect Phase 1-5, T001-T016, and 6 industry verticals.
-- Run: psql $DATABASE_URL -f db_scripts/2026-05-01_update_plan_features_taglines.sql

UPDATE subscription_plans SET tagline = 'Explore SwachERP free — no credit card needed' WHERE slug = 'trial';
UPDATE subscription_plans SET tagline = 'Essential ERP for small trading & service businesses' WHERE slug = 'basic';
UPDATE subscription_plans SET tagline = 'Full operations suite — manufacturing, trading & services' WHERE slug = 'professional';
UPDATE subscription_plans SET tagline = 'Complete ERP + industry verticals for scaling businesses' WHERE slug = 'enterprise';

UPDATE subscription_plans SET features = '[
  "14-day free trial",
  "Up to 5 users",
  "Core modules: Inventory, Invoicing, Purchases",
  "Email support"
]'::jsonb WHERE slug = 'trial';

UPDATE subscription_plans SET features = '[
  "5 users included",
  "+₹150/extra user/month (max 50)",
  "GST-compliant invoicing",
  "Purchase & sales orders",
  "Inventory management",
  "Gatepass management",
  "Expense tracking",
  "Document management",
  "Email support"
]'::jsonb WHERE slug = 'basic';

UPDATE subscription_plans SET features = '[
  "15 users included",
  "+₹100/extra user/month (max 100)",
  "Everything in Basic",
  "Production & BOM management",
  "Multi-warehouse & stock transfers",
  "UOM conversions & serial/lot tracking",
  "Purchase requisitions + GRN",
  "Three-way matching (PO / GRN / Invoice)",
  "Approval workflows (amount-based)",
  "Quality control & returns",
  "Double-entry accounting",
  "Preventive maintenance",
  "Recurring invoices & GSTR-1/3B reports",
  "Cost centres & expense claims",
  "WhatsApp integration",
  "MIS analytics dashboard",
  "Audit trail",
  "API Hub",
  "Priority support"
]'::jsonb WHERE slug = 'professional';

UPDATE subscription_plans SET features = '[
  "20 users included",
  "+₹130/extra user/month (max 200)",
  "Everything in Professional",
  "HR & Payroll (PF, ESI, TDS, Form 16)",
  "Employee Self-Service portal",
  "Performance appraisals",
  "Project management (BOQ, milestones, timesheets)",
  "Fixed assets & depreciation",
  "Multi-currency & exchange rates",
  "Custom fields on any entity",
  "Configurable module labels",
  "Healthcare vertical (OPD/IPD, wards)",
  "Education vertical (students, classes, fees)",
  "Logistics vertical (fleet, trips, LR)",
  "Real Estate vertical (projects, units, bookings)",
  "Retail / POS vertical (billing terminal)",
  "Agriculture vertical (farms, crop cycles)",
  "White-labeling & custom branding",
  "Dedicated account manager",
  "SLA guarantee",
  "Data export & backups"
]'::jsonb WHERE slug = 'enterprise';
