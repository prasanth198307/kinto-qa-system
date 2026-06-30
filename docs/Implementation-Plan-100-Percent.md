# Kinto ERP — Implementation Plan to 100% Global Enterprise
**Created:** 2026-06-30  
**Goal:** Close all gaps identified in ERP-Assessment-2026-06-30.md  
**Target:** 100% enterprise-grade, globally competitive, all 17 ERPs fully functional

---

## Phase 1 — Quick Wins (Week 1–2) · Estimated: 2 weeks
*High impact, low effort. Ship these first — immediate business value.*

### 1.1 Finance ERP Merge (finance-erp.tsx → accounting module)
- Replace 8-line stub with Finance ERP dashboard (AR summary, AP summary, cash position)
- Create `client/src/pages/finance/` sub-pages: ar.tsx, ap.tsx, gl.tsx, bank-recon.tsx, period-close.tsx, reports.tsx
- Wire `finance-erp.tsx` as router to these sub-pages
- Add "Finance ERP" as standalone subscription plan in plan-features.ts
- **Files:** client/src/pages/finance-erp.tsx, server/finance-erp-routes.ts, server/plan-features.ts

### 1.2 Vertical Subscription Plans for 8 Missing ERPs
- Add Starter/Professional/Enterprise tiers for: NGO, Nidhi, CRM, Logistics, Real Estate, Agriculture, Education, E-Commerce
- **File:** server/plan-features.ts

### 1.3 Payroll → GL Posting
- When payroll is finalized (POST /api/hr/payroll/:id/finalize), call journal-service to post salary journal entries
- Accounts: Salary Expense Dr, Net Pay Payable Cr, PF Payable Cr, ESI Payable Cr, TDS Payable Cr
- **Files:** server/hr-routes.ts, server/journal-service.ts

### 1.4 Recurring Journal Entries
- Schema: recurring_journals table (template journal + frequency + next_run_date)
- Cron job to auto-post on due date
- UI: accounting sub-page for managing recurring journals
- **Files:** server/routes.ts (accounting section), client/src/pages/finance/recurring-journals.tsx

### 1.5 Masters: States/Countries UI + Print Templates
- Build client/src/pages/masters/states-countries.tsx (currently 8-line stub)
- Build client/src/pages/masters/print-templates.tsx (currently 8-line stub)

---

## Phase 2 — GL Integration for All 10 Vertical ERPs (Week 2–4) · Estimated: 3 weeks
*Critical for P&L and Balance Sheet accuracy across all vertical tenants.*

For each vertical, identify key financial events and call journal-service.ts:

### 2.1 Hotel ERP → GL
- Folio charge posted → Dr Guest Ledger, Cr Revenue (Room/F&B/Service)
- Folio payment received → Dr Cash/Bank, Cr Guest Ledger
- Night audit room charges → auto-post daily room revenue
- **File:** server/hotel-enterprise-routes.ts

### 2.2 Healthcare ERP → GL
- OPD bill → Dr Patient Receivable, Cr OPD Revenue
- IPD discharge bill → Dr Patient Receivable, Cr IPD Revenue
- Lab bill → Dr Patient Receivable, Cr Lab Revenue
- Insurance claim receipt → Dr Insurance Receivable → Dr Bank (on receipt)
- **File:** server/healthcare-routes.ts, server/healthcare-enterprise-routes.ts

### 2.3 Pharmacy ERP → GL
- Drug sale bill → Dr Customer Receivable, Cr Drug Sales Revenue
- Drug purchase GRN → Dr Drug Purchase, Cr Vendor Payable
- **File:** server/pharmacy-routes.ts, server/pharmacy-enterprise-routes.ts

### 2.4 NGO ERP → GL
- Donation received → Dr Cash/Bank, Cr Donation Income
- 80G receipt issued → no GL (informational only)
- Grant received → Dr Bank, Cr Grant Income
- Project expense → Dr Project Expense, Cr Cash/Bank
- **File:** server/ngo-routes.ts

