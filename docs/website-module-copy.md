# Kinto Smart Ops — Website Copy: Modules, Automation & Interconnection

---

## The Core Difference

Most ERPs give you separate tools that you have to stitch together. Kinto Smart Ops is built as one connected system where **every action in one module automatically flows into every other module it touches** — with no manual re-entry, no exports, and no reconciliation work at the end of the month.

When a production batch is recorded, inventory updates. When an invoice is raised, the ledger updates. When salary is processed, accounting updates. When a document expires, an alert goes out on WhatsApp. Nothing waits for a person to carry the information from one place to another.

---

## What Makes It Genuinely Hard to Replicate

### 1. Interconnection Depth — One System, Not Bolted Modules

Most ERPs are built as separate products that share a login. Their inventory module talks to their accounting module through a sync job or an API call — which means delays, mismatches, and reconciliation work. Kinto Smart Ops is built on a single database, a single session, and a single accounting ledger. A production entry, a dispatch, and an invoice all write to the same database in the same transaction. There is no middleware, no nightly batch sync, no integration to maintain. When something happens in operations, accounting reflects it instantly — because they are the same system, not two systems talking to each other.

### 2. WhatsApp Compliance — An Advantage No Major ERP Has

Tally, Zoho, SAP, Odoo, and ERPNext do not offer this. Kinto Smart Ops is integrated with WhatsApp at the platform level. Operators receive automated startup messages at shift time. They complete machine checklists by replying on WhatsApp — their personal phone, no app to install, no training required. If an operator misses the checklist window, the supervisor gets an automatic WhatsApp alert. Every response is timestamped and stored as an audit record. This is not a third-party plugin. It is built into the system's core — the same WhatsApp infrastructure also sends maintenance due alerts, document expiry alerts, and payment reminders. One connected notification system across the entire platform.

### 3. GST-Native from the Ground Up — Not Retrofitted

Most international ERPs (SAP, Odoo, ERPNext) were built for global markets and had GST added later — as a configuration layer on top of a generic tax engine. Kinto Smart Ops was designed from day one for Indian tax compliance. CGST/SGST vs IGST is determined automatically based on buyer state — no manual selection. HSN codes are embedded in the product master. The gatepass workflow exists because Indian dispatch compliance requires a physical delivery challan before goods move. The Chart of Accounts is seeded with Indian-standard account groups. GST is not a feature added to the system — it is the system.

### 4. Zero Reconciliation Architecture — Books Are Always Current

In most businesses using disconnected tools, the accounts team spends 2–3 days every month reconciling the operations data with the books. Invoices raised in one system have to be entered again in Tally. Purchases received in the inventory tool need a voucher in the accounting software. Payroll processed in an HRMS needs to be journalised manually. In Kinto Smart Ops, every transaction — invoice, purchase receipt, expense voucher, payroll run, payment collected, production batch — posts its accounting journal entries automatically in the same moment it is created. There is no month-end catch-up. The Trial Balance, P&L, and Balance Sheet are accurate at any point during the month, not just after the accounts team has finished their work.

---

## Production & Inventory

**Headline:**
One entry. Five things happen automatically.

**Sub-headline:**
Record a production batch and watch your raw material stock fall, your finished goods stock rise, your scrap register update, your yield variance calculate, and your accounting post — all without touching anything else.

**How the automation works:**
When a production entry is saved, the system automatically:
1. Deducts the issued raw materials from inventory (FIFO — oldest batch consumed first, no manual selection)
2. Adds the finished goods quantity to inventory
3. Records any scrap generated as a separate inventory entry
4. Posts the corresponding cost journal entries to your accounting ledger
5. Calculates the yield variance (expected output vs actual output) and flags it if outside tolerance

**How it connects to other modules:**
- Raw material stock levels feed the **Purchase Orders** module — you can see what needs to be reordered before it runs out
- Finished goods stock feeds the **Dispatch & Gatepass** module — you can only dispatch what is actually in stock
- Production cost journals flow directly into **Accounting & Ledger** — your P&L reflects production costs in real time
- Machine-wise production can be preceded by **WhatsApp Checklist** completion — operators confirm startup checks before a batch begins
- Yield variance data feeds the **MIS Analytics** module — management sees production efficiency on their dashboard

