# Kinto Smart Ops — Module Guide

## Competitors Referenced
Throughout this document, gaps are compared against: **Tally Prime, Zoho (Books + Inventory + People), SAP Business One, Odoo, ERPNext, Busy Accounting**.

---

## 1. Production & Inventory

### What It Does
- **Raw Material Issuance** — Issue specific raw materials from stock against a production run, with quantity and batch tracking
- **Production Entries** — Record finished goods output per batch, linked to raw materials consumed
- **FIFO Batch Allocation** — Inventory is consumed oldest-batch-first automatically; no manual selection needed
- **Finished Goods Inventory** — Tracks stock of finished products separately from raw materials
- **Scrap Management** — Records scrap generated during production with its own inventory ledger
- **Production Reconciliation** — Compares input materials issued vs finished goods produced to identify yield loss or variance
- **Repacking** — Handles repackaging of finished goods into different SKUs or pack sizes
- **Variance Analytics** — Highlights batches where actual yield deviated from expected yield

### Advantages
- FIFO is automatic — no configuration needed per item, no manual lot selection during issuance
- Production entries directly reduce raw material stock and increase finished goods stock in one step
- Scrap is captured as a by-product entry at the production stage, not as a manual stock adjustment
- Reconciliation report flags yield variance at the batch level, not just overall

### What Major Apps Are Missing
| Gap | Tally | Zoho | SAP B1 | Odoo | ERPNext |
|---|---|---|---|---|---|
| Automatic FIFO across batches without configuration | No native batch FIFO | Partial | Configured per item | Configured per item | Configured per item |
| Scrap captured inline during production entry | Manual journal | Separate scrapping order | Separate scrapping order | Separate scrap order | Separate scrap order |
| Yield variance at batch level visible without BI tool | Report only | No | Needs Crystal Reports | Needs custom | Needs custom |
| WhatsApp-triggered machine startup before production | None | None | None | None | None |

---

## 2. Purchase Orders

### What It Does
- Raise purchase orders to vendors with item-wise quantities and rates
- Track PO status — open, partially received, closed
- Goods Receipt Note (GRN) — receive items against a PO, which increases inventory stock
- Purchase Returns — return items back to vendor with reason, reducing stock
- Vendor Debit Notes — raise debit notes against vendor for short supply or quality rejection
- Rate history — see past purchase prices for the same item from the same vendor
- Vendor Analytics — compare vendor-wise purchase volumes, payment trends

### Advantages
- PO → GRN → Invoice is a complete 3-step purchase cycle in one place
- Purchase returns directly reduce inventory (no manual stock adjustment needed)
- Debit notes are linked to the original PO for traceability
- Vendor analytics shows concentration risk (over-dependence on one vendor)

### What Major Apps Are Missing
| Gap | Tally | Zoho | SAP B1 | Odoo | ERPNext |
|---|---|---|---|---|---|
| Vendor concentration analytics built-in | No | No | Needs Crystal Reports | Needs custom report | Basic only |
| Purchase return linked directly to PO line | Manual | Partial | Yes | Yes | Yes |
| Rate comparison across vendors for same item | No | No | Yes | Yes | Yes — this is a gap in Kinto too (see below) |

**Kinto gaps vs competitors:**
- No multi-vendor rate comparison / RFQ (Request for Quotation) workflow
- No purchase approval workflow (PO needs manager sign-off before sending to vendor)
- No landed cost distribution (freight, customs duty added to item cost)

---

## 3. Gatepasses & Dispatch

### What It Does
- Create outward gatepasses for material leaving the factory/warehouse
- Gatepass must exist before an invoice can be raised (invoice-first dispatch is enforced)
- Link gatepass to sales order and invoice
- Dispatch Tracking — track vehicle number, driver, transporter, and estimated delivery
- Dispatch Masters — maintain a master list of vehicles, drivers, and transporters
- Sales Returns — receive goods back from customer, linked to original invoice

### Advantages
- **Invoice-first, tamper-proof dispatch** — the system enforces that no material leaves without a gatepass, and no gatepass exists without traceability to an invoice
- Dispatch tracking gives real-time visibility of where each vehicle is in the delivery chain
- Sales returns directly increase inventory back (no manual stock adjustment)
- Gatepass number is printed on delivery challans for compliance