### 2.5 Nidhi Company ERP → GL
- Member deposit received → Dr Cash/Bank, Cr Fixed Deposit Liability
- Loan disbursed → Dr Loan Receivable, Cr Cash/Bank
- EMI collected → Dr Cash/Bank, Cr Loan Receivable + Cr Interest Income
- Interest on deposits accrued → Dr Interest Expense, Cr Deposit Interest Payable
- **File:** server/nidhi-routes.ts

### 2.6 Logistics ERP → GL
- Freight bill raised → Dr Customer Receivable, Cr Freight Revenue
- Freight payment received → Dr Cash/Bank, Cr Customer Receivable
- Fuel purchase → Dr Fuel Expense, Cr Cash/Bank
- **File:** server/logistics-routes.ts

### 2.7 Real Estate ERP → GL
- Booking advance received → Dr Bank, Cr Advance from Customer
- Demand collection → Dr Customer Receivable, Cr Revenue (% completion method)
- Construction cost booked → Dr WIP, Cr Vendor Payable
- **File:** server/realestate-routes.ts

### 2.8 Agriculture ERP → GL
- Harvest sale → Dr Customer Receivable, Cr Crop Sales Revenue
- Input purchase (seeds/fertilizer) → Dr Input Cost, Cr Cash/Vendor Payable
- **File:** server/agriculture-routes.ts

### 2.9 Education ERP → GL
- Fee collected → Dr Cash/Bank, Cr Fee Income
- Fee due (demand raised) → Dr Student Receivable, Cr Fee Income
- Hostel charges → Dr Student Receivable, Cr Hostel Income
- **File:** server/education-routes.ts

### 2.10 CRM ERP → GL
- CRM itself has no direct financial transactions (leads, contacts, activities)
- Quotation accepted → trigger invoice creation in invoicing module (bridge)
- **File:** server/crm-routes.ts

---

## Phase 3 — Finance ERP Completion: AP + Bank Recon + Period Close (Week 4–6) · Estimated: 3 weeks

### 3.1 Accounts Payable Module
- Vendor Bills: CRUD for vendor bills (purchase invoice from vendor)
- AP Aging report: overdue by 0-30, 31-60, 61-90, 90+ days
- Payment runs: bulk vendor payment selection + journal posting
- GL: Dr Expense/Asset, Cr Vendor Payable on bill; Dr Vendor Payable, Cr Bank on payment
- **New files:** server/ap-routes.ts, client/src/pages/finance/ap.tsx

### 3.2 Bank Reconciliation Automation
- Auto-match imported bank statement rows to existing journal entries
- Match by: amount + date (±3 days) + reference number
- Unmatched rows highlighted for manual matching
- BRS report: statement balance vs book balance reconciliation
- **Files:** server/routes.ts (bank recon section), client/src/pages/finance/bank-recon.tsx

### 3.3 Period-End Close / Financial Year Lock
- DB: accounting_periods table (period_name, start_date, end_date, status: open/closed)
- Middleware: check if posting date falls in closed period → reject with 409
- UI: period management page (open/close periods, year-end rollover)
- Year-end: auto-transfer P&L to retained earnings, zero out revenue/expense accounts
- **Files:** server/period-close-routes.ts, client/src/pages/finance/period-close.tsx

### 3.4 AR Module Enhancement
- Customer statement (all invoices + payments + outstanding)
- AR Aging drill-down (click aging bucket → list of invoices)
- Customer credit limit enforcement on new invoice creation
- Dunning letters (reminder emails for overdue invoices)

---

## Phase 4 — E-Commerce ERP Full Rebuild (Week 6–10) · Estimated: 4 weeks
*All 8 pages are stubs. Full build needed.*

