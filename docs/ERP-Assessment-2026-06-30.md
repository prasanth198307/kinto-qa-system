# Kinto ERP — Comprehensive Enterprise Assessment
**Date:** 2026-06-30  
**Codebase:** Production (144.24.149.157) + Local  
**Assessor:** Claude Code (automated deep-read of 31,031-line codebase)

---

## SECTION 1: Finance & Accounting — Merge Assessment

### Current State
The standalone **Finance ERP entry point (`finance-erp.tsx`)** is an **8-line stub** — just a heading saying "Select a module from the sidebar." `server/finance-erp-routes.ts` has **zero routes**.

**However, the Finance module itself is real and powerful** — it lives inside the core `accounting` plan module, accessible via the sidebar under the Professional/Enterprise plan. Features present:

| Feature | Status |
|---------|--------|
| Chart of Accounts (with sub-types, account groups) | ✅ Done |
| Manual + Auto Journal Entries | ✅ Done |
| Trial Balance | ✅ Done |
| P&L Statement | ✅ Done |
| Balance Sheet | ✅ Done |
| Cash Flow Statement | ✅ Done |
| Day Book / Group Summary / Ledger View | ✅ Done |
| Bank accounts + Statement import | ✅ Done |
| Aging / Outstanding reports | ✅ Done |
| Budget & Variance | ✅ Done |
| TDS Management (Form 26AS, challan tracking) | ✅ Done |
| Multi-Currency (Enterprise plan) | ✅ Done |
| Cost Centres | ✅ Done |
| Fixed Assets + Depreciation (Enterprise) | ✅ Done |
| Customer Advances + application to invoices | ✅ Done |
| GST Reports (GSTR-1, 3B) | ✅ Done |
| e-Invoice (IRP) integration | ✅ Done |
| Vendor Bills / AP workflow | ❌ Missing |
| Bank Reconciliation (auto-match) | ❌ Missing |
| AP Aging report | ❌ Missing |
| Recurring Journal Entries | ❌ Missing |
| Period-end close / Year-end lock | ❌ Missing |
| Multi-company consolidation | ❌ Missing |
| ZATCA / VAT / EU VAT compliance | ❌ Missing |
| Audit trail (field-level changes) | ❌ Missing |

### journal-service.ts — the GL Engine
A well-built **2,300-line GL engine** with 30+ export functions:
- `journalForInvoice`, `journalForPayment`, `journalForCreditNote`, `journalForDebitNote`
- `journalForExpenseVoucher`, `journalForRawMaterialIssuance`, `journalForProductionEntry`
- `journalForCashRegisterDeposit/Transfer`, `journalForCustomerAdvance`
- `journalForWriteOff`, `seedChartOfAccounts`, `GOLD_ACCOUNT_CODES`

### ⚠️ CRITICAL GAP: GL Integration for All Industry Verticals

| ERP | Posts to GL? |
|-----|------------|
| Core invoicing / payments / credit notes | ✅ YES |
| Manufacturing (RM, production, scrap) | ✅ YES |
| Cash register / Expenses | ✅ YES |
| Gold ERP | ✅ YES |
| **Hotel, Healthcare, Pharmacy, NGO, Nidhi** | ❌ NO |
| **Logistics, Real Estate, Agriculture, Education** | ❌ NO |
| **CRM, E-Commerce** | ❌ NO |
| **HR Payroll → GL posting** | ❌ NO |

**Impact:** P&L and Balance Sheet are unreliable for any vertical tenant. A hotel folio payment, pharmacy bill, or education fee collection never reaches the GL.

### Recommendation: Finance ERP Merge Plan
1. Build `client/src/pages/finance/` directory with proper sub-pages (AR, AP, GL, Reports, Period Close)
2. Wire `finance-erp.tsx` as a router/landing page to these sub-pages
3. Add journal-service calls to all 10 vertical route files
4. Add AP module (vendor bills, AP aging, payment runs)
5. Add period-close enforcement (prevent posting to closed periods)

---

## SECTION 2: All 17 ERP Verticals — Honest Assessment

### 1. 🟢 Restaurant ERP — 85% Complete
- **Routes:** ~349 | **UI Pages:** 24 (avg 700+ lines each)
- **Present:** POS, KDS, Table management, Delivery, Aggregators (Swiggy/Zomato/ONDC), Reservations, Franchise, Central kitchen, Campaigns, Recipes & food costing, QR ordering, Gift cards, Menu translations, Analytics BI, Payment terminals
- **Missing:** GL posting for F&B sales, Loyalty points expiry engine, Native mobile waiter app

