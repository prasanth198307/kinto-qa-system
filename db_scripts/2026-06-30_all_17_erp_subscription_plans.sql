-- 2026-06-30: Insert Starter / Professional / Enterprise plans for all 17 ERP verticals
-- Each vertical gets 3 tiers. Uses ON CONFLICT DO UPDATE to be idempotent.

INSERT INTO subscription_plans
  (name, slug, tagline, price_monthly, price_yearly, max_users, modules, is_active, display_order)
VALUES

-- ─── 1. RESTAURANT / F&B ERP ─────────────────────────────────────────────────
('Restaurant Starter',      'restaurant_starter',      'Basic billing & menu for single outlet',
 999,  9990,  5,  '["invoicing","basic_inventory","expenses","documents","restaurant"]', true, 101),
('Restaurant Professional', 'restaurant_professional', 'Full restaurant ops — POS, KOT, staff, accounts',
 2499, 24990, 15, '["invoicing","purchase_orders","basic_inventory","sales_orders","expenses","documents","accounting","mis","crm","whatsapp","hr_payroll","restaurant"]', true, 102),
('Restaurant Enterprise',   'restaurant_enterprise',   'Multi-outlet chain with franchise & analytics',
 4999, 49990, 50, '["invoicing","purchase_orders","basic_inventory","sales_orders","gatepasses","expenses","documents","accounting","mis","crm","api_hub","whatsapp","hr_payroll","fixed_assets","multi_currency","warehouses","restaurant"]', true, 103),

-- ─── 2. HOTEL ERP ────────────────────────────────────────────────────────────
('Hotel Starter',      'hotel_starter',      'Front desk, reservations & basic billing',
 1499, 14990,  5, '["invoicing","expenses","documents","hotel"]', true, 111),
('Hotel Professional', 'hotel_professional', 'Full PMS — front desk, housekeeping, F&B, accounts',
 3499, 34990, 20, '["invoicing","purchase_orders","basic_inventory","expenses","documents","accounting","mis","crm","whatsapp","hr_payroll","restaurant","hotel"]', true, 112),
('Hotel Enterprise',   'hotel_enterprise',   'Multi-property with channel manager & BI',
 6999, 69990, 75, '["invoicing","purchase_orders","basic_inventory","sales_orders","gatepasses","expenses","documents","accounting","mis","crm","api_hub","whatsapp","hr_payroll","fixed_assets","multi_currency","warehouses","restaurant","hotel"]', true, 113),

-- ─── 3. HEALTHCARE ERP ───────────────────────────────────────────────────────
('Healthcare Starter',      'healthcare_starter',      'OPD billing & basic patient management',
 999,  9990,  5, '["invoicing","expenses","documents","healthcare"]', true, 121),
('Healthcare Professional', 'healthcare_professional', 'OPD + IPD + lab + pharmacy integration',
 2999, 29990, 20, '["invoicing","purchase_orders","basic_inventory","expenses","documents","accounting","mis","crm","whatsapp","hr_payroll","pharmacy","healthcare"]', true, 122),
('Healthcare Enterprise',   'healthcare_enterprise',   'Multi-specialty hospital with ABDM & TPA',
 5999, 59990, 75, '["invoicing","purchase_orders","basic_inventory","sales_orders","expenses","documents","accounting","mis","crm","api_hub","whatsapp","hr_payroll","fixed_assets","multi_currency","pharmacy","healthcare"]', true, 123),

-- ─── 4. PHARMACY ERP ─────────────────────────────────────────────────────────
('Pharmacy Starter',      'pharmacy_starter',      'Drug billing & basic stock management',
 799,  7990,  3, '["invoicing","basic_inventory","expenses","documents","pharmacy"]', true, 131),
('Pharmacy Professional', 'pharmacy_professional', 'Full pharmacy — Schedule H/X, expiry, purchases',
 1999, 19990, 10, '["invoicing","purchase_orders","basic_inventory","sales_orders","expenses","documents","accounting","mis","whatsapp","pharmacy"]', true, 132),
