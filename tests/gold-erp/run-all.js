/**
 * Gold ERP — Full Test Suite Runner
 * Usage (in code_execution sandbox):
 *
 *   const fs = await import('fs');
 *   const path = await import('path');
 *   function loadPlan(file) {
 *     return fs.readFileSync(path.join('/home/runner/workspace/tests/gold-erp/plans', file), 'utf-8');
 *   }
 *   const result = await runTest({ testPlan: loadPlan('f01-production-cycle.md'), ... });
 *
 * OR paste individual plan contents into runTest({ testPlan: `...` }) calls.
 *
 * BATCH EXECUTION ORDER — run in this sequence:
 *   Batch A (setup):     00-master-data-setup.md
 *   Batch B (core Gold): f01, f02, f03, f04, f05
 *   Batch C (advanced):  f06, f07, f08, f09
 *   Batch D (extended):  f11, f12, f13, f14
 *   Batch E (screens):   sc-individual-screens.md
 *   Batch F (standard):  f15, f16, f17, f18, f19, f21
 *   Batch G (finance):   f22, f23, f24
 *   Batch H (admin):     f25, f26, f27
 *
 * SKIPPED (manual only — hardware/OTP required):
 *   F10 — RFID Full Cycle (physical RFID reader needed)
 *   F20 — Chit Online Portal (real OTP needed)
 */

const PLANS = [
  // ── SETUP ─────────────────────────────────────────────────────────────────
  { file: '00-master-data-setup.md',        id: 'SETUP', label: 'Master Data Setup' },

  // ── CORE GOLD ERP ─────────────────────────────────────────────────────────
  { file: 'f01-production-cycle.md',        id: 'F01',   label: 'Production Cycle (DS-NK-001)' },
  { file: 'f02-retail-pos.md',              id: 'F02',   label: 'Retail POS + Old Gold Exchange + Loyalty' },
  { file: 'f03-chit-scheme.md',             id: 'F03',   label: 'Gold Chit Scheme Lifecycle' },
  { file: 'f04-wholesale-jobwork.md',       id: 'F04',   label: 'Wholesale Jobwork (Customer Gold)' },
  { file: 'f05-bullion-rate-cut.md',        id: 'F05',   label: 'Bullion Rate Cut Invoice + Vault' },
  { file: 'f06-physical-audit.md',          id: 'F06',   label: 'Physical Inventory Audit' },
  { file: 'f07-karigar-settlement-math.md', id: 'F07',   label: 'Karigar Settlement Math (Happy + Negative)' },
  { file: 'f08-metal-ledger.md',            id: 'F08',   label: 'Metal Ledger End-of-Day Reconciliation' },
  { file: 'f09-hallmarking.md',             id: 'F09',   label: 'Hallmarking Batch + HUID Records' },

  // ── EXTENDED GOLD ERP ─────────────────────────────────────────────────────
  { file: 'f11-ecatalog-oms.md',            id: 'F11',   label: 'E-Catalog + OMS (WhatsApp simulated)' },
  { file: 'f12-repairs.md',                 id: 'F12',   label: 'Repairs & Remodeling' },
  { file: 'f13-refining.md',               id: 'F13',   label: 'Refining Process' },
  { file: 'f14-multi-stage-production.md', id: 'F14',   label: 'Multi-Stage Production (18K Diamond Ring)' },

  // ── INDIVIDUAL SCREENS ────────────────────────────────────────────────────
  { file: 'sc-individual-screens.md',       id: 'SC',    label: '8 Individual Screen Tests' },

  // ── STANDARD ERP + CRM + HR ───────────────────────────────────────────────
  { file: 'f15-crm-full-flow.md',           id: 'F15',   label: 'CRM Full Flow' },
  { file: 'f16-multi-branch.md',            id: 'F16',   label: 'Multi-Branch Operations' },
  { file: 'f17-vendor-purchase.md',         id: 'F17',   label: 'Vendor Purchase + GRN + Dispatch' },
  { file: 'f18-hrms-payroll.md',            id: 'F18',   label: 'HRMS Full Flow (Onboarding to Appraisal)' },
  { file: 'f19-ecommerce.md',               id: 'F19',   label: 'E-Commerce Customer Journey' },
  { file: 'f21-hrms-exit.md',              id: 'F21',   label: 'HRMS Exit Process' },

  // ── FINANCE + ADMIN ───────────────────────────────────────────────────────
  { file: 'f22-bank-reconciliation.md',    id: 'F22',   label: 'Bank Reconciliation' },
  { file: 'f23-crm-dashboards.md',         id: 'F23',   label: 'CRM Dashboards & Reports' },
  { file: 'f24-multi-currency.md',         id: 'F24',   label: 'Multi-Currency Invoice (AED Export)' },
  { file: 'f25-admin-settings.md',         id: 'F25',   label: 'Admin & Settings' },
  { file: 'f26-standard-erp-gaps.md',      id: 'F26',   label: 'Standard ERP Gaps (Budget, Fixed Assets, GST)' },
  { file: 'f27-security-admin.md',         id: 'F27',   label: 'Security Admin (Roles, Sessions, Audit)' },
];