### What Major Apps Are Missing
| Gap | Tally | Zoho | SAP B1 | Odoo | ERPNext |
|---|---|---|---|---|---|
| Enforced gatepass before invoice (tamper-proof) | No | No | No (configurable) | No (configurable) | No |
| Vehicle + driver + transporter master with dispatch tracking | No | No | Partial | With extensions | Partial |
| Sales return directly updates inventory | Manual | Yes | Yes | Yes | Yes |

**Kinto gaps vs competitors:**
- No e-way bill auto-generation (integration with GST e-way bill portal)
- No digital POD (Proof of Delivery) capture from the delivery person
- No route optimisation or multi-stop delivery planning

---

## 4. Sales Invoicing & GST

### What It Does
- Create GST-compliant B2B and B2C sales invoices
- Automatic CGST/SGST/IGST calculation based on buyer state (intra vs inter-state)
- Invoice templates — customisable invoice design with company logo, terms, bank details
- Credit Notes — raise credit notes against invoices for returns or rate corrections
- Pending Payments Dashboard — shows all outstanding invoices with aging
- Payment Write-Off — write off small uncollectable balances
- Customer Advances — record advance payments from customers before invoice
- Bulk Payment Report — download payment status across all invoices

### Advantages
- Invoice raises corresponding journal entries automatically (double-entry accounting happens in the background)
- Pending payments dashboard shows outstanding per customer with days overdue
- Credit notes are linked to the original invoice, not standalone
- Customer advances are adjusted against future invoices automatically

### What Major Apps Are Missing
| Gap | Tally | Zoho | SAP B1 | Odoo | ERPNext |
|---|---|---|---|---|---|
| GST CGST/SGST/IGST auto-split by state | Yes | Yes | Yes | Yes | Yes — all do this well |
| Advance payment auto-adjustment against invoice | Manual | Yes | Yes | Yes | Yes |
| Customisable invoice template | No (fixed) | Yes | Yes | Yes | Yes |

**Kinto gaps vs competitors:**
- No e-invoice (IRN) generation via IRP portal integration
- No auto-reconciliation of GST portal data with books (GSTR-2A matching)
- No recurring invoice support for subscription-based billing
- No multi-currency invoicing for export businesses

---

## 5. Accounting & Ledger

### What It Does
- **Chart of Accounts** — full double-entry COA with groups (Assets, Liabilities, Income, Expenses)
- **Journal Entries** — auto-generated from every invoice, payment, purchase, and expense; manual entries also supported
- **Trial Balance** — real-time debit/credit balance across all accounts
- **Profit & Loss Statement** — income vs expenses for any date range
- **Balance Sheet** — assets vs liabilities snapshot
- **Ledger View** — transaction-wise view of any account
- **Day Book** — all vouchers for a selected date
- **Aging Report** — outstanding debtors and creditors with 0-30, 31-60, 61-90, 90+ day buckets
- **Bank Statements** — import and reconcile bank transactions against journal entries
- **Cash Flow Statement** — operating, investing, financing cash flows
- **Budget & Variance** — set budgets per account and track actual vs budget
- **TDS Management** — record TDS deducted at source on vendor payments

### Advantages
- Every module (invoicing, purchases, expenses, payroll, gatepasses) posts journal entries automatically — the ledger is always up to date without manual data entry
- No separate accounting software needed — manufacturing and accounting are in the same database
- Aging report is generated from live invoice data, not from manual entries

### What Major Apps Are Missing
| Gap | Tally | Zoho | SAP B1 | Odoo | ERPNext |
|---|---|---|---|---|---|
| Accounting fully integrated with production and dispatch | No (separate product) | No (separate apps) | Yes | Yes | Yes |
| Auto journal from gatepass / dispatch events | No | No | Yes | Yes | Yes |
| Budget vs actual tracking | Yes | Yes | Yes | Yes | Yes — all do this |