('Pharmacy Enterprise',   'pharmacy_enterprise',   'Chain pharmacy with central purchase & CDSCO',
 3999, 39990, 30, '["invoicing","purchase_orders","basic_inventory","sales_orders","gatepasses","expenses","documents","accounting","mis","crm","api_hub","whatsapp","hr_payroll","fixed_assets","warehouses","pharmacy"]', true, 133),

-- ─── 5. EDUCATION ERP ────────────────────────────────────────────────────────
('Education Starter',      'education_starter',      'Fee collection & basic student management',
 999,  9990,  5, '["invoicing","expenses","documents","education"]', true, 141),
('Education Professional', 'education_professional', 'Full school — attendance, exams, timetable, fees',
 2499, 24990, 20, '["invoicing","purchase_orders","basic_inventory","expenses","documents","accounting","mis","whatsapp","hr_payroll","education"]', true, 142),
('Education Enterprise',   'education_enterprise',   'Multi-campus with hostel, transport & parent portal',
 4999, 49990, 60, '["invoicing","purchase_orders","basic_inventory","expenses","documents","accounting","mis","crm","api_hub","whatsapp","hr_payroll","projects","fixed_assets","multi_currency","education"]', true, 143),

-- ─── 6. LOGISTICS & TRANSPORT ERP ────────────────────────────────────────────
('Logistics Starter',      'logistics_starter',      'Fleet & trip management basics',
 999,  9990,  5, '["invoicing","expenses","documents","logistics_transport"]', true, 151),
('Logistics Professional', 'logistics_professional', 'Full TMS — fleet, drivers, GPS, freight, ePOD',
 2499, 24990, 15, '["invoicing","purchase_orders","expenses","documents","accounting","mis","whatsapp","hr_payroll","logistics_transport"]', true, 152),
('Logistics Enterprise',   'logistics_enterprise',   'Multi-depot with e-way bill, FASTag & BI',
 4999, 49990, 50, '["invoicing","purchase_orders","basic_inventory","gatepasses","expenses","documents","accounting","mis","crm","api_hub","whatsapp","hr_payroll","fixed_assets","multi_currency","logistics_transport"]', true, 153),

-- ─── 7. REAL ESTATE ERP ──────────────────────────────────────────────────────
('Real Estate Starter',      'real_estate_starter',      'Project & unit tracking basics',
 999,  9990,  5, '["invoicing","expenses","documents","real_estate"]', true, 161),
('Real Estate Professional', 'real_estate_professional', 'Full CRM, bookings, collections & construction',
 2999, 29990, 15, '["invoicing","purchase_orders","expenses","documents","accounting","mis","crm","whatsapp","hr_payroll","real_estate"]', true, 162),
('Real Estate Enterprise',   'real_estate_enterprise',   'Multi-project with RERA, brokers & society management',
 5999, 59990, 50, '["invoicing","purchase_orders","basic_inventory","gatepasses","expenses","documents","accounting","mis","crm","api_hub","whatsapp","hr_payroll","fixed_assets","multi_currency","projects","approvals","real_estate"]', true, 163),

-- ─── 8. AGRICULTURE ERP ──────────────────────────────────────────────────────
('Agriculture Starter',      'agriculture_starter',      'Farm & crop tracking basics',
 799,  7990,  3, '["invoicing","expenses","documents","agriculture"]', true, 171),
('Agriculture Professional', 'agriculture_professional', 'Full farm ops — inputs, harvest, FPO, schemes',
 1999, 19990, 10, '["invoicing","purchase_orders","basic_inventory","expenses","documents","accounting","mis","whatsapp","agriculture"]', true, 172),
('Agriculture Enterprise',   'agriculture_enterprise',   'Multi-farm with market linkage, IoT & BI',
 3999, 39990, 30, '["invoicing","purchase_orders","basic_inventory","expenses","documents","accounting","mis","crm","api_hub","whatsapp","hr_payroll","fixed_assets","multi_currency","agriculture"]', true, 173),

-- ─── 9. NGO / TRUST ERP ──────────────────────────────────────────────────────
('NGO Starter',      'ngo_starter',      'Donor management & basic receipts',
 499,  4990,  3, '["invoicing","expenses","documents","ngo"]', true, 181),
('NGO Professional', 'ngo_professional', 'Full NGO — projects, beneficiaries, 80G, FCRA',
 1499, 14990, 10, '["invoicing","purchase_orders","expenses","documents","accounting","mis","whatsapp","ngo"]', true, 182),