### 4.1 Backend Routes (server/ecommerce-routes.ts)
- Channel setup: Amazon SP-API, Flipkart Seller API, Meesho, Myntra, ONDC
- Product listing sync (push product catalog to channels)
- Order import (pull orders from all channels, normalize to common order schema)
- Inventory sync (real-time stock update across all channels)
- Shipment: Shiprocket API integration (create shipment, AWB, track)
- Returns management (return requests, refund processing)
- Settlement reconciliation (channel payments vs actual remittances)

### 4.2 UI Pages (client/src/pages/ecommerce/)
- dashboard.tsx: Multi-channel KPIs (orders/revenue/returns by channel)
- channels.tsx: Connect/disconnect marketplace channels, API credentials
- listings.tsx: Product catalog → push to channels, pricing per channel
- orders.tsx: Unified order view across all channels, status management
- shipments.tsx: Bulk ship via Shiprocket, label print, track
- returns.tsx: Return requests, approval, refund trigger
- settlements.tsx: Channel payment reconciliation vs expected
- reports.tsx: Channel-wise sales, returns, profitability

### 4.3 GL Integration
- Order fulfilled + invoice created → Dr Customer Receivable, Cr Sales Revenue
- Channel fee → Dr Channel Commission Expense, Cr Vendor Payable
- Settlement received → Dr Bank, Cr Customer Receivable

---

## Phase 5 — Multi-Country Tax Engine (Week 10–16) · Estimated: 6 weeks
*Required for global expansion beyond India.*

### 5.1 Tax Engine Architecture
- Parametric tax engine: country → tax_regime → tax_rules table
- Tax rules: rate, tax_type (VAT/GST/Sales Tax), applies_to (goods/services/both), threshold
- Invoice tax calculation: reads tenant's country_code → applies correct tax rules
- Replace hardcoded CGST/SGST/IGST fields with generic tax_line_items (array)

### 5.2 ZATCA (Saudi Arabia / UAE)
- Phase 1: QR code on simplified invoices
- Phase 2: Fatoora XML generation + ZATCA API clearance
- VAT 15% (Saudi) / 5% (UAE)

### 5.3 EU VAT
- Standard VAT per country (17%–27%)
- OSS (One-Stop-Shop) annual return
- VAT invoice format requirements

### 5.4 US Sales Tax
- State-by-state rate table
- Nexus detection (ship-to state)
- Avalara/TaxJar API integration option

### 5.5 UK VAT
- Making Tax Digital (MTD) API integration
- UK VAT return (Box 1-9)

---

## Phase 6 — Enterprise Security & Data Integrity (Week 6–8, parallel with Phase 4) · Estimated: 2 weeks

### 6.1 PostgreSQL Row-Level Security
- Enable RLS on all major tables
- Policy: `USING (tenant_id = current_setting('app.tenant_id')::int)`
- Set `app.tenant_id` at connection level in db.ts
- Fallback safety net even if application code has bugs

### 6.2 Row-Level Data Isolation Within Roles
- New permission field: `data_scope` (all / own / branch)
- `own` = only records where `created_by = current_user_id`
- `branch` = only records where `branch_id IN (user's branches)`
- Apply to: invoices, sales orders, customers, leads, HR attendance

### 6.3 Audit Trail (Field-Level)
- DB trigger on all write operations → audit_log table
- Captures: table_name, record_id, field_name, old_value, new_value, changed_by, changed_at
- UI: Audit log viewer with filter by table/user/date
- Especially critical for: journal_entries, invoices, role_permissions, payroll

---

## Phase 7 — Vertical Depth Upgrades (Week 8–16, parallel) · Estimated: 8 weeks

### 7.1 Hotel: Channel Manager
- OTA connectivity: Booking.com, Expedia, Agoda, MakeMyTrip
- Rate & availability push to all OTAs
- Reservation pull from OTAs → auto-create reservations
- Revenue management: dynamic pricing by occupancy %

### 7.2 Healthcare: ABDM / ABHA
- ABHA (Ayushman Bharat Health Account) ID generation
- Health Records (PHR) API integration
- e-Prescription (ePHR) standard

