# Gold ERP — Automation Test Suite

## Coverage

| # | Flow | File | Steps | Status |
|---|---|---|---|---|
| SETUP | Master Data Setup | `00-master-data-setup.md` | 48 | Automatable |
| F1 | Production Cycle (DS-NK-001) | `f01-production-cycle.md` | 61 | Automatable |
| F2 | Retail POS + Old Gold + Loyalty | `f02-retail-pos.md` | 54 | Automatable |
| F3 | Gold Chit Scheme Lifecycle | `f03-chit-scheme.md` | 53 | Automatable |
| F4 | Wholesale Jobwork (Customer Gold) | `f04-wholesale-jobwork.md` | 35 | Automatable |
| F5 | Bullion Rate Cut + Vault Audit | `f05-bullion-rate-cut.md` | 58 | Automatable |
| F6 | Physical Inventory Audit | `f06-physical-audit.md` | 26 | Automatable |
| F7 | Karigar Settlement Math | `f07-karigar-settlement-math.md` | 29 | Automatable |
| F8 | Metal Ledger Reconciliation | `f08-metal-ledger.md` | 27 | Automatable |
| F9 | Hallmarking Batch + HUID | `f09-hallmarking.md` | 39 | Automatable |
| F10 | RFID Full Cycle | _(manual only)_ | 32 | **Manual — hardware** |
| F11 | E-Catalog + OMS | `f11-ecatalog-oms.md` | 36 | Automatable (WhatsApp simulated) |
| F12 | Repairs & Remodeling | `f12-repairs.md` | 44 | Automatable |
| F13 | Refining Process | `f13-refining.md` | 34 | Automatable |
| F14 | Multi-Stage Production (18K Ring) | `f14-multi-stage-production.md` | 69 | Automatable |
| SC | 8 Individual Screen Tests | `sc-individual-screens.md` | 61 | Automatable |
| F15 | CRM Full Flow | `f15-crm-full-flow.md` | 58 | Automatable |
| F16 | Multi-Branch Operations | `f16-multi-branch.md` | 32 | Automatable |
| F17 | Vendor Purchase + GRN + Dispatch | `f17-vendor-purchase.md` | 50 | Automatable (e-way simulated) |
| F18 | HRMS Full Payroll Flow | `f18-hrms-payroll.md` | 72 | Automatable (PF/ESI simulated) |
| F19 | E-Commerce Journey | `f19-ecommerce.md` | 34 | Automatable (Razorpay sandbox) |
| F20 | Chit Online Portal (OTP) | _(manual only)_ | 25 | **Manual — real OTP** |
| F21 | HRMS Exit Process | `f21-hrms-exit.md` | 40 | Automatable |
| F22 | Bank Reconciliation | `f22-bank-reconciliation.md` | 29 | Automatable |
| F23 | CRM Dashboards & Reports | `f23-crm-dashboards.md` | 27 | Automatable |
| F24 | Multi-Currency Invoice (AED) | `f24-multi-currency.md` | 42 | Automatable |
| F25 | Admin & Settings | `f25-admin-settings.md` | 47 | Automatable |
| F26 | Standard ERP Gaps (Budget/GST) | `f26-standard-erp-gaps.md` | 60 | Automatable |
| F27 | Security Admin (MFA/Sessions) | `f27-security-admin.md` | 51 | Automatable |

**Total: 25 automatable flows + 2 manual flows (F10, F20)**
**Total automatable steps: ~1,257**
**Estimated run time: ~75–90 minutes for full suite**

---

## How to Run

Paste this into the `code_execution` sandbox in the Replit agent:

```javascript
const fs = await import('fs');

function loadPlan(file) {
  return fs.readFileSync(
    `/home/runner/workspace/tests/gold-erp/plans/${file}`,
    'utf-8'
  );
}

// Run a single flow
const result = await runTest({
  testPlan: loadPlan('f01-production-cycle.md'),
  relevantTechnicalDocumentation: `
    Tenant: gold-erp-demo, Login: goldadmin / Gold@1234
    Gold ERP sections via /gold-erp?section=<key>
    Key sections: karigar, production, sketch, cad, cam, ghat, finalize, settlement
  `
});
console.log(result.status, result.testOutput);
```

---

## Recommended Execution Order

Run in sequence — each batch can be run independently, but master setup should always run first:

| Batch | Flows | Why sequential |
|---|---|---|
| **A — Setup** | SETUP | Creates metal rates + karigars needed by all gold flows |
| **B — Core Gold** | F1–F9 | Core jewellery manufacturing flows, mostly independent |
| **C — Extended Gold** | F11–F14 | E-catalog, repairs, refining, multi-stage production |
| **D — Screens** | SC | Individual screen validation |
| **E — Standard ERP** | F15–F19, F21 | CRM, HR, vendor, e-commerce, exit |
| **F — Finance** | F22–F24 | Bank reconciliation, dashboards, multi-currency |
| **G — Admin** | F25–F27 | Settings, roles, security (run last — changes settings) |

---

## Mock Data Quick Reference

| Entity | Value |
|---|---|
| Tenant slug | gold-erp-demo |
| Admin login | goldadmin / Gold@1234 |
| Gold 22K rate | ₹6,820/gm |
| Gold 18K rate | ₹5,640/gm |
| Karigar 1 | Raju Goldsmith — ₹400/gm making, 5% wastage |
| Karigar 2 | Suresh Stone Setter — ₹500/gm making, 3% wastage |
| Loyalty member | Meena Reddy — LY-00123, 500 pts |
| B2B customer | Priya Jewellers — ₹5,00,000 credit limit |
| Bullion supplier | Riddhi Siddhi Bullion |
| Design | DS-NK-001 (22K necklace, 15.5gm target) |
| Chit scheme | Gold Savings 11+1 (12 months, ₹5,000/month) |
| AED rate | 1 AED = ₹22.50 |

---

## Manual Test Cases (excluded from automation)

### F10 — RFID Full Cycle
**Why manual:** Requires physical RFID reader hardware, tag programming, and antenna scanning.
Steps include: attach RFID tags to jewellery, scan with handheld reader, validate anti-theft alarm.

### F20 — Gold Chit Online Portal
**Why manual:** Customer-facing OTP login requires a real mobile number receiving SMS OTP.
Steps include: customer registers on public portal, receives OTP, views instalment schedule, pays online.

---

## File Structure

```
tests/gold-erp/
├── README.md                        ← this file
├── run-all.js                       ← plan registry + tech docs export
└── plans/
    ├── 00-master-data-setup.md      ← ALWAYS run first
    ├── f01-production-cycle.md
    ├── f02-retail-pos.md
    ├── f03-chit-scheme.md
    ├── f04-wholesale-jobwork.md
    ├── f05-bullion-rate-cut.md
    ├── f06-physical-audit.md
    ├── f07-karigar-settlement-math.md
    ├── f08-metal-ledger.md
    ├── f09-hallmarking.md
    ├── f11-ecatalog-oms.md
    ├── f12-repairs.md
    ├── f13-refining.md
    ├── f14-multi-stage-production.md
    ├── sc-individual-screens.md
    ├── f15-crm-full-flow.md
    ├── f16-multi-branch.md
    ├── f17-vendor-purchase.md
    ├── f18-hrms-payroll.md
    ├── f19-ecommerce.md
    ├── f21-hrms-exit.md
    ├── f22-bank-reconciliation.md
    ├── f23-crm-dashboards.md
    ├── f24-multi-currency.md
    ├── f25-admin-settings.md
    ├── f26-standard-erp-gaps.md
    └── f27-security-admin.md
```