('NGO Enterprise',   'ngo_enterprise',   'Multi-project with CSR, grants & compliance',
 2999, 29990, 25, '["invoicing","purchase_orders","basic_inventory","expenses","documents","accounting","mis","crm","api_hub","whatsapp","hr_payroll","fixed_assets","multi_currency","projects","approvals","ngo"]', true, 183),

-- ─── 10. NIDHI COMPANY ERP ───────────────────────────────────────────────────
('Nidhi Starter',      'nidhi_starter',      'Member deposits & basic loan management',
 999,  9990,  3, '["invoicing","expenses","documents","nidhi"]', true, 191),
('Nidhi Professional', 'nidhi_professional', 'Full Nidhi — loans, EMI, shares, interest rates',
 2499, 24990, 10, '["invoicing","purchase_orders","expenses","documents","accounting","mis","whatsapp","nidhi"]', true, 192),
('Nidhi Enterprise',   'nidhi_enterprise',   'Multi-branch with RBI NDH returns & mobile collection',
 4999, 49990, 30, '["invoicing","purchase_orders","expenses","documents","accounting","mis","crm","api_hub","whatsapp","hr_payroll","fixed_assets","multi_currency","approvals","nidhi"]', true, 193),

-- ─── 11. CRM ERP ─────────────────────────────────────────────────────────────
('CRM Starter',      'crm_starter',      'Lead & contact management basics',
 499,  4990,  3, '["invoicing","expenses","crm"]', true, 201),
('CRM Professional', 'crm_professional', 'Full CRM — pipeline, campaigns, WhatsApp, surveys',
 1499, 14990, 15, '["invoicing","expenses","documents","accounting","mis","crm","whatsapp","api_hub"]', true, 202),
('CRM Enterprise',   'crm_enterprise',   'AI-powered CRM with telephony & customer 360',
 2999, 29990, 50, '["invoicing","purchase_orders","expenses","documents","accounting","mis","crm","api_hub","whatsapp","hr_payroll","multi_currency","approvals","projects"]', true, 203),

-- ─── 12. E-COMMERCE ERP ──────────────────────────────────────────────────────
('E-Commerce Starter',      'ecommerce_starter',      'Basic order & listing management',
 999,  9990,  3, '["invoicing","basic_inventory","expenses","documents","ecommerce"]', true, 211),
('E-Commerce Professional', 'ecommerce_professional', 'Multi-channel — Amazon, Flipkart, shipments, returns',
 2499, 24990, 10, '["invoicing","purchase_orders","basic_inventory","sales_orders","expenses","documents","accounting","mis","whatsapp","api_hub","ecommerce"]', true, 212),
('E-Commerce Enterprise',   'ecommerce_enterprise',   'Full marketplace sync with GL, settlements & BI',
 4999, 49990, 30, '["invoicing","purchase_orders","basic_inventory","sales_orders","gatepasses","expenses","documents","accounting","mis","crm","api_hub","whatsapp","hr_payroll","warehouses","multi_currency","pos","ecommerce"]', true, 213),

-- ─── 13. GOLD ERP ────────────────────────────────────────────────────────────
('Gold ERP Starter',      'gold_starter',      'Jewellery billing & basic stock',
 1499, 14990,  5, '["invoicing","basic_inventory","expenses","documents","gold_erp"]', true, 221),
('Gold ERP Professional', 'gold_professional', 'Full jewellery — karigar, production, POS, hallmarking',
 3499, 34990, 15, '["invoicing","purchase_orders","basic_inventory","sales_orders","gatepasses","expenses","documents","accounting","mis","production","quality_returns","gold_erp"]', true, 222),
('Gold ERP Enterprise',   'gold_enterprise',   'Multi-branch jewellery chain with BIS API & bullion',
 6999, 69990, 50, '["invoicing","purchase_orders","basic_inventory","sales_orders","gatepasses","expenses","documents","accounting","mis","crm","api_hub","whatsapp","hr_payroll","production","quality_returns","fixed_assets","multi_currency","warehouses","pos","gold_erp"]', true, 223),