**Kinto gaps vs competitors:**
- No bank reconciliation auto-matching (only manual marking)
- No multi-currency accounting
- No fixed asset register with depreciation schedules
- No inter-company accounting for groups with multiple entities
- No GSTR filing export (GSTR-1, GSTR-3B formatted reports)
- No TDS return filing export (26Q format)

---

## 6. Preventive Maintenance

### What It Does
- **Machine Master** — register all machines with type, location, and specs
- **PM Templates** — define task checklists for each machine type (e.g., lubrication, filter check)
- **Maintenance Plans** — schedule recurring maintenance by frequency (daily, weekly, monthly)
- **PM Execution** — record actual maintenance done with technician, date, and observations
- **Spare Parts Catalog** — maintain a catalog of spare parts per machine
- **Spare Parts Stock** — track spare parts inventory used during maintenance
- **PM History** — full maintenance history per machine
- **Machine Reports** — downtime analysis, maintenance frequency, overdue PM tasks

### Advantages
- Maintenance plans are linked to actual machines, not generic tasks
- Spare parts consumption during PM is recorded and deducts from spare parts stock automatically
- PM history gives an audit trail for insurance, compliance, and warranty claims
- WhatsApp reminders can be sent to technicians when PM is due

### What Major Apps Are Missing
| Gap | Tally | Zoho | SAP B1 | Odoo | ERPNext |
|---|---|---|---|---|---|
| Built-in preventive maintenance module | No | No | With Plant Maintenance add-on | Yes (Maintenance module) | Yes |
| Spare parts stock integrated with maintenance | No | No | Yes | Yes | Yes |
| WhatsApp reminders for PM due dates | No | No | No | No | No |

**Kinto gaps vs competitors:**
- No breakdown maintenance / corrective maintenance workflow (only preventive)
- No maintenance cost tracking per machine (labour + spare parts cost rolled up)
- No machine downtime vs production output correlation
- No QR code scanning to pull up machine history on the shop floor

---

## 7. WhatsApp Checklists & Machine Startup

### What It Does
- **Checklist Templates** — design custom checklists (startup, shutdown, cleaning, safety)
- **Checklist Assignments** — assign templates to specific machines or shifts
- **Machine Startup Reminders** — automated WhatsApp messages sent to operators at shift start time
- **Operator Response via WhatsApp** — operators complete checklists by replying to WhatsApp messages (no app install needed)
- **Checklist Records** — all completed checklists stored with timestamp and operator identity
- **Missed Checklist Alerts** — supervisors are notified if an operator hasn't completed a checklist within the window
- **WhatsApp Analytics** — completion rates, missed checklist trends, operator-wise compliance

### Advantages
- **Zero app installation for operators** — they use WhatsApp which they already have on their personal phones
- Startup compliance is enforced before production can begin on that machine
- Missed checklist notifications go to supervisors automatically — no manual follow-up needed
- Full audit trail of who confirmed what and when, admissible for ISO/GMP audits

### What Major Apps Are Missing
| Gap | Tally | Zoho | SAP B1 | Odoo | ERPNext |
|---|---|---|---|---|---|
| WhatsApp-based operator checklists (no app install) | No | No | No | No | No |
| Automated shift startup reminders via WhatsApp | No | No | No | No | No |
| Missed checklist supervisor alerts | No | No | No | No | No |
| Checklist completion analytics | No | No | No | No | No |

**This is a unique differentiator — no major ERP offers this natively.**

**Kinto gaps:**
- No voice message support for low-literacy operators
- No offline mode (requires WhatsApp internet connection)
- No image/photo upload as part of checklist response (e.g., photo of oil level gauge)

---

## 8. HR & Payroll

### What It Does
- **Employee Master** — full employee profiles with personal, bank, PF/ESI details, documents
- **Attendance** — daily attendance marking, import from biometric, half-day and late tracking
- **Leave Management** — leave types, leave balances, leave application and approval workflow
- **Payroll Processing** — salary structure with basic, HRA, allowances, deductions; auto-calculates PF, ESI, professional tax
- **Payslips** — printable A4 payslips per employee per month
- **Loans & Advances** — record employee loans, track EMI deductions from salary
- **TDS & Compliance** — Form 16 data, monthly TDS on salary
- **Recruitment** — job postings, applicant tracking, interview scheduling
- **Exit Management & F&F** — full and final settlement calculation on resignation/termination
- **HR Reports** — headcount, attrition, payroll summary, PF/ESI reports
- **HR Masters** — departments, designations, shifts, leave types configuration