**What other apps make you do manually:**
- Separate stock adjustment entries after production
- Manual journal entries for raw material cost
- End-of-month reconciliation between the production register and the inventory register
- Separate scrap write-off entries
- Export data to Excel to calculate yield variance

---

## Purchase Orders

**Headline:**
Raise a PO. Everything else follows automatically.

**Sub-headline:**
From the moment you create a purchase order to the moment goods arrive and stock is updated, the system handles every step. No separate GRN entry. No separate inventory update. No manual accounting.

**How the automation works:**
When a Goods Receipt Note (GRN) is confirmed against a PO:
1. Inventory is updated immediately — the received quantity is added to stock under the correct batch
2. The PO status updates automatically (partial or fully received)
3. A purchase liability is posted to the accounting ledger
4. Vendor outstanding balance increases automatically

When a purchase return is raised:
1. Stock reduces immediately
2. A vendor debit note is created
3. The accounting reversal posts automatically

**How it connects to other modules:**
- Received raw materials go directly into **Production & Inventory** — they're available for issuance the moment they're received
- Purchase liabilities post automatically to **Accounting & Ledger** — your creditor balances are always live
- Vendor payment records in **Accounting** reduce the purchase outstanding automatically
- Purchase spend data feeds **MIS Analytics** — management sees vendor-wise spend and purchase trends
- Vendor documents (quality certificates, agreements) are stored in the **Documents** module and linked to the vendor

**What other apps make you do manually:**
- Separate inventory receipt entry after raising a GRN
- Manual accounting entries for purchase and liability
- Separate credit note or debit note creation after a return
- Reconciling purchase register with inventory register at month end

---

## Gatepasses & Dispatch

**Headline:**
The system ensures no goods leave without a paper trail — and it's not a setting you can turn off.

**Sub-headline:**
Dispatch is enforced, not optional. A gatepass cannot exist without an invoice. An invoice cannot exist without a gatepass. Every truck that leaves is accounted for — automatically and permanently.

**How the automation works:**
When a gatepass is created and confirmed:
1. The linked invoice is marked as dispatched automatically
2. Finished goods stock is deducted from inventory immediately
3. A delivery challan is generated for printing — no separate document to prepare
4. Dispatch tracking record is created (vehicle, driver, transporter, time)

When a sales return is received:
1. Goods are re-added to finished goods inventory automatically
2. A credit note is triggered in the **Invoicing** module
3. The accounting reversal posts automatically

**How it connects to other modules:**
- Gatepass pulls stock from **Production & Inventory** — you can only dispatch goods that physically exist in stock
- Gatepass is mandatory before an **Invoice** is raised — the workflow enforces this, no workaround exists
- Dispatch tracking data feeds **MIS Analytics** — delivery performance metrics are always live
- Sales returns link back to the original **Invoice** and reverse both stock and accounting automatically

**What other apps make you do manually:**
- No other mainstream ERP enforces gatepass before invoice as a system-level constraint — it's always a configurable workflow, meaning it can be bypassed
- Separate stock deduction after dispatch
- Separate accounting entry for cost of goods dispatched
- Manual delivery challan preparation

---

## Sales Invoicing & GST

**Headline:**
Raise an invoice. Your books update. Your outstanding updates. Your GST liability updates. All instantly.

**Sub-headline:**
An invoice in Kinto is not just a document sent to a customer. It is a trigger that automatically updates five different parts of your business simultaneously.

**How the automation works:**
When an invoice is saved:
1. The customer's outstanding balance increases automatically
2. The GST liability account (CGST/SGST or IGST, calculated by buyer state) is posted automatically
3. The sales revenue account is credited automatically in the ledger
4. The invoice appears in the pending payments dashboard immediately
5. If a customer advance was recorded earlier, it is automatically adjusted against this invoice

**How it connects to other modules:**
- Invoice is created only after a **Gatepass** is confirmed — dispatch and billing are always in sync
- Revenue posts automatically to **Accounting & Ledger** — P&L is always current
- Outstanding balances feed the **MIS Cash Analytics** dashboard — collections visibility is live
- Customer advances recorded in **Accounting** are auto-adjusted when an invoice is raised
- Payment collection records in **Accounting** reduce the invoice outstanding automatically
- Credit notes from **Dispatch** sales returns reverse the invoice accounting automatically

**What other apps make you do manually:**
- Manual accounting entry after raising an invoice (Tally users know this well)
- Manually selecting IGST vs CGST/SGST based on buyer state
- Manually tracking customer advances and adjusting them against invoices
- Running a separate aging report from a different module