### 7.3 Logistics: E-Way Bill + Route Optimization
- E-way bill generation from consignment (via NIC API)
- Lorry Receipt (LR) PDF generation
- Route optimization (Google Maps Distance Matrix API)
- FASTag toll deduction logging

### 7.4 HR: EPFO / ESI e-Filing
- EPFO ECR file generation (monthly PF challan)
- ESI contribution file
- Form 24Q (TDS on salary) XML for TRACES

### 7.5 Manufacturing: MRP + Work Orders
- Bill of Materials (BOM) with versioning
- Work Order management (create WO from sales order)
- MRP engine (calculate RM requirement from WO)
- Shop floor tracking (WO stage progress)

### 7.6 Real Estate: RERA Compliance
- RERA project registration details
- Quarterly progress reports
- Allottee complaints register
- RERA-format financial statements per project

### 7.7 Nidhi: RBI Compliance
- NDH-1 (quarterly return) data extraction
- NDH-3 (half-yearly return)
- Director KYC tracking
- Net Owned Funds ratio monitoring

### 7.8 NGO: 80G + FCRA Automation
- Bulk 80G certificate PDF generation (server-side PDF)
- 80G certificate email delivery
- FCRA Form FC-4 annual return data extraction
- FCRA foreign contribution quarterly report

---

## Phase 8 — AI/ML & Mobile (Week 16+) · Estimated: 12 weeks

### 8.1 AI Features
- CRM: Lead scoring (logistic regression on lead_source, activity count, deal_value)
- Inventory: Demand forecasting (time-series on sales history)
- Finance: Anomaly detection in journal entries (flag unusual entries)
- Restaurant: Menu engineering AI (recommend price changes based on margin + popularity)

### 8.2 Native Mobile Apps
- React Native codebase sharing web logic
- Offline-first for: Restaurant POS, Logistics ePOD, Pharmacy billing, Collection agents (Nidhi)
- Push notifications: EMI due, FD maturity, fee due, appointment reminders

### 8.3 Multi-Company Consolidation
- Holding company view: consolidated P&L across tenants (same group)
- Intercompany elimination entries
- Group MIS dashboard

---

## Execution Sequence

| Week | Phase | Key Deliverables |
|------|-------|-----------------|
| 1 | Phase 1 | Finance ERP merge, 8 vertical plans, Payroll→GL |
| 2 | Phase 1 | Recurring journals, Masters stubs fixed |
| 3–4 | Phase 2 | GL integration: Hotel, Healthcare, Pharmacy, NGO |
| 5–6 | Phase 2 | GL integration: Nidhi, Logistics, Real Estate, Agriculture, Education |
| 7–8 | Phase 3 | AP module, Bank Reconciliation, Period Close |
| 8–9 | Phase 6 | PostgreSQL RLS, Audit Trail |
| 10–13 | Phase 4 | E-Commerce ERP full rebuild |
| 14–19 | Phase 5 | Multi-country tax engine (ZATCA, EU VAT) |
| 8–15 | Phase 7 | Hotel Channel Manager, Healthcare ABDM, Logistics e-way bill, HR EPFO |
| 16+ | Phase 8 | AI/ML, Mobile apps, Multi-company |

## Definition of Done (100%)
- All 17 verticals: backend routes > 50, all UI pages > 100 lines with real functionality
- All vertical financial transactions post to the GL
- Finance ERP: AP, AR, GL, Bank Recon, Period Close all functional
- Tax compliance: India (GST) ✅ + ZATCA ✅ + EU VAT ✅ + US Sales Tax ✅
- Multi-country: any tenant from any country can use the system with correct tax
- RBAC: role permissions enforced at API level + PostgreSQL RLS as safety net
- All 17 vertical subscription plans defined with Starter/Pro/Enterprise tiers
- E-Commerce: all 8 pages functional with at least 2 marketplace integrations
- Mobile: offline-capable PWA for all field-use verticals
- Audit trail: all write operations logged with old/new values