-- ─── 14. RETAIL / POS ERP ────────────────────────────────────────────────────
('Retail POS Starter',      'pos_starter',      'Counter billing & basic inventory',
 499,  4990,  3, '["invoicing","basic_inventory","expenses","pos"]', true, 231),
('Retail POS Professional', 'pos_professional', 'Full retail — POS, purchases, accounts, CRM loyalty',
 1499, 14990, 10, '["invoicing","purchase_orders","basic_inventory","sales_orders","gatepasses","expenses","accounting","mis","crm","whatsapp","pos"]', true, 232),
('Retail POS Enterprise',   'pos_enterprise',   'Multi-store retail chain with omnichannel & franchise',
 2999, 29990, 30, '["invoicing","purchase_orders","basic_inventory","sales_orders","gatepasses","expenses","accounting","mis","crm","api_hub","whatsapp","hr_payroll","fixed_assets","multi_currency","warehouses","quality_returns","pos"]', true, 233),

-- ─── 15. MANUFACTURING ERP ───────────────────────────────────────────────────
('Manufacturing Starter',      'manufacturing_starter',      'Production entries & basic BOM',
 999,  9990,  5, '["invoicing","basic_inventory","expenses","documents","production"]', true, 241),
('Manufacturing Professional', 'manufacturing_professional', 'Full MES — BOM, work orders, quality, serial/lot',
 2999, 29990, 20, '["invoicing","purchase_orders","basic_inventory","sales_orders","gatepasses","expenses","documents","accounting","mis","production","quality_returns","serial_lot","uom"]', true, 242),
('Manufacturing Enterprise',   'manufacturing_enterprise',   'Multi-plant with MRP, shop floor, subcontracting & BI',
 5999, 59990, 75, '["invoicing","purchase_orders","basic_inventory","sales_orders","gatepasses","expenses","documents","accounting","mis","crm","api_hub","whatsapp","hr_payroll","production","quality_returns","serial_lot","uom","warehouses","stock_transfers","fixed_assets","multi_currency","projects","timesheets","purchase_requisitions","grn","price_lists","item_variants","approvals"]', true, 243),

-- ─── 16. HR & PAYROLL ────────────────────────────────────────────────────────
('HR Starter',      'hr_starter',      'Employee records & basic payroll',
 499,  4990,  5, '["hr_payroll","expenses"]', true, 251),
('HR Professional', 'hr_professional', 'Full HRMS — attendance, leaves, loans, payslips',
 1499, 14990, 25, '["hr_payroll","expenses","documents","mis","api_hub"]', true, 252),
('HR Enterprise',   'hr_enterprise',   'Complete HR suite with appraisals, ESS & statutory filing',
 2999, 29990, 100,'["hr_payroll","expenses","documents","mis","api_hub","whatsapp","accounting","projects","timesheets","appraisals","approvals"]', true, 253),

-- ─── 17. FINANCE & ACCOUNTS ──────────────────────────────────────────────────
('Finance Starter',      'finance_starter',      'Invoicing, expenses & basic accounting',
 999,  9990,  5, '["invoicing","expenses","documents","accounting"]', true, 261),
('Finance Professional', 'finance_professional', 'Full accounting — GL, GST, TDS, MIS, budgets',
 2499, 24990, 15, '["invoicing","purchase_orders","expenses","documents","accounting","mis","crm","whatsapp","fixed_assets","cost_centres","currencies"]', true, 262),
('Finance Enterprise',   'finance_enterprise',   'Multi-company finance with consolidation & GSTR filing',
 4999, 49990, 50, '["invoicing","purchase_orders","basic_inventory","sales_orders","gatepasses","expenses","documents","accounting","mis","crm","api_hub","whatsapp","hr_payroll","fixed_assets","multi_currency","cost_centres","currencies","projects","timesheets","approvals","audit_trail","recurring_invoices"]', true, 263)

ON CONFLICT (slug) DO UPDATE SET
  name          = EXCLUDED.name,
  tagline       = EXCLUDED.tagline,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly  = EXCLUDED.price_yearly,
  max_users     = EXCLUDED.max_users,
  modules       = EXCLUDED.modules,
  is_active     = EXCLUDED.is_active,
  display_order = EXCLUDED.display_order,
  updated_at    = now();