### Advantages
- Payroll, attendance, and leave are tightly integrated — late arrivals auto-affect leave balance, approved leaves auto-appear in payroll deductions
- Salary processing generates accounting journal entries automatically (salary expense → bank payment)
- F&F settlement calculates pending salary, leave encashment, loan balance, gratuity in one step

### What Major Apps Are Missing
| Gap | Tally | Zoho People | SAP B1 | Odoo | ERPNext |
|---|---|---|---|---|---|
| Integrated with production/manufacturing context | No | No | Partial | Yes | Yes |
| F&F settlement auto-calculation | No | Yes | Yes | Yes | Yes |
| Loans deducted from payroll automatically | No | Yes | Yes | Yes | Yes |
| Payroll generates accounting entries automatically | Manual | Requires Zoho Books | Yes | Yes | Yes |

**Kinto gaps vs competitors:**
- No biometric device direct integration (attendance import is manual file upload)
- No statutory compliance filing exports (PF ECR challan, ESI challan, PT returns)
- No Form 16 PDF generation
- No shift roster management (scheduling who works which shift on which day)
- No performance appraisal module

---

## 9. Employee Self-Service (ESS) Portal

### What It Does
- Employees log in with a separate password set by the HR admin
- View their own payslips for all months
- Apply for leaves and track approval status
- View attendance records
- View loan balance and repayment schedule
- View and update basic profile details

### Advantages
- Reduces HR team workload — employees don't need to ask HR for payslips or leave balances
- Separate login system means employees don't see any company data outside their own profile
- HR admin controls who has ESS access and can enable/disable per employee

### What Major Apps Are Missing
| Gap | Tally | Zoho People | SAP B1 | Odoo | ERPNext |
|---|---|---|---|---|---|
| Self-service portal for employees | No | Yes (full-featured) | Yes | Yes | Yes |
| Separate access control per employee | No | Yes | Yes | Yes | Yes |

**Kinto gaps vs competitors:**
- No mobile app for ESS (web only)
- No push notifications for leave approval/rejection
- No document upload by employee (e.g., medical certificate for sick leave)
- Zoho People and Darwinbox have far more advanced ESS features

---

## 10. CRM — Lead Management

### What It Does
- Capture leads from any source (manual entry, WhatsApp, referral)
- Track lead status through a pipeline (New → Contacted → Qualified → Proposal → Won/Lost)
- Assign leads to sales officers
- Record follow-up notes and call logs per lead
- Convert won leads to customers / sales orders

### Advantages
- Sales officers can be the same people already in the system — no separate CRM user management
- Won leads can be directly converted to sales orders without re-entering customer details

### What Major Apps Are Missing
| Gap | Tally | Zoho CRM | SAP B1 | Odoo | ERPNext |
|---|---|---|---|---|---|
| Built-in lead pipeline | No | Yes (very advanced) | Yes | Yes | Yes |
| Lead to sales order conversion | No | Yes | Yes | Yes | Yes |

**Kinto gaps vs competitors (this module is early-stage):**
- No email integration (leads from email inbox)
- No web form / landing page lead capture
- No lead scoring or AI-based prioritisation
- No WhatsApp-to-lead automation
- Zoho CRM, HubSpot, and Salesforce are far more advanced here

---

## 11. MIS & Analytics

### What It Does
- **MIS Executive Dashboard** — top-level KPIs for management (revenue, production, inventory, cash)
- **MIS Production Analytics** — batch-wise yield, machine-wise output, production trends
- **MIS Inventory Intelligence** — slow-moving stock, fast-moving items, days-on-hand
- **MIS Sales Analysis** — customer-wise revenue, product-wise revenue, month-over-month
- **MIS Delivery Performance** — on-time delivery %, vehicle-wise delivery counts
- **MIS Cash Analytics** — cash inflow vs outflow, collection efficiency
- **MIS Financial Analytics** — P&L trend, gross margin by product line