// ─── TECHNICAL DOCUMENTATION (shared across all tests) ──────────────────────
const TECH_DOCS = `
## Gold ERP Tenant
- Tenant slug: gold-erp-demo
- Login: goldadmin / Gold@1234
- Plan: gold_erp_plan (id=6)
- tenant_id: 13

## URL Structure
- Gold ERP sections: /gold-erp?section=<key>
- Common sections: overview, karigar, karigar-ledger, production, sketch, cad, cam, ghat,
  finalize, settlement, karigar-attendance, estimates, jewellery-pos, customer-approvals,
  chit, chit-collection-register, chit-maturity, chit-defaulters, chit-redemptions,
  bullion, bullion-bookings, bullion-rate-cuts, hallmarking, hallmarking-batches,
  vault-movement, vault-audit, rfid, ecatalog, oms-orders, oms-notify,
  repairs, counter-bookings, refining, physical-audit, metal-ledger, analytics,
  promotions, loyalty, buyback, pos-old-gold, wholesale-b2b-orders, wholesale-jobwork,
  rates, ecommerce
- Standard ERP: /invoices, /purchase-orders, /vendors, /customers, /gatepasses,
  /warehouses, /goods-receipt-notes, /purchase-requisitions, /approvals, /cost-centres,
  /fixed-assets, /currency-management, /gst-reports, /audit-trail, /mis,
  /crm, /crm/leads, /crm/surveys, /hr/employees, /hr/attendance, /hr/leave,
  /hr/payroll, /hr/expense-claims, /hr/onboarding, /hr/letters, /hr/support-desk,
  /hr/appraisals, /hr/timesheets, /settings, /subscription-management, /ess

## Mock Data (from Excel)
- Metal Rates: 22K ₹6,820/gm · 18K ₹5,640/gm · 24K ₹7,439/gm · Silver ₹85/gm
- Karigar 1: Raju Goldsmith — ₹400/gm making, 5% wastage, ₹800/day wage
- Karigar 2: Suresh Stone Setter — ₹500/gm making, 3% wastage
- Customer: Meena Reddy — Loyalty ID LY-00123, 500 pts balance
- B2B Customer: Priya Jewellers — ₹5,00,000 credit limit
- Supplier: Riddhi Siddhi Bullion
- Design: DS-NK-001 necklace (22K, 15.5gm target)
- Chit: Gold Savings 11+1 (12 months, ₹5,000/month)
- Exchange Rate: 1 AED = ₹22.50

## Key DB Tables (Gold ERP specific)
- jw_metal_rates, jw_karigars, jw_karigar_ledger
- jw_production_orders, jw_karigar_settlements
- jw_sketch_processes, jw_cad_processes, jw_cam_processes
- jw_ghat_settlements, jw_job_finalize
- jw_jewellery_pos_bills, jw_jewellery_pos_bill_items
- jw_old_gold_purchases, jw_bullion_transactions, jw_bullion_bookings
- jw_chit_schemes, jw_chit_members, jw_chit_installments, jw_chit_redemptions
- jw_metal_ledger, jw_hallmarking_records, jw_hallmarking_batches
- jw_vault_movements, jw_vault_audits
- jw_ecatalogs, jw_oms_orders, jw_repairs, jw_refining_batches

## Auth Flow
1. Navigate to /auth
2. Fill Company ID: "gold-erp-demo"
3. Fill Username: "goldadmin"
4. Fill Password: "Gold@1234"
5. Click Sign In — expect redirect away from /auth to main ERP
`;

// Export for use in code_execution
module.exports = { PLANS, TECH_DOCS };