---

## Accounting & Ledger

**Headline:**
Your books maintain themselves. Every transaction, from every module, posts automatically.

**Sub-headline:**
Kinto's accounting module doesn't wait for your accountant to enter data. Every sale, purchase, expense, salary, and payment made anywhere in the system posts the correct double-entry journal automatically.

**How the automation works:**
Every action across all modules triggers automatic journal entries:

| Action in any module | Automatic accounting entry |
|---|---|
| Sales invoice raised | Debit: Customer A/C — Credit: Sales + GST Liability |
| Purchase GRN received | Debit: Inventory / Purchase A/C — Credit: Vendor A/C |
| Expense voucher saved | Debit: Expense Category A/C — Credit: Cash / Bank |
| Salary processed | Debit: Salary Expense — Credit: Salary Payable / Bank |
| Payment received from customer | Debit: Bank — Credit: Customer A/C |
| Payment made to vendor | Debit: Vendor A/C — Credit: Bank |
| Sales return received | Full reversal of original invoice entry |

**How it connects to other modules:**
- Every module feeds accounting automatically — **Production, Purchases, Invoicing, Expenses, Payroll, Gatepasses** — none require manual journal entries
- Trial Balance, P&L, Balance Sheet, and Cash Flow Statement are always live because journals post in real time
- Aging report is generated directly from **Invoicing** outstanding data — no separate ledger reconciliation
- Budget vs Actual compares your set budgets against real expenses posted from **Expenses** and **Payroll**
- Bank statements can be reconciled against journals auto-posted from payment entries

**What other apps make you do manually:**
- Tally: every invoice, purchase, and payment requires a manual voucher entry — nothing is automatic
- Zoho Books: accounting is separate from manufacturing — production costs require manual entries
- Most SME software: accounting and operations are separate tools that need to be reconciled

---

## Preventive Maintenance

**Headline:**
Maintenance schedules run themselves. Stock deducts when parts are used. Alerts go out automatically.

**Sub-headline:**
Set up your maintenance plan once. The system reminds technicians, tracks completion, deducts spare parts from stock, and keeps the history — without anyone managing it manually.

**How the automation works:**
When a maintenance plan is configured:
1. PM tasks are scheduled automatically based on frequency (daily, weekly, monthly)
2. WhatsApp reminders go out automatically to the assigned technician when a task is due
3. When PM execution is recorded, spare parts used are deducted from spare parts stock automatically
4. PM history is updated automatically — always available for audit

**How it connects to other modules:**
- Spare parts inventory links to **Purchase Orders** — when spare parts stock runs low, you can raise a PO directly
- Spare parts consumption posts cost entries to **Accounting & Ledger** automatically
- Machine-level maintenance data feeds **MIS Analytics** — management sees downtime and maintenance frequency
- **WhatsApp** module triggers reminders for PM due dates — the same WhatsApp infrastructure used for shift checklists
- PM history per machine is accessible alongside machine-wise production data from the **Production** module

**What other apps make you do manually:**
- Most SME ERPs have no preventive maintenance module at all
- Spare parts consumption requires a separate inventory adjustment entry
- Technicians are reminded via phone calls or paper schedules — no automation
- PM history lives in a physical logbook, not in the system

---

## WhatsApp Checklists & Machine Startup

**Headline:**
Compliance happens on WhatsApp. Automatically. Without a single app download.

**Sub-headline:**
At shift start time, every operator gets a WhatsApp message. They respond to complete their checklist. If they don't respond, the supervisor is automatically notified. No one manages this manually.

**How the automation works:**
1. At the configured shift start time, WhatsApp messages go out automatically to assigned operators
2. Operators reply to complete each checklist item — on their personal WhatsApp, no app install
3. If all items are confirmed, the machine startup is recorded as compliant automatically
4. If the operator does not respond within the time window, a WhatsApp alert goes to the supervisor automatically
5. Completion status is recorded with timestamp and operator identity — audit trail is built automatically

**How it connects to other modules:**
- Machine startup compliance links to the **Production** module — a machine that fails its startup check cannot be used to record a production entry until cleared
- Completion analytics feed the **MIS Analytics** module — management sees compliance rates per shift and per machine
- Missed checklist alerts use the same WhatsApp infrastructure as **Document expiry alerts** and **Maintenance due reminders** — one connected notification system
- Checklist assignments link to the **Maintenance** module — machines with overdue PM tasks can be flagged before startup confirmation

