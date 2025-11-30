# KINTO Smart Ops - Feature Documentation

**Version:** 1.0  
**Last Updated:** November 2024  
**Company:** Inmoisure Private Limited  
**GSTIN:** 37AAHCI5047B1ZR

---

## Table of Contents

1. [Dashboard & Analytics](#1-dashboard--analytics)
2. [Master Data Management](#2-master-data-management)
3. [Production & Inventory](#3-production--inventory)
4. [Sales & Invoicing](#4-sales--invoicing)
5. [Dispatch & Logistics](#5-dispatch--logistics)
6. [Finance & Payments](#6-finance--payments)
7. [Returns & Adjustments](#7-returns--adjustments)
8. [Cash & Expenses](#8-cash--expenses)
9. [Quality & Checklists](#9-quality--checklists)
10. [Document Management](#10-document-management)
11. [Reports](#11-reports)

---

# 1. Dashboard & Analytics

## 1.1 Overview Dashboard

### What is this?
The main dashboard provides a quick summary of your business operations - sales, production, pending tasks, and key metrics.

### When to use?
- Start of every working day to check business status
- Quick overview of pending items
- Monitor key performance indicators

### How to access?
| Navigation | URL |
|------------|-----|
| **Sidebar** → Dashboard & Analytics → **Overview** | `/` |

### Screen Elements
| Element | Description |
|---------|-------------|
| Sales Summary Card | Today's sales, monthly total |
| Pending Payments Card | Outstanding amount from customers |
| Production Stats | Today's production numbers |
| Recent Invoices | Latest 5 invoices created |
| Quick Actions | Buttons for common tasks |

---

## 1.2 Sales Dashboard

### What is this?
Detailed sales analytics with charts, trends, and performance metrics.

### How to access?
| Navigation | URL |
|------------|-----|
| **Sidebar** → Dashboard & Analytics → **Sales Dashboard** | `/` |

### Features
- Monthly sales trend chart
- Top customers by revenue
- Product-wise sales breakdown
- Payment collection status

---

## 1.3 Vendor Analytics

### What is this?
Analyze vendor performance, purchase patterns, and relationship metrics.

### How to access?
| Navigation | URL |
|------------|-----|
| **Sidebar** → Dashboard & Analytics → **Vendor Analytics** | `/vendor-analytics` |

### Screen Elements
| Element | Description |
|---------|-------------|
| Vendor Classification | Tier-wise vendor breakdown |
| Top Vendors | Highest revenue vendors |
| Outstanding Analysis | Vendors with pending payments |

---

# 2. Master Data Management

## 2.1 Product Master

### What is this?
Central repository for all products you manufacture or sell. Includes product details, pricing, Bill of Materials (BOM), and inventory settings.

### When to use?
- Adding new products to your catalog
- Updating product prices or details
- Setting up BOM for manufacturing
- Managing product categories

### How to access?
| Navigation | URL |
|------------|-----|
| **Sidebar** → Production & Inventory → **Product Master** | `/` (Products tab) |

### Screen Elements
| Element | Type | Description |
|---------|------|-------------|
| "Add Product" | Button | Opens form to create new product |
| Search bar | Input | Filter products by name/code |
| Product table | Table | List of all products with details |
| Edit icon | Button | Modify existing product |
| View BOM | Button | See Bill of Materials |

### Step-by-Step: Add New Product

1. **Navigate:** Sidebar → Production & Inventory → Product Master
2. **Click:** "Add Product" button (top right)
3. **Fill Form:**
   | Field | Required | Description |
   |-------|----------|-------------|
   | Product Code | Yes | Unique identifier (e.g., PROD-001) |
   | Product Name | Yes | Display name |
   | Category | Yes | Select from dropdown |
   | Type | Yes | Select product type |
   | Unit of Measurement | Yes | Select UOM |
   | HSN Code | Yes | GST HSN code |
   | GST Rate | Yes | Tax percentage |
   | Selling Price | Yes | Default selling price |
4. **Click:** "Save" button
5. **Result:** Product appears in the list

### Tips
> **Tip:** Set up Categories and Types before adding products for better organization.

> **Warning:** HSN Code and GST Rate are required for invoice generation.

---

## 2.2 Product Categories

### What is this?
Organize products into logical groups (e.g., Electronics, Chemicals, Packaging).

### How to access?
| Navigation | URL |
|------------|-----|
| **Sidebar** → Production & Inventory → **Product Categories** | `/` (Categories tab) |

### Step-by-Step: Add Category
1. Click "Add Category" button
2. Enter Category Name and Code
3. Optionally add description
4. Click "Save"

---

## 2.3 Product Types

### What is this?
Sub-classification within categories (e.g., under Electronics: Sensors, Controllers, Displays).

### How to access?
| Navigation | URL |
|------------|-----|
| **Sidebar** → Production & Inventory → **Product Types** | `/` (Types tab) |

---

## 2.4 Raw Materials

### What is this?
Materials used in production. Tracks inventory, conversion methods, and loss percentages.

### How to access?
| Navigation | URL |
|------------|-----|
| **Sidebar** → Production & Inventory → **Raw Materials** | `/` (Raw Materials tab) |

### Key Fields
| Field | Description |
|-------|-------------|
| Material Code | Unique identifier |
| Material Name | Display name |
| UOM | Base unit of measurement |
| Conversion Factor | For unit conversions |
| Loss Percentage | Expected wastage during production |
| Reorder Level | Minimum stock alert threshold |

---

## 2.5 Vendor Master

### What is this?
Database of all your customers/buyers. Stores contact details, GST information, and classification.

### How to access?
| Navigation | URL |
|------------|-----|
| **Sidebar** → Master Data → **Vendor Master** | `/vendor-management` |

### Screen Elements
| Element | Type | Description |
|---------|------|-------------|
| "Add Vendor" | Button | Create new vendor |
| Search | Input | Find vendor by name/code |
| Filter by Type | Dropdown | Filter by vendor classification |
| Vendor table | Table | List with all vendor details |
| Actions | Buttons | Edit, View History |

### Step-by-Step: Add New Vendor

1. **Navigate:** Sidebar → Master Data → Vendor Master
2. **Click:** "Add Vendor" button
3. **Fill Required Fields:**
   | Field | Required | Description |
   |-------|----------|-------------|
   | Vendor Code | Yes | Auto-generated or manual |
   | Vendor Name | Yes | Business name |
   | Mobile Number | Yes | Primary contact |
   | GSTIN | No | GST Number (15 digits) |
   | Address | Yes | Full address |
   | City, State | Yes | Location |
4. **Assign Vendor Types:** Select applicable types (Retailer, Distributor, etc.)
5. **Click:** "Save"

### Vendor Classification (3-Tier)
| Tier | Description | Example |
|------|-------------|---------|
| Primary | Direct large buyers | Distributors |
| Secondary | Medium-sized buyers | Retailers |
| Tertiary | Small/occasional buyers | Walk-in customers |

---

## 2.6 Vendor Types

### What is this?
Categories for classifying vendors based on business relationship.

### How to access?
| Navigation | URL |
|------------|-----|
| **Sidebar** → Master Data → **Vendor Types** | `/vendor-types` |

---

## 2.7 Unit of Measurement (UOM)

### What is this?
Standard units for measuring products and materials (Kg, Ltr, Pcs, Box, etc.).

### How to access?
| Navigation | URL |
|------------|-----|
| **Sidebar** → Master Data → **Unit of Measurement** | `/` (UOM tab) |

---

# 3. Production & Inventory

## 3.1 Raw Material Issuance

### What is this?
Issue raw materials from inventory to production floor. Tracks what materials are used for which production batch.

### When to use?
- Before starting production
- When production floor needs materials
- Tracking material consumption

### How to access?
| Navigation | URL |
|------------|-----|
| **Sidebar** → Production & Inventory → **Raw Material Issuance** | `/` (Issuance tab) |

### Step-by-Step: Issue Materials

1. **Navigate:** Sidebar → Production & Inventory → Raw Material Issuance
2. **Click:** "New Issuance" button
3. **Fill Header:**
   | Field | Description |
   |-------|-------------|
   | Issue Date | Date of issuance |
   | Issued To | Production line/person |
   | Remarks | Any notes |
4. **Add Items:**
   - Click "Add Item"
   - Select Raw Material
   - Enter Quantity
   - System shows available stock
5. **Click:** "Save & Issue"
6. **Result:** Inventory reduced, issuance record created

> **Important:** System prevents issuing more than available stock.

---

## 3.2 Production Entries

### What is this?
Record daily production output. Links to BOM for automatic material consumption calculation.

### How to access?
| Navigation | URL |
|------------|-----|
| **Sidebar** → Production & Inventory → **Production Entries** | `/` (Production tab) |

### Step-by-Step: Record Production

1. **Navigate:** Production Entries
2. **Click:** "New Entry"
3. **Select Product** (with BOM)
4. **Enter Production Quantity**
5. **System Calculates:**
   - Expected material consumption (from BOM)
   - Actual vs Expected variance
6. **Enter Actual Materials Used** (if different)
7. **Click:** "Save"

### BOM Variance Analysis
| Variance | Meaning | Action |
|----------|---------|--------|
| Under 5% | Normal | No action |
| 5-10% | Warning | Review process |
| Over 10% | Alert | Investigate wastage |

---

## 3.3 Production Reconciliation

### What is this?
End-of-day reconciliation comparing expected vs actual production and material usage.

### How to access?
| Navigation | URL |
|------------|-----|
| **Sidebar** → Production & Inventory → **Production Reconciliation** | `/` (Reconciliation tab) |

### When to use?
- End of each production day
- Before closing inventory for the day
- Identifying production issues

---

## 3.4 Finished Goods

### What is this?
Inventory of completed products ready for sale. Tracks quality-approved stock.

### How to access?
| Navigation | URL |
|------------|-----|
| **Sidebar** → Production & Inventory → **Finished Goods** | `/` (Finished Goods tab) |

### Key Points
- Only quality-approved products appear here
- Stock reduces when Gatepass is created (not Invoice)
- Tracks batch numbers for traceability

---

# 4. Sales & Invoicing

## 4.1 Sales Invoices

### What is this?
Create GST-compliant invoices for customers. Includes company details, buyer information, item details, taxes, and payment terms.

### When to use?
- When customer places an order
- After goods are ready for dispatch
- For billing and payment collection

### How to access?
| Navigation | URL |
|------------|-----|
| **Sidebar** → Finance & Sales → **Sales Invoices** | `/` (Invoices tab) |

### Screen Elements
| Element | Type | Description |
|---------|------|-------------|
| "New Invoice" | Button | Create new invoice |
| Search | Input | Find by invoice number/vendor |
| Filter by Status | Dropdown | Draft, Paid, Partial, Unpaid |
| Invoice table | Table | List of all invoices |
| View | Button | Open invoice details |
| Print | Button | Generate PDF |

### Step-by-Step: Create Invoice

1. **Navigate:** Sidebar → Finance & Sales → Sales Invoices
2. **Click:** "New Invoice" button
3. **Select Template:** Choose invoice template
4. **Select Buyer:**
   - Search and select vendor
   - Buyer details auto-populate (GST, Address)
5. **Add Invoice Items:**
   | Field | Description |
   |-------|-------------|
   | Product | Select from catalog |
   | Quantity | Number of units |
   | Rate | Per unit price |
   | Discount | Optional discount |
   | GST | Auto-calculated |
6. **Review Totals:**
   - Subtotal
   - CGST + SGST (or IGST)
   - Grand Total
7. **Add Terms:** Payment terms, notes
8. **Click:** "Save" or "Save & Print"

### Invoice Number Format
`INV-YYYY-NNNN` (e.g., INV-2024-0001)

### Invoice Status Flow
```
Draft → Saved → Gatepass Created → Dispatched → Delivered → Paid
```

> **Important:** Once Gatepass is created, Invoice cannot be edited. Use Cancel & Reissue or Credit Note.

---

## 4.2 Invoice Detail Page

### What is this?
Complete view of a single invoice with all details, payment history, and available actions.

### How to access?
| Navigation | URL |
|------------|-----|
| Click any invoice → **View** button | `/invoice/:id` |

### Screen Elements
| Element | Description |
|---------|-------------|
| Invoice Header | Number, date, status |
| Buyer Details | Name, GST, address |
| Item Table | Products, quantities, amounts |
| Tax Summary | GST breakdown |
| Payment History | Received payments |
| QR Code | UPI payment QR |
| Action Buttons | Print, Create Gatepass, Cancel |

### Available Actions
| Action | When Available | What it Does |
|--------|----------------|--------------|
| Create Gatepass | No gatepass exists | Creates dispatch document |
| Print | Always | Generate PDF |
| Cancel & Reissue | Same month, no gatepass | Cancels and creates new |
| Create Credit Note | After gatepass | For adjustments |

---

## 4.3 Cancel & Reissue (Same Month)

### What is this?
Cancel an incorrect invoice and create a corrected one. Only allowed for current month invoices.

### When to use?
- Wrong quantity or rate
- Wrong buyer selected
- Any error in current month invoice

### GST Rule
| Invoice Month | Correction Method |
|---------------|-------------------|
| Current Month | Cancel & Reissue |
| Previous Month | Credit Note (reduction) or Debit Note (increase) |

### Step-by-Step: Cancel & Reissue

1. **Open Invoice:** Click on invoice to view details
2. **Click:** "Cancel & Reissue" button
3. **Enter Reason:** Why cancelling (required)
4. **Confirm:** Click "Yes, Cancel"
5. **System Does:**
   - Marks original as "Cancelled"
   - Creates new invoice with next number
   - Opens new invoice for editing
6. **Edit:** Make corrections
7. **Save:** New invoice is active

> **Warning:** Cancelled invoices cannot be restored. They appear in Cancelled Invoices Report.

---

# 5. Dispatch & Logistics

## 5.1 Gatepasses

### What is this?
Document authorizing goods to leave the premises. Links to invoice and triggers inventory deduction.

### When to use?
- Goods are packed and ready to ship
- Driver is ready for pickup
- Need to track what left the warehouse

### How to access?
| Navigation | URL |
|------------|-----|
| **Sidebar** → Dispatch & Logistics → **Gatepasses** | `/` (Gatepasses tab) |

### Step-by-Step: Create Gatepass

1. **From Invoice:**
   - Open Invoice Detail page
   - Click "Create Gatepass" button
2. **Or from Gatepasses:**
   - Click "New Gatepass"
   - Select Invoice
3. **Fill Details:**
   | Field | Description |
   |-------|-------------|
   | Vehicle Number | Transport vehicle |
   | Driver Name | Driver's name |
   | Driver Phone | Contact number |
   | Transporter | Transport company (optional) |
4. **Verify Items:** Check quantities
5. **Click:** "Create Gatepass"
6. **Result:** 
   - Gatepass number generated
   - Inventory deducted
   - Ready for dispatch

> **Important:** Inventory is reduced when Gatepass is created, NOT when Invoice is created.

---

## 5.2 Dispatch Tracking

### What is this?
Track the journey of goods from warehouse to customer delivery with 5-stage workflow.

### How to access?
| Navigation | URL |
|------------|-----|
| **Sidebar** → Dispatch & Logistics → **Dispatch Tracking** | `/dispatch-tracking` |

### 5-Stage Workflow

| Stage | Status | Who Updates | Description |
|-------|--------|-------------|-------------|
| 1 | Invoice Created | Auto | Invoice saved |
| 2 | Gatepass Created | Warehouse | Goods packed, gatepass issued |
| 3 | Dispatched | Logistics | Vehicle left premises |
| 4 | In Transit | System | Goods in transport |
| 5 | Delivered (POD) | Driver/Customer | Proof of delivery captured |

### Screen Elements
| Element | Description |
|---------|-------------|
| Status Filter | Filter by dispatch stage |
| Search | Find by invoice/gatepass number |
| Tracking Table | List with current status |
| Update Status | Button to move to next stage |
| POD Upload | Capture delivery proof |

### Proof of Delivery (POD)
- Upload delivery photo
- Capture digital signature
- Record receiver name
- Note delivery time

---

# 6. Finance & Payments

## 6.1 Vendor History

### What is this?
Complete transaction history with a vendor showing all invoices, payments, credit notes, debit notes, and running balance.

### When to use?
- Check how much a customer owes
- Review transaction history
- Reconcile accounts
- Customer balance enquiry

### How to access?
| Navigation | URL |
|------------|-----|
| **Sidebar** → Finance & Sales → **Vendor History** | `/vendor-history` |
| Click vendor row → View details | `/vendor-history/:vendorId` |

### List View Screen Elements
| Element | Description |
|---------|-------------|
| Summary Cards | Total Vendors, Invoiced, Received, Outstanding |
| Search | Find vendor by name |
| Vendor Table | All vendors with balances |
| View Button | Open detailed ledger |

### Detail View Screen Elements
| Element | Description |
|---------|-------------|
| Vendor Info | Code, GST, contact, address |
| Summary Cards | Total Invoiced, Payments, Credits, Debits, Balance |
| Filter | By transaction type |
| Ledger Table | Chronological transactions with running balance |

### Ledger Entry Types
| Type | Debit (Increases Balance) | Credit (Decreases Balance) |
|------|---------------------------|----------------------------|
| Invoice | Invoice Amount | - |
| Payment | - | Payment Received |
| Credit Note | - | Reduction Amount |
| Debit Note | Increase Amount | - |

### Balance Calculation
```
Current Balance = Total Invoiced + Debit Notes - Credit Notes - Payments Received
```

---

## 6.2 Pending Payments

### What is this?
Dashboard showing all outstanding amounts from customers, sorted by age and amount.

### How to access?
| Navigation | URL |
|------------|-----|
| **Sidebar** → Finance & Sales → **Pending Payments** | `/pending-payments` |

### Screen Elements
| Element | Description |
|---------|-------------|
| Total Outstanding | Sum of all pending amounts |
| Aging Analysis | Breakdown by days overdue |
| Vendor List | Customers with pending amounts |
| Invoice Details | Expand to see which invoices are pending |

---

## 6.3 Payment Management

### What is this?
Record and manage payments received from customers. Allocate payments to specific invoices.

### How to access?
| Navigation | URL |
|------------|-----|
| **Sidebar** → Finance & Sales → **Payment Management** | `/payment-management` |

### Step-by-Step: Record Payment

1. **Navigate:** Payment Management
2. **Click:** "Record Payment"
3. **Select Vendor**
4. **Enter Payment Details:**
   | Field | Description |
   |-------|-------------|
   | Payment Date | When received |
   | Amount | Payment amount |
   | Payment Mode | Cash/Bank/UPI/Cheque |
   | Reference | Cheque no./UTR number |
5. **Allocate to Invoices:**
   - System shows unpaid invoices
   - Auto-allocates to oldest first (FIFO)
   - Or manually select invoices
6. **Click:** "Save Payment"

### FIFO Allocation
Payments are automatically applied to the oldest unpaid invoices first, following First-In-First-Out principle.

---

## 6.4 Credit Notes

### What is this?
Document to reduce invoice amount after it's been issued. Used for returns, price corrections, or discounts.

### When to use?
- Customer returned goods (via Sales Return)
- Price reduction agreed after invoice
- Discount not applied originally
- Damaged goods compensation

### How to access?
| Navigation | URL |
|------------|-----|
| **Sidebar** → Finance & Sales → **Credit Notes** | `/credit-notes` |

### GST Rules
| Scenario | Action |
|----------|--------|
| Same month as invoice | Credit Note allowed |
| Previous month invoice | Credit Note required (not Cancel & Reissue) |

### Credit Note Sources
| Source | How Created |
|--------|-------------|
| Sales Return | Auto-generated after inspection |
| Manual | Admin creates for price adjustments |
| Invoice Cancel | System creates reversal |

---

## 6.5 Cancelled Invoices Report

### What is this?
Audit trail of all cancelled invoices with reasons and replacement invoice links.

### How to access?
| Navigation | URL |
|------------|-----|
| **Sidebar** → Finance & Sales → **Cancelled Invoices** | `/cancelled-invoices` |

### Report Contents
| Column | Description |
|--------|-------------|
| Original Invoice | Cancelled invoice number |
| Cancel Date | When cancelled |
| Reason | Why cancelled |
| Replacement Invoice | New invoice number (if reissued) |
| Cancelled By | User who cancelled |

---

## 6.6 Write-Off Report

### What is this?
Report showing invoices where outstanding amounts were written off as uncollectable.

### How to access?
| Navigation | URL |
|------------|-----|
| **Sidebar** → Finance & Sales → **Write-Off Report** | `/write-off-report` |

### When to Write-Off
- Customer is unreachable
- Legal advice to stop collection
- Small amounts not worth pursuing
- Agreed settlement for less

> **Note:** Write-off is admin-only action and creates permanent audit record.

---

# 7. Returns & Adjustments

## 7.1 Sales Returns

### What is this?
Handle goods returned by customers due to damage, wrong items, or quality issues. Three-stage workflow with inventory reconciliation.

### When to use?
- Customer returns damaged goods
- Wrong products delivered
- Quality rejected by customer
- Excess quantity returned

### How to access?
| Navigation | URL |
|------------|-----|
| **Sidebar** → Finance & Sales → **Sales Returns** | `/sales-returns` |

### Three-Stage Workflow

| Stage | Status | Who Does It | Actions |
|-------|--------|-------------|---------|
| 1 | Pending | Sales/Admin | Create return request |
| 2 | Received | Warehouse | Mark goods physically received |
| 3 | Inspected | Quality | Check condition, decide disposition |

### Step-by-Step: Complete Sales Return

#### Stage 1: Create Return
1. **Click:** "Create Return" button
2. **Select Invoice:** Choose original invoice
3. **Enter Return Date**
4. **Enter Reason:** Why goods being returned
5. **Add Return Items:**
   | Field | Description |
   |-------|-------------|
   | Product | Select from invoice items |
   | Batch Number | Original batch |
   | Quantity | How many returning |
   | Item Reason | Specific reason |
6. **Click:** "Submit Return"
7. **Status:** Pending

#### Stage 2: Receive Goods
1. **Find Return:** In returns list
2. **Click:** "Mark Received" button
3. **Status:** Received

#### Stage 3: Inspect & Decide
1. **Click:** "Inspect" button
2. **For Each Item:**
   | Field | Options |
   |-------|---------|
   | Condition | Good / Damaged |
   | Disposition | Restock / Scrap |
3. **Click:** "Complete Inspection"
4. **System Actions:**
   - Updates inventory (if restocking)
   - Creates Credit Note (if applicable)
5. **Status:** Inspected

### Credit Note Generation
| Invoice Age | Credit Note |
|-------------|-------------|
| Same month | Auto-generated |
| Previous month | Auto-generated (GST requirement) |

---

## 7.2 Debit Notes

### What is this?
Document to increase invoice amount after it's been issued. Used for price increases or additional charges on previous month invoices.

### When to use?
- Price increase agreed after invoice (previous month)
- Additional charges to add
- Quantity increase on old invoice

### How Created
- From Invoice Detail → "Create Debit Note" button
- Only for previous month invoices

> **Note:** For current month, use Cancel & Reissue instead of Debit Note.

---

# 8. Cash & Expenses

## 8.1 Daily Cash Register

### What is this?
Track daily cash flow - opening balance, cash received, expenses paid, transfers, and closing balance with mandatory reconciliation.

### When to use?
- Start of day: Enter opening balance
- During day: Record cash transactions
- End of day: Reconcile and close

### How to access?
| Navigation | URL |
|------------|-----|
| **Sidebar** → Cash & Expenses → **Daily Cash Register** | `/cash-register` |

### Daily Workflow

```
Morning: Open Day (set opening balance)
    ↓
During Day: Record transactions
    ↓
Evening: Reconcile (enter actual cash)
    ↓
Close Day (if balanced)
```

### Screen Elements
| Element | Description |
|---------|-------------|
| Today's Summary | Opening, Received, Expenses, Expected Closing |
| Transaction List | All today's entries |
| Add Transaction | Button to record new entry |
| Reconcile | Button for end-of-day |
| Close Day | Finalize the day |

### Transaction Types
| Type | Description | Effect |
|------|-------------|--------|
| Sale Cash | Cash from sales | Increases balance |
| Secondary Sale | Other cash income | Increases balance |
| UPI Received | UPI collection | Increases balance |
| Bank Transfer | Transfer to bank | Decreases balance |
| Expense | Cash expense | Decreases balance |
| Other | Miscellaneous | Varies |

### Reconciliation Process
1. **Click:** "Reconcile" button
2. **Count:** Actual cash on hand
3. **Enter:** Actual amount
4. **System Shows:**
   - Expected balance
   - Actual balance
   - Variance (difference)
5. **If Variance:** Enter explanation
6. **Click:** "Confirm"
7. **Close Day:** Once reconciled

> **Important:** Day cannot be closed if there's unexplained variance.

---

## 8.2 Cash Register Report

### What is this?
Historical view of daily cash register with filters and analysis.

### How to access?
| Navigation | URL |
|------------|-----|
| **Sidebar** → Cash & Expenses → **Cash Register Report** | `/cash-register-report` |

---

## 8.3 Expense Vouchers

### What is this?
Record and track business expenses with approval workflow. Generate vouchers for audit trail.

### When to use?
- Any business expense (supplies, utilities, transport)
- Petty cash usage
- Vendor payments
- Any cash outflow

### How to access?
| Navigation | URL |
|------------|-----|
| **Sidebar** → Cash & Expenses → **Expense Vouchers** | `/expenses` |

### Expense Workflow
```
Draft → Submitted → Approved/Rejected → Paid
```

### Step-by-Step: Create Expense

1. **Click:** "New Expense"
2. **Fill Header:**
   | Field | Description |
   |-------|-------------|
   | Expense Date | When expense occurred |
   | Category | Type of expense |
   | Payment Mode | Cash/Bank/UPI/Cheque |
3. **Add Line Items:**
   | Field | Description |
   |-------|-------------|
   | Description | What was purchased |
   | Amount | Cost |
   | GST (if applicable) | Tax amount |
4. **Attach Documents:** Bills, receipts
5. **Click:** "Submit for Approval"

### Approval Workflow
| Status | Who | Action |
|--------|-----|--------|
| Draft | Creator | Save without submitting |
| Submitted | Creator | Send for approval |
| Approved | Manager/Admin | Approve expense |
| Rejected | Manager/Admin | Reject with reason |
| Paid | Finance | Mark as paid |

---

# 9. Quality & Checklists

## 9.1 Checklist Builder

### What is this?
Create custom checklists for quality control, machine startup, safety checks, etc.

### How to access?
| Navigation | URL |
|------------|-----|
| **Sidebar** → Quality & Checklists → **Checklist Builder** | `/checklists` |

---

## 9.2 Machine Startup Reminders

### What is this?
Automated WhatsApp reminders for daily machine startup checklists.

### How it works?
1. Checklist assigned to machine operator
2. System sends WhatsApp message at scheduled time
3. Operator responds via WhatsApp
4. Responses recorded automatically

### How to access?
| Navigation | URL |
|------------|-----|
| **Sidebar** → Quality & Checklists → **Machine Startup Reminders** | `/` (Reminders tab) |

---

## 9.3 WhatsApp Interactive Checklists

### What is this?
Complete checklists via WhatsApp messages. Supports text, number, and photo responses.

### Response Types
| Type | Example Response |
|------|------------------|
| Yes/No | "Yes" or "No" |
| Number | "25" (temperature reading) |
| Text | "Machine running smoothly" |
| Photo | Send photo of equipment |

---

# 10. Document Management

## 10.1 Documents

### What is this?
Store and organize business documents - contracts, certificates, licenses, with expiry tracking.

### How to access?
| Navigation | URL |
|------------|-----|
| **Sidebar** → Cash & Expenses → **Documents** | `/documents` |

### Features
| Feature | Description |
|---------|-------------|
| Upload | Add new documents |
| Categories | Organize by type |
| Expiry Tracking | Alert before expiry |
| Vendor Link | Attach to vendor |
| Bulk Download | ZIP multiple files |

### Document Categories
- Contracts
- Certificates
- Licenses
- Insurance
- Tax Documents
- Other

### Expiry Alerts
| Days to Expiry | Status | Color |
|----------------|--------|-------|
| > 30 days | OK | Green |
| 15-30 days | Warning | Yellow |
| 0-14 days | Urgent | Orange |
| Expired | Critical | Red |

---

# 11. Reports

## 11.1 Reports Hub

### What is this?
Central location for all system reports - sales, production, inventory, and compliance.

### How to access?
| Navigation | URL |
|------------|-----|
| **Sidebar** → Dashboard & Analytics → **Reports** | `/reports` |

---

## 11.2 Production Reconciliation Report

### What is this?
Detailed report of production vs material consumption with variance analysis.

### How to access?
| Navigation | URL |
|------------|-----|
| **Sidebar** → Production & Inventory → **Reconciliation Report** | `/reports/production-reconciliation` |

---

## 11.3 Available Reports

| Report | Purpose | Location |
|--------|---------|----------|
| Sales Summary | Daily/Monthly sales | Reports Hub |
| GST Report | GSTR-1 data | Reports Hub |
| Outstanding Report | Pending payments | Pending Payments |
| Cancelled Invoices | Audit trail | Cancelled Invoices |
| Write-Off Report | Written off amounts | Write-Off Report |
| Production Variance | Material usage analysis | Reconciliation Report |
| Cash Register | Daily cash flow | Cash Register Report |
| Vendor History | Individual ledgers | Vendor History |

---

# Quick Reference

## Common Workflows

### Daily Operations
1. **Morning:**
   - Open Cash Register
   - Check Machine Startup Checklists
   - Review pending dispatches

2. **During Day:**
   - Create Invoices
   - Create Gatepasses
   - Record Payments
   - Process Returns

3. **Evening:**
   - Production Reconciliation
   - Cash Register Reconciliation
   - Review tomorrow's pending items

### Invoice Corrections
| Scenario | Method |
|----------|--------|
| Current month, no gatepass | Cancel & Reissue |
| Current month, with gatepass | Credit Note |
| Previous month, reduce amount | Credit Note |
| Previous month, increase amount | Debit Note |

### Sales Return Flow
```
Customer complaint → Create Return → Receive Goods → Inspect → Credit Note
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + /` | Toggle Sidebar |
| `Esc` | Close Dialog |

---

## Need Help?

For additional support:
- Contact system administrator
- Check with your manager
- Refer to this documentation

---

*Document generated for KINTO Smart Ops - Inmoisure Private Limited*