### 2. 🟢 Gold ERP — 90% Complete
- **Routes:** ~206 | **UI Pages:** 13 files (~6,000+ lines total)
- **Present:** Metal rates, Karigar management, Job orders, Metal ledger, Hallmarking (HUID), POS, Buyback, Bullion, Chit schemes, Vault audit, RFID, E-catalog, OMS, GL posting ✅
- **Missing:** BIS hallmarking portal API integration, Live gold rate feed, SEBI reporting for bullion

### 3. 🟢 HR / Payroll — 85% Complete
- **Routes:** ~147 | **UI Pages:** 16 (~8,600 lines total)
- **Present:** Employee master, Attendance (biometric import), Leave, Payroll processing, FnF, TDS, Recruitment, Appraisals, ESS portal, HR letters, Expense claims, Timesheets
- **Missing:** Payroll → GL posting (journal entries when payroll runs), EPFO/ESI e-filing API, Statutory compliance calendar

### 4. 🟢 Retail / POS — 80% Complete
- **Routes:** ~91 | **UI Pages:** pos.tsx = 2,858 lines (comprehensive)
- **Present:** Full POS, barcode, cash/card/UPI/split payments, loyalty, returns, price lists, shifts, offline PWA
- **Missing:** Omni-channel sync (POS ↔ E-Commerce inventory), Fractional barcode items

### 5. 🟡 Education ERP — 75% Complete
- **Routes:** ~146 (highest among verticals) | **UI Pages:** 14 (~1,736 lines)
- **Present:** Admissions, Students, Classes, Timetable, Attendance, Exams, Homework, Hostel, Library, Online exams, Parent portal, Fees, Transport
- **Missing:** Fee collection → GL posting, NEP compliance, Biometric attendance sync, Teacher payroll bridge, Certificate printing

### 6. 🟡 Hotel ERP — 60% Complete
- **Routes:** ~63 | **UI Pages:** 11 (~2,048 lines)
- **Present:** Front desk, Reservations, Check-in/out, Room management, Folio, Housekeeping, Rate management, Corporate accounts, Night audit
- **Missing:** Channel Manager (OTA), Revenue management, Banquet/Events, Spa & amenities, GL posting for hotel revenue, Online booking engine

### 7. 🟡 Healthcare ERP — 60% Complete
- **Routes:** ~134 | **UI Pages:** 11 (~1,867 lines)
- **Present:** Patients, OPD, IPD, Beds, Doctors, Lab, Blood bank, Nursing, OT, Insurance, Reports
- **Missing:** ABDM/ABHA integration, Billing → GL posting, EMR/clinical notes, Insurance TPA automation, Radiology/PACS, ICD-10 coding, Appointment scheduling

### 8. 🟡 Real Estate ERP — 60% Complete
- **Routes:** ~66 | **UI Pages:** 10 (~1,559 lines)
- **Present:** Projects, Bookings, Brokers, Collections, Construction progress, CRM, Customer portal, Documents, Society
- **Missing:** RERA compliance, MIS P&L per project, Bank loan tracking, Payment demand letters, GL integration for sales/collections

### 9. 🟡 NGO ERP — 65% Complete
- **Routes:** ~56 | **UI Pages:** 9 (~1,246 lines)
- **Present:** Donors, Donations, Beneficiaries, Grants, Projects, Volunteers, 80G certificates, FCRA tracking
- **Missing:** 80G bulk PDF + email automation, FCRA online filing, Donor portal (public-facing), Fund accounting (restricted vs unrestricted), No GL posting

### 10. 🟡 Nidhi Company ERP — 65% Complete
- **Routes:** 35 | **UI Pages:** 11 (~1,337 lines)
- **Present:** Members, Shares, Loans, Deposits, EMI, Daily collection, Interest rates, Gold rates, Compliance, NDH reports
- **Missing:** RBI NDHR filing automation, Post-dated cheque tracking, Loan sanction workflow with approvals, No GL posting, Mobile collection app

### 11. 🟡 CRM ERP — 55% Complete
- **Routes:** ~41 | **UI Pages:** 8 (~1,397 lines)
- **Present:** Contacts, Accounts, Activities, Pipeline, Email campaigns, WhatsApp, Reports
- **Missing:** AI lead scoring, Automated follow-up sequences, Telephony/call logging, Quotation-to-invoice bridge, Customer 360 view linking invoice history, SLA tracking