**What other apps make you do manually:**
- No mainstream ERP offers WhatsApp-based operator compliance — this capability does not exist in Tally, Zoho, SAP, Odoo, or ERPNext
- Shift startup compliance is typically managed with paper checklists or phone calls
- Missed compliance is discovered after the fact, not in real time

---

## HR & Payroll

**Headline:**
Attendance flows into payroll. Payroll flows into accounting. One system. No bridges. No reconciliation.

**Sub-headline:**
When you mark attendance, it feeds payroll. When you approve a leave, it adjusts payroll. When you run payroll, it posts to accounting. When you disburse salary, it updates the bank ledger. Every step triggers the next.

**How the automation works:**
The HR chain reaction:

1. **Attendance marked** → working days calculated per employee for the month
2. **Leaves approved** → leave days deducted from working days automatically, leave balance updated
3. **Loan EMIs** → deducted from gross salary automatically based on loan schedule
4. **Payroll run** → PF, ESI, Professional Tax calculated automatically based on salary structure; net pay computed
5. **Payroll processed** → salary expense and liability posted to **Accounting** automatically
6. **Salary disbursed** → bank ledger updated automatically

When an employee exits:
- F&F settlement calculates pending salary, leave encashment, loan outstanding, and gratuity automatically in one step

**How it connects to other modules:**
- Salary journals post automatically to **Accounting & Ledger** — no manual payroll accounting entry
- Salary expense flows into **MIS Financial Analytics** — labour cost is visible on the management dashboard
- Employee documents (offer letter, ID proof, PF form) are stored in the **Documents** module linked to the employee record
- Leave balances are visible to employees on the **ESS Portal** in real time — no HR intervention needed
- Recruitment → selected candidate converts to employee in **HR Master** directly — no re-entry

**What other apps make you do manually:**
- Tally: payroll is completely manual — attendance, salary calculation, and accounting all require separate entries
- Zoho People + Zoho Books: two separate products that need to be integrated and synced
- Most standalone HRMS tools: payroll posting to accounting requires a manual export and import

---

## Employee Self-Service (ESS) Portal

**Headline:**
Employees get their own window into the system. HR gets their time back.

**Sub-headline:**
Every payslip, every attendance record, every leave balance, every loan repayment schedule — available to the employee directly, updated automatically, no HR team involvement.

**How the automation works:**
- Payslips appear in the ESS portal the moment payroll is processed — no separate sharing or PDF sending
- Leave balances update the moment a leave is approved — employees see the correct balance in real time
- Loan repayment schedules update every month as EMIs are deducted — employees always see the accurate outstanding amount
- Attendance records reflect the same data HR sees — no separate system for employees

**How it connects to other modules:**
- Payslip data comes directly from **Payroll** — the same payslip HR sees is what the employee sees
- Leave balance comes from **Leave Management** — real-time, never stale
- Loan data comes from **HR Loans & Advances** — repayment schedule is live
- Attendance data is the same record used for **Payroll processing** — one source of truth

---

## CRM — Lead Management

**Headline:**
Win a lead. Convert it to a sales order. Raise an invoice. All in the same system, with zero re-entry.

**Sub-headline:**
Your sales pipeline and your operations system are not two separate tools. A won deal flows directly into dispatch and billing — no copy-paste, no handover email, no data loss.

**How the automation works:**
- Lead is moved to "Won" → system prompts conversion to customer record and sales order
- Customer details flow automatically into the sales order — no re-entry
- Sales order flows into **Gatepass & Dispatch** when goods are ready to ship
- Invoice is raised from the same sales order — amounts, items, and customer details are pre-filled

**How it connects to other modules:**
- Won lead converts directly to **Sales Orders** — pipeline to operations in one click
- Sales order triggers **Dispatch** and **Invoicing** — the commercial journey is one connected flow
- Customer outstanding from **Invoicing** is visible alongside lead history — sales officers see if a customer has unpaid invoices before pursuing the next deal

---

## MIS & Analytics

**Headline:**
Every number, from every module, in one dashboard — live.

**Sub-headline:**
MIS in Kinto is not a report you run at month end. It is a live view of every number from every module, aggregated and presented for management — updated the moment any transaction happens anywhere.