### Advantages
- All MIS dashboards pull from live transactional data — no ETL or data export needed
- Executive can see a single screen with production, sales, inventory, and cash in one view

### What Major Apps Are Missing
| Gap | Tally | Zoho | SAP B1 | Odoo | ERPNext |
|---|---|---|---|---|---|
| Manufacturing + Finance + HR in one MIS view | No | No | With BI add-on | Partial | Partial |
| Zero configuration — works from day one | No | No | No | No | No |

**Kinto gaps vs competitors:**
- No custom report builder (reports are fixed templates)
- No data export to Excel/CSV from MIS dashboards
- No scheduled email reports to management
- No drill-down from KPI to underlying transactions

---

## 12. Expenses Management

### What It Does
- **Expense Vouchers** — record any business expense with category, vendor, amount, date
- **Expense Categories** — configurable categories (Travel, Office, Utilities, Repairs, etc.)
- **Monthly Expenses** — view all expenses aggregated by month and category
- **Cash Register** — track petty cash inflows and outflows with running balance
- **Cash Register Report** — daily/monthly petty cash summary

### Advantages
- Expense vouchers automatically post to the accounting ledger — no manual journal entry needed
- Cash register gives real-time petty cash balance without a physical cashbook

### What Major Apps Are Missing
| Gap | Tally | Zoho Expense | SAP B1 | Odoo | ERPNext |
|---|---|---|---|---|---|
| Expense auto-posts to accounting | Manual voucher | Requires Zoho Books | Yes | Yes | Yes |
| Petty cash register with running balance | Manual | No | Yes | Yes | Partial |

**Kinto gaps vs competitors:**
- No employee expense claim workflow (employee submits → manager approves → reimbursed)
- No receipt image upload / OCR for expense capture
- No credit card statement import and matching

---

## 13. Documents

### What It Does
- Upload and store any business document (contracts, licences, certificates, compliance docs)
- Organise by configurable document categories
- Set expiry dates on documents (e.g., FSSAI licence, pollution certificate)
- Automatic alerts before document expiry (WhatsApp + email notifications)

### Advantages
- Expiry alerts are sent automatically — no manual reminders or calendar entries needed
- Documents are tenant-scoped — each business's documents are isolated

### What Major Apps Are Missing
| Gap | Tally | Zoho | SAP B1 | Odoo | ERPNext |
|---|---|---|---|---|---|
| Document expiry alerts via WhatsApp | No | No | No | No | No |
| Business document repository built in | No | Partial | With DMS add-on | Yes | Partial |

**Kinto gaps vs competitors:**
- No version control (can't track document revisions)
- No document approval workflow
- No e-signature integration

---

## Summary: Where Kinto Stands Out vs Where It Falls Short

### Clear Differentiators (no major ERP does these out of the box)
1. **WhatsApp-based machine startup checklists** — operators use their personal WhatsApp, no app install
2. **Enforced gatepass-before-dispatch** — tamper-proof dispatch compliance
3. **Automatic FIFO across batches** — zero configuration, always correct
4. **Document expiry alerts via WhatsApp**
5. **Everything in one database** — production, dispatch, invoicing, accounting, HR all linked without integration middleware

### Where Major ERPs Are Ahead
| Area | Gap |
|---|---|
| GST compliance | No e-invoice (IRN), no GSTR auto-filing, no GSTR-2A matching |
| Accounting | No fixed assets, no depreciation, no multi-currency, no bank auto-reconciliation |
| Payroll | No statutory filing exports (PF ECR, ESI, PT), no Form 16 PDF, no biometric integration |
| Manufacturing | No Bill of Materials (BOM) standard costing, no work order management |
| CRM | Very early-stage vs Zoho CRM / Salesforce |
| Reporting | No custom report builder, no Excel export from dashboards |
| Mobile | No mobile app (web only) |
| Approvals | No multi-level approval workflows for PO, expense, or leave |