### 12. 🟡 Logistics / Transport ERP — 55% Complete
- **Routes:** ~74 | **UI Pages:** 10 (~1,260 lines)
- **Present:** Fleet, Trips, Consignments, Drivers, ePOD, Fuel, GPS, Freight, Documents
- **Missing:** Route optimization, Live GPS API integration, FASTag toll, Vehicle maintenance scheduling, LR printing, E-way bill generation from consignments, No GL posting

### 13. 🟡 Pharmacy ERP — 55% Complete
- **Routes:** ~34 | **UI Pages:** 10 (~1,386 lines)
- **Present:** Drug master, Stock, Billing, Purchases, Expiry tracking, Schedule H & X registers, Licenses
- **Missing:** Drug → GL integration, FIFO/FEFO batch tracking in billing, Narcotics register, Retail pharmacy POS, Prescription management, GST e-invoice for pharma

### 14. 🟡 Agriculture ERP — 50% Complete
- **Routes:** ~46 | **UI Pages:** 9 (~1,237 lines)
- **Present:** Farms, Crops, Inputs, Harvest, Market prices, FPO management, Schemes, Weather
- **Missing:** Soil health card integration, Mandi price APIs, IoT sensor data, Supply chain tracking, No GL posting

### 15. 🟡 Manufacturing — 65% Complete (embedded in core plan)
- **Present:** Raw material issuance, Production entries, Scrap management, Production reconciliation, Variance analytics, BOM, GL posting ✅
- **Missing:** MRP (Material Requirements Planning), BOM versioning, Work orders, Shop floor control, Quality inspection, Batch/lot traceability

### 16. 🔴 Finance ERP (standalone) — 5% Complete
- **Routes:** 0 (empty file) | **UI:** 8-line stub
- The Finance functionality exists in the core `accounting` module — but not as a standalone "Finance ERP" product for CAs/Finance companies
- **Needs:** Finance ERP landing page, AR/AP workflows, period-close UI, standalone subscription plan

### 17. 🔴 E-Commerce ERP — 5% Complete
- **Routes:** ~17 | **UI Pages:** All 8 pages are 8-line stubs
- All pages (Dashboard, Channels, Listings, Orders, Returns, Settlements, Shipments, Reports) are placeholder stubs
- **Needs:** Complete rebuild — Amazon SP-API, Flipkart API, Shiprocket integration, inventory sync with POS

---

## SECTION 3: Shared Modules — How They Work

### Architecture
Shared modules use **truly shared routes and DB tables** — there is no per-vertical duplication. A hotel tenant and restaurant tenant both access the same `/api/vendors`, `/api/purchase-orders`, `/api/invoices`, and the same accounting GL, all isolated by `tenant_id`.

### All Shared Module Groups

| Module Key | What's Included |
|------------|-----------------|
| `invoicing` | Sales dashboard, Invoices, Payments, Customer advances, Credit notes, GST reports, Recurring invoices |
| `purchase_orders` | POs, Vendors, Vendor types, Vendor debit notes, Purchase requisitions, GRN, Approval workflows |
| `basic_inventory` | Products, Raw materials, Finished goods, Categories, UOM, Price lists, Data import |
| `gatepasses` | Gatepasses, Dispatch tracking, Dispatch masters |
| `sales_orders` | Sales orders, Sales officers |
| `production` | RM issuance, Production entries, Reconciliations, Scrap inventory, Variance analytics |
| `accounting` | COA, Journal entries, Trial balance, P&L, Balance sheet, Bank transactions, Ledger, Day book, Aging, Cash flow, Budget, TDS, Cost centres, Fixed assets |
| `expenses` | Expenses, Categories, Monthly expenses, Cash register |
| `maintenance` | Machines, Spare parts, PM templates, PM execution, PM history |
| `hr_payroll` | Employees, Attendance, Leaves, Payroll, Exit/FnF, Loans, TDS, Recruitment, Appraisals, ESS |
| `mis` | MIS dashboards (production, inventory, sales, delivery, cash, financial) |
| `warehouses` | Warehouses, Stock transfers, Serial/lot register |
| `projects` | Projects, Timesheets |
| `multi_currency` | Currency management, Exchange rates |
| `fixed_assets` | Fixed assets register + depreciation |
| `api_hub` | API keys for external integrations |
| `crm` | CRM leads (basic, 2 screens) — shared across all plans |

### How Navigation Filtering Works
`use-filtered-navigation.tsx` → calls `usePlanFeatures` hook → fetches tenant's `allowedNavItems` from server → filters sidebar. This is **frontend UX enforcement**; backend plan-middleware provides the security enforcement at route-prefix level.

---

## SECTION 4: Subscription Plans — How They Work