**How the automation works:**
- Every transaction across every module feeds MIS automatically — no data entry, no export, no scheduled sync
- Production output updates the production analytics chart the moment a batch is saved
- Invoice raised updates revenue figures immediately
- Salary processed updates the labour cost metric instantly
- Checklist completed or missed updates the compliance rate dashboard in real time

**How it connects to other modules:**
MIS is the only module that receives data from every other module simultaneously:

| MIS Dashboard | Fed automatically by |
|---|---|
| Executive Dashboard | Production + Invoicing + Inventory + Accounting |
| Production Analytics | Production entries + Reconciliation data |
| Inventory Intelligence | Production + Purchase GRNs + Dispatch |
| Sales Analysis | Invoicing + Sales Orders + CRM |
| Delivery Performance | Gatepass + Dispatch tracking |
| Cash Analytics | Payments + Customer outstanding + Accounting |
| Financial Analytics | Accounting — P&L and margin data |
| HR & Payroll Summary | Payroll + Attendance + Headcount |

**What other apps make you do manually:**
- Export data from operations to a BI tool (Power BI, Tableau) for management dashboards
- Run separate reports from accounting and operations and consolidate manually
- Month-end MIS preparation is a 2–3 day exercise in most businesses using disconnected tools

---

## Expenses Management

**Headline:**
Record an expense. The right account gets debited. Automatically.

**Sub-headline:**
Every expense voucher posts to your accounting ledger the moment it is saved. No manual journal entry. No month-end catch-up.

**How the automation works:**
When an expense voucher is saved:
1. The correct expense account is debited automatically (based on expense category)
2. The payment account (cash or bank) is credited automatically
3. The expense appears in the P&L immediately — no waiting
4. Petty cash register balance updates automatically if paid from petty cash

**How it connects to other modules:**
- Expense journals post automatically to **Accounting & Ledger** — P&L reflects actual costs in real time
- Expense categories feed **MIS Analytics** — management sees cost breakdown by category on the dashboard
- Petty cash balance is always live — no separate cashbook needed
- Monthly expense totals feed **Budget vs Actual** in accounting — overspending is flagged automatically

---

## Documents

**Headline:**
Upload a document. Set an expiry date. Get a WhatsApp alert before it lapses. Automatically.

**Sub-headline:**
Your FSSAI licence, factory licence, pollution certificate, and insurance policy are all in one place. The system watches their expiry dates and alerts you — before they become a compliance problem.

**How the automation works:**
- Document expiry dates are monitored automatically every day
- When a document is approaching expiry (configurable days in advance), a WhatsApp alert is sent automatically to the admin
- If the document lapses, a second alert is triggered
- No manual calendar reminders. No dependency on someone remembering.

**How it connects to other modules:**
- The same WhatsApp notification infrastructure used by **Maintenance reminders** and **Checklist alerts** sends document expiry alerts — one unified alert system
- Vendor documents (quality certificates, GST registration) are stored in **Documents** and linked to vendor records in **Purchase Orders**
- Employee documents (ID proof, offer letter, PF form) are stored in **Documents** and linked to employee records in **HR**

---

## The Interconnection Map

Here is how every module talks to every other module — automatically, without any manual data transfer:

```
Recruitment ──────────────────────────────────────► HR Master (Employee Record)
                                                              │
WhatsApp Checklist ──────► Machine Startup Compliance        │
        │                           │                         ▼
        │                           ▼                   Attendance
        │                   Production Entry ◄──── Raw Material Stock
        │                           │                         │
        │                           ▼                         ▼
        │                   Finished Goods Stock        Leave Management
        │                           │                         │
        ▼                           ▼                         ▼
Maintenance ──── Spare Parts Stock   Gatepass & Dispatch   Payroll Processing
        │                │                   │                 │
        ▼                ▼                   ▼                 ▼
Purchase Orders ──► Inventory ──────► Sales Invoice ──► Accounting & Ledger
        │                                   │                 │
        ▼                                   ▼                 ▼
Vendor Analytics                   Pending Payments       MIS Analytics
                                            │                 │
                                            ▼                 ▼
                                    Customer Advances    P&L / Balance Sheet
                                            │
                                            ▼
                                    CRM Lead ──► Sales Order ──► Gatepass
```

**Every arrow is automatic. No manual data transfer. No exports. No re-entry.**