### Plan Matrix

| Plan | Modules Included |
|------|-----------------|
| `trial` (14 days) | ALL modules — full enterprise access |
| `basic` | invoicing, purchase_orders, basic_inventory, gatepasses, sales_orders, expenses, documents |
| `professional` | basic + production, quality_returns, accounting, mis, whatsapp, maintenance, crm, api_hub, recurring_invoices, warehouses |
| `enterprise` | professional + hr_payroll, projects, fixed_assets, multi_currency + ALL industry verticals |
| `gold_erp_plan` | gold_erp + full enterprise |
| `restaurant_starter/professional/enterprise` | Restaurant-specific tiered plans |
| `hotel_starter/professional/enterprise` | Hotel-specific tiered plans |
| `healthcare_starter/professional/enterprise` | Healthcare-specific tiered plans |
| `pharmacy_starter/professional/enterprise` | Pharmacy-specific tiered plans |

### ⚠️ Gap: Missing Vertical Plans
NGO, Nidhi, CRM, Logistics, Real Estate, Agriculture, Education, E-Commerce **have no vertical-specific subscription plans**. They are only accessible via generic `enterprise` or `trial`.

### How Enforcement Works
1. **Backend:** `server/plan-middleware.ts` checks route prefix against `ROUTE_PLAN_REQUIREMENTS` map — if tenant's plan doesn't include the module, returns 403
2. **Frontend:** `usePlanFeatures` + `use-filtered-navigation.tsx` hide nav items not in the plan
3. **Module Marketplace:** Individual modules purchasable via `subscriptions.selected_modules` table — tenants can add individual modules without upgrading the base plan
4. **Trial bypass:** Trial tenants bypass all plan checks — they see everything

### What's Loaded Per Plan
Only allowed nav items are shown in the sidebar. API routes outside the plan return 403. However, plan checks are at **route-prefix level** (e.g., `/api/accounting` = all accounting routes), not at individual operation level.

---

## SECTION 5: Multi-Country Tenants — How It Works

### Infrastructure (Exists)
The `tenants` table stores: `country_code`, `currency_code`, `currency_symbol`, `timezone`, `tax_regime`, `date_format`. Masters data includes a `countries` table used during tenant creation.

### What's Implemented

| Country | Tax Compliance |
|---------|---------------|
| 🇮🇳 India | ✅ FULL — GST (CGST/SGST/IGST), e-Invoice IRP, GSTR-1/3B, TDS, HSN/SAC codes |
| 🇸🇦 Saudi Arabia / UAE | ❌ No ZATCA/VAT |
| 🇺🇸 USA | ❌ No Sales Tax (state-by-state) |
| 🇬🇧 UK | ❌ No UK VAT |
| 🇪🇺 EU | ❌ No EU VAT / OSS |
| Any other | ❌ No tax compliance |

### Masters for Multi-Country
- `masters/states-countries.tsx` → **8-line stub** — no UI to browse/configure countries
- `masters/tax-config.tsx` → 106 lines, allows custom tax rates (name, type, %) — used for restaurant and pharmacy GST
- Multi-currency is an Enterprise-only module with basic exchange rate support

### Conclusion
The system is effectively **India-only** in tax compliance. The infrastructure for multi-country (tenant fields, currency config) exists but the tax engine, country masters UI, and compliance reports are not built for non-India markets.

---

## SECTION 6: Dynamic Roles & Users Per Tenant

### How It Works
- **Auth:** Passport.js local strategy → session stores `tenantId`, `tenantPlan`, role
- **Tenant isolation:** Every DB query scoped by `tenant_id` from session (application-level — no PostgreSQL RLS)
- **RBAC:** `role_permissions` table: `{ roleId, screenKey, canView, canCreate, canEdit, canDelete, tenantId }`
- **110+ screen keys** in `shared/screen-registry.ts` — granular per module
- **Tenant admins CAN** create custom roles, assign any combination of screen keys with CRUD granularity
- **Plan boundary:** Even if a role has `canView = 1` for `journal_entries`, if the tenant's plan doesn't include `accounting`, the backend returns 403 — plan gates before RBAC

### Per-Plan Role Isolation
Each tenant has their own `roles` and `role_permissions` rows (scoped by `tenantId`). One tenant's roles never affect another.

### Gaps
| Gap | Impact |
|-----|--------|
| No PostgreSQL RLS — isolation enforced in app code only | Security risk if bug allows tenantId bypass |
| No row-level data isolation within roles (e.g., sales rep sees ALL customers, not just own) | Privacy/operational issue |
| No field-level permissions | Cannot hide salary from manager in the same screen |
| No time-based or IP-based access restrictions | |
| No approval-based privilege escalation | |

---

## SECTION 7: What's Needed to be a 100% Global Enterprise Competitor

### Priority 1 — CRITICAL (Blocks Commercial Viability)

| Item | Effort | Why Critical |
|------|--------|-------------|
| GL integration for all 10 vertical ERPs | 3 weeks | P&L meaningless without it |
| E-Commerce ERP rebuild (all stubs) | 4 weeks | Full vertical missing |
| Finance ERP standalone product | 2 weeks | No CA/Finance company can use it |
| AP (Accounts Payable) module | 2 weeks | Essential for any B2B business |
| Payroll → GL posting | 1 week | Salary doesn't hit books |
| Multi-country tax engine (VAT/ZATCA/US) | 6 weeks | Required for global expansion |
| Period-end close / Financial year lock | 1 week | Audit requirement |
| PostgreSQL RLS (safety net) | 1 week | Data security |

### Priority 2 — HIGH (Enterprise Feature Parity)

| Item | Effort |
|------|--------|
| Bank Reconciliation automation (auto-match) | 2 weeks |
| Vertical-specific subscription plans (NGO, Nidhi, CRM, Logistics, Real Estate, Agriculture, Education) | 3 days |
| States/Countries UI in Masters | 1 week |
| Healthcare: ABDM/ABHA integration | 3 weeks |
| Logistics: E-way bill generation, LR printing | 1 week |
| Education: Fee → GL, biometric attendance sync | 1 week |
| Hotel: Channel Manager integration | 3 weeks |
| HR: EPFO/ESI e-filing API | 2 weeks |
| Audit trail (field-level changes) | 2 weeks |
| Row-level data isolation within roles | 2 weeks |

### Priority 3 — MEDIUM (Competitive Differentiation)

| Item | Effort |
|------|--------|
| AI/ML: Lead scoring, demand forecasting | 4 weeks |
| Native mobile apps (iOS/Android) | 12 weeks |
| Multi-company consolidation (group P&L) | 4 weeks |
| Manufacturing: MRP, BOM versioning, Work orders | 4 weeks |
| Gold: BIS hallmarking portal API | 2 weeks |
| CRM: Telephony integration, call logging | 2 weeks |
| Agriculture: Mandi price API, IoT sensors | 3 weeks |
| Real Estate: RERA compliance module | 2 weeks |
| Intercompany transactions | 4 weeks |
| Recurring Journal Entries | 3 days |

---

## Scorecard Summary

| Vertical | Routes | UI Pages | Score |
|----------|--------|----------|-------|
| Restaurant | ~349 | 24 real pages | 🟢 85% |
| Gold ERP | ~206 | 13 (~6,000 lines) | 🟢 90% |
| HR/Payroll | ~147 | 16 (~8,600 lines) | 🟢 85% |
| Education | ~146 | 14 real pages | 🟡 75% |
| Retail/POS | ~91 | pos.tsx = 2,858 lines | 🟢 80% |
| Hotel | ~63 | 11 real pages | 🟡 60% |
| Healthcare | ~134 | 11 real pages | 🟡 60% |
| Real Estate | ~66 | 10 real pages | 🟡 60% |
| NGO | ~56 | 9 real pages | 🟡 65% |
| Nidhi Company | 35 | 11 real pages | 🟡 65% |
| CRM | ~41 | 8 real pages | 🟡 55% |
| Logistics | ~74 | 10 real pages | 🟡 55% |
| Pharmacy | ~34 | 10 real pages | 🟡 55% |
| Agriculture | ~46 | 9 real pages | 🟡 50% |
| Manufacturing | (in core) | 8 pages | 🟡 65% |
| Finance ERP (standalone) | 0 | 8-line stub | 🔴 5% |
| E-Commerce | ~17 | All stubs | 🔴 5% |

| Architecture Dimension | Rating |
|-----------------------|--------|
| Multi-tenancy isolation | 🟢 Strong (app-level) |
| Subscription plan enforcement | 🟢 Good (frontend + backend) |
| RBAC (roles & permissions) | 🟢 Good (110+ screen keys, CRUD-level) |
| GL/Accounting engine | 🟡 Strong for core, missing for verticals |
| Tax compliance | 🟡 India-only (GST, TDS, e-Invoice deep; no global) |
| Multi-currency | 🟡 Present, Enterprise-only, basic |
| Global enterprise readiness | 🟡 ~62% overall |
