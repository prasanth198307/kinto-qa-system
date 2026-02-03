# Sales Invoice Screen - Complete User Guide

## KINTO Operations & QA Management System
### Version 1.0 | User Documentation

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Accessing the Invoice Screen](#2-accessing-the-invoice-screen)
3. [Invoice List View](#3-invoice-list-view)
4. [Creating a New Invoice](#4-creating-a-new-invoice)
5. [Invoice Detail View](#5-invoice-detail-view)
6. [Invoice Workflow & Status](#6-invoice-workflow--status)
7. [Editing an Invoice](#7-editing-an-invoice)
8. [Cancelling & Reissuing an Invoice](#8-cancelling--reissuing-an-invoice)
9. [Credit Notes](#9-credit-notes)
10. [Debit Notes](#10-debit-notes)
11. [Payments & Tracking](#11-payments--tracking)
12. [Printing & Exporting](#12-printing--exporting)
13. [Search & Filtering](#13-search--filtering)
14. [Common Scenarios & Examples](#14-common-scenarios--examples)
15. [Troubleshooting & FAQs](#15-troubleshooting--faqs)
16. [Permission Requirements](#16-permission-requirements)
17. [Tips & Best Practices](#17-tips--best-practices)
18. [Glossary](#18-glossary)

---

## 1. Introduction

### Purpose of This Document
This guide provides step-by-step instructions for using the Sales Invoice screen in KINTO Operations & QA Management System. It covers all aspects of invoice management from creation to payment tracking.

### Who Should Use This Guide
- Sales Team Members
- Accounts & Finance Staff
- Operations Managers
- Administrators

### Key Features Overview
- GST-compliant invoice generation
- Multi-item invoicing with HSN codes
- Automatic tax calculations (CGST/SGST/IGST)
- Invoice workflow tracking
- Payment recording and FIFO allocation
- Credit note management
- Stock reservation system
- Print and export capabilities

---

## 2. Accessing the Invoice Screen

### Primary Navigation Path
**Method 1:** Dashboard → Click on "Invoices" Tab

**Method 2:** Sidebar Menu → Production Management → Invoices

**Method 3:** Direct URL → /production-management?tab=invoices

### Screen Layout Overview
When you access the Invoice screen, you will see:

| Area | Description |
|------|-------------|
| **Header Bar** | Contains "New Invoice" button and search box |
| **Filter Section** | Date filters, customer filter, status filter |
| **Invoice Table** | List of all invoices with key columns |
| **Pagination** | Navigation for multiple pages |
| **Action Buttons** | View, Edit, Print options for each invoice |

---

## 3. Invoice List View

### Understanding the Invoice Table

| Column | Description | Example |
|--------|-------------|---------|
| Invoice No. | Unique system-generated number | INV-2024-00456 |
| Date | Invoice creation date | 15-Jan-2024 |
| Customer | Buyer/customer name | ABC Distributors |
| Items | Number of line items | 3 items |
| Subtotal | Amount before GST | ₹45,000.00 |
| GST | Total tax amount | ₹8,100.00 |
| Total | Grand total including GST | ₹53,100.00 |
| Status | Current workflow stage | Ready for Dispatch |
| Payment | Payment status | Partial (₹30,000) |
| Actions | Available operations | View / Edit / Print |

### Status Color Coding

| Color | Status | Meaning |
|-------|--------|---------|
| 🔵 Blue | Created | Invoice saved, pending approval |
| 🟡 Yellow | Ready for Dispatch | Approved, awaiting gatepass |
| 🟠 Orange | Gatepass Generated | Packed, ready to ship |
| 🟣 Purple | Dispatched | Goods left facility |
| 🔷 Cyan | In Transit | On the way to customer |
| 🟢 Green | Delivered | Customer received goods |
| 🔴 Red | Cancelled | Invoice cancelled |

### Payment Status Indicators

| Indicator | Status | Meaning |
|-----------|--------|---------|
| ✅ Paid | Full payment received | Outstanding = ₹0 |
| ⚠️ Partial | Partial payment received | Some amount pending |
| ❌ Unpaid | No payment received | Full amount pending |

---

## 4. Creating a New Invoice

### Before You Begin
Ensure you have:
- ✅ Customer registered in the system with correct GSTIN
- ✅ Products available in inventory with correct HSN codes
- ✅ Invoice template configured (if using templates)
- ✅ Bank details set up (for payment information on invoice)

### Step-by-Step Invoice Creation

#### Step 1: Open New Invoice Form
1. Navigate to Invoice screen
2. Click **"New Invoice"** button (top-right corner)
3. Invoice form opens in a popup/dialog

#### Step 2: Select Invoice Template (Optional)
1. Click the **Template** dropdown
2. Select from available templates
3. Template auto-fills:
   - Seller company details
   - Bank account information
   - Terms and conditions
   - Default signature

#### Step 3: Set Invoice Date
1. Click the **Date** field
2. Select invoice date from calendar
3. Default is today's date
4. Can backdate within current month only

#### Step 4: Select Customer (Buyer)

**Using Customer Dropdown:**
1. Click **"Select Customer"** dropdown
2. Type customer name to search
3. Select customer from list

**Filtering by Customer Type:**
1. Click **"Customer Type"** filter
2. Select: Distributor / Dealer / Retail / Institutional
3. List shows only matching customers

**Auto-populated Information:**
- Customer name
- GSTIN number
- Billing address
- State and state code
- Contact details

#### Step 5: Configure Shipping Address (If Different)
1. Toggle **"Ship to Different Address"** switch
2. Additional fields appear:
   - Ship-to Name
   - Address
   - City
   - State
   - Pincode
   - Ship-to GSTIN (if applicable)

#### Step 6: Add Line Items (Products)

**Adding First Item:**
1. Click **"Add Item"** button
2. Product selection dropdown appears

**For Each Line Item:**

| Field | How to Fill | Notes |
|-------|-------------|-------|
| Product | Select from dropdown | Shows product code and name |
| Description | Auto-fills, can edit | Appears on printed invoice |
| HSN Code | Auto-fills from product | GST classification code |
| Quantity | Enter number | Check available stock shown |
| Unit Price | Enter per-unit price | Amount in ₹ (excluding GST) |
| GST Rate | Select percentage | 0%, 5%, 12%, 18%, 28% |
| Transport | Enter if applicable | Per-case transport cost |
| Batch No. | Auto-fills or enter | For traceability |

**Stock Availability Display:**
- 🟢 **Available: 150** = Sufficient stock
- 🟡 **Available: 10** = Low stock warning
- 🔴 **Available: 0** = No stock available

**Adding Multiple Items:**
1. Click **"Add Another Item"** for each product
2. Each item appears as a new row
3. No limit on number of items

**Removing an Item:**
1. Click the **trash icon** (🗑️) next to the item
2. Item is removed immediately

#### Step 7: Review Tax Calculations

The system automatically calculates:

**For Intra-State Sales (Same State):**
```
Taxable Amount = Quantity × Unit Price
CGST = Taxable Amount × (GST Rate ÷ 2)
SGST = Taxable Amount × (GST Rate ÷ 2)
Line Total = Taxable Amount + CGST + SGST
```

**For Inter-State Sales (Different State):**
```
Taxable Amount = Quantity × Unit Price
IGST = Taxable Amount × GST Rate
Line Total = Taxable Amount + IGST
```

**Summary Section Shows:**
- Subtotal (all items before tax)
- Total CGST amount
- Total SGST amount
- Total IGST amount (if inter-state)
- Grand Total
- Amount in words

#### Step 8: GST Inclusive Mode (Optional)
If customer quotes total price including GST:
1. Toggle **"GST Inclusive"** switch ON
2. Enter total amount per item
3. System calculates base price and GST automatically

#### Step 9: Select Bank Details
1. Click **"Bank Account"** dropdown
2. Select bank for payment details
3. Bank info appears on printed invoice
4. UPI QR code generated automatically

#### Step 10: Add Remarks (Optional)
1. Enter internal notes in **Remarks** field
2. These do NOT print on invoice
3. For internal reference only

#### Step 11: Choose Signature
1. Select signature type from dropdown:
   - **Signature 1** - Default company signature
   - **Signature 2** - Alternate signature
2. Selected signature appears on printed invoice

#### Step 12: Save or Preview

**To Save Invoice:**
1. Click **"Save Invoice"** button
2. Invoice is created with auto-generated number
3. Stock is reserved for the items
4. Returns to invoice list

**To Preview Before Saving:**
1. Click **"Print Preview"** button
2. See how invoice will look when printed
3. Close preview and save, or make changes

---

## 5. Invoice Detail View

### Accessing Invoice Details
1. Click on any invoice number in the list
   OR
2. Click **"View"** action button
   OR
3. Direct URL: /invoice/{invoice-id}

### Information Sections

#### Header Section
- Invoice number with status badge
- Invoice date
- Quick action buttons (Edit, Print, Email)

#### Seller Information
| Field | Description |
|-------|-------------|
| Company Name | Your registered business name |
| GSTIN | Your GST registration number |
| Address | Registered business address |
| State | State with code |
| Contact | Phone and email |

#### Buyer Information
| Field | Description |
|-------|-------------|
| Customer Name | Buyer's registered name |
| GSTIN | Buyer's GST number |
| Address | Billing address |
| State | State with code |

#### Ship-To Information (If Different)
Shows delivery address if different from billing

#### Line Items Table
| Column | Description |
|--------|-------------|
| Sr. No | Sequential item number |
| Description | Product name and details |
| HSN/SAC | HSN code for goods, SAC for services |
| Quantity | Number of units |
| Rate | Unit price (₹) |
| GST % | Tax rate applied |
| Taxable Value | Amount before tax |
| CGST | Central GST amount |
| SGST | State GST amount |
| IGST | Integrated GST (if inter-state) |
| Total | Line total with tax |

#### Totals & Summary
- Subtotal (Before Tax)
- Add: CGST / SGST / IGST
- Grand Total
- Amount in Words
- Round Off (if applicable)

#### Payment Summary Card
| Field | Amount |
|-------|--------|
| Invoice Total | ₹53,100.00 |
| Payments Received | ₹30,000.00 |
| Credit Notes | ₹0.00 |
| Outstanding | ₹23,100.00 |

#### Related Documents
- **Gatepass:** Link to associated gatepass (if created)
- **Credit Notes:** List of credit notes against this invoice
- **Debit Notes:** List of debit notes (if any)
- **Payment History:** All payments received

---

## 6. Invoice Workflow & Status

### Complete Workflow Diagram

```
┌─────────────┐     ┌──────────────────┐     ┌───────────────────┐
│   CREATED   │ ──▶ │ READY FOR        │ ──▶ │ GATEPASS         │
│             │     │ DISPATCH         │     │ GENERATED        │
└─────────────┘     └──────────────────┘     └───────────────────┘
                                                      │
                                                      ▼
┌─────────────┐     ┌──────────────────┐     ┌───────────────────┐
│  DELIVERED  │ ◀── │   IN TRANSIT     │ ◀── │   DISPATCHED     │
│             │     │                  │     │                  │
└─────────────┘     └──────────────────┘     └───────────────────┘
```

### Status Details

#### 1. Created
- **Meaning:** Invoice saved in system
- **Can Edit:** ✅ Yes
- **Can Delete:** ✅ Yes (if permitted)
- **Next Action:** Mark "Ready for Dispatch"

#### 2. Ready for Dispatch
- **Meaning:** Invoice approved for shipping
- **Can Edit:** ✅ Yes
- **Can Create Gatepass:** ✅ Yes
- **Next Action:** Generate Gatepass

#### 3. Gatepass Generated
- **Meaning:** Gatepass created, goods packed
- **Can Edit:** ❌ No (locked)
- **Inventory:** Stock deducted
- **Next Action:** Dispatch goods

#### 4. Dispatched
- **Meaning:** Goods have left the facility
- **Can Edit:** ❌ No
- **Next Action:** Update when in transit

#### 5. In Transit
- **Meaning:** Goods on the way to customer
- **Can Edit:** ❌ No
- **Next Action:** Update when delivered

#### 6. Delivered
- **Meaning:** Customer received goods
- **POD:** Proof of delivery obtained
- **Can Edit:** ❌ No
- **Invoice:** Complete

### Workflow Actions

**Mark Ready for Dispatch:**
1. Open invoice detail
2. Click **"Ready for Dispatch"** button
3. Status changes to "Ready for Dispatch"
4. Invoice now available for gatepass creation

**Generate Gatepass:**
1. Ensure invoice is "Ready for Dispatch"
2. Click **"Generate Gatepass"** button
3. Redirects to Dispatch Tracking
4. Complete gatepass creation

---

## 7. Editing an Invoice

### Edit Availability Rules

| Condition | Can Edit? |
|-----------|----------|
| Status: Created | ✅ Yes |
| Status: Ready for Dispatch | ✅ Yes |
| Status: Gatepass Generated or later | ❌ No |
| Invoice Cancelled | ❌ No |
| Previous Month Invoice | ⚠️ Limited |

### How to Edit

1. Open invoice detail page
2. Click **"Edit"** button (if available)
3. Invoice form opens with existing data
4. Make required changes
5. Click **"Save"** to update

### What Can Be Edited

| Field | Editable? | Notes |
|-------|-----------|-------|
| Invoice Date | ✅ Within same month | Cannot change to previous month |
| Customer | ✅ | Updates all buyer details |
| Line Items | ✅ | Add, remove, modify |
| Quantities | ✅ | Subject to stock availability |
| Prices | ✅ | Recalculates totals |
| Template | ✅ | Updates seller info |
| Bank Details | ✅ | For payment info |
| Remarks | ✅ | Internal notes |

### What Cannot Be Edited
- Invoice Number (system-generated)
- Created By (audit field)
- Creation Timestamp

### Lock Icon Explanation
When you see a 🔒 lock icon on the Edit button:
- Hover over it to see the reason
- Common reasons:
  - "Invoice has gatepass - use Cancel & Reissue"
  - "Delivered invoices cannot be edited"
  - "Use Credit Note for previous month invoices"

---

## 8. Cancelling & Reissuing an Invoice

### When to Use Cancel & Reissue
- Wrong customer selected
- Incorrect pricing
- Wrong products added
- Quantity errors
- Any major correction needed

### GST Compliance Rules

**Current Month Invoice:**
- ✅ Can Cancel & Reissue
- Original invoice cancelled
- New corrected invoice created
- Both linked for audit

**Previous Month Invoice:**
- ❌ Cannot Cancel (GST filed)
- Use Credit Notes instead
- See Section 9 for Credit Notes

### Cancel & Reissue Process

#### Step 1: Open Invoice
1. Navigate to invoice detail page
2. Verify it's a current month invoice

#### Step 2: Initiate Cancellation
1. Click **"Cancel & Reissue"** button
2. Confirmation dialog appears:
   ```
   Are you sure you want to cancel this invoice 
   and create a replacement?
   
   - Original invoice will be marked as cancelled
   - Stock reservations will be released
   - A new invoice form will open with the same data
   - Both invoices will be linked for audit
   
   [Cancel] [Proceed]
   ```
3. Click **"Proceed"**

#### Step 3: Create Replacement Invoice
1. New invoice form opens
2. All data pre-filled from original
3. Make your corrections
4. Click **"Save"**

#### Step 4: Verify Linking
1. New invoice created with new number
2. New invoice shows: "Replaces: INV-2024-00456"
3. Original shows: "Replaced by: INV-2024-00457"

### What Happens on Cancellation
- Original invoice status → Cancelled
- Stock reservation → Released
- Gatepass (if any) → Cancelled
- Payment (if any) → Available for reallocation
- Audit trail → Maintained

### Viewing Cancelled Invoices
1. Navigate to: Reports → Cancelled Invoices
2. Search by original invoice number
3. View details and replacement link

---

## 9. Credit Notes

### Purpose of Credit Notes
Credit notes adjust invoice values after GST filing. They are used for:
- Goods returned by customer
- Price reductions agreed after invoicing
- Quantity discrepancies
- Quality issues
- Defective goods

### Types of Credit Notes

#### 1. Simple Credit Note
- Basic adjustment for specific amount
- Select items and quantities
- Enter credit reason

#### 2. Correct & Credit
- System calculates difference
- For price or quantity corrections
- Original and corrected values compared

#### 3. Quick Full Credit
- Credits entire invoice
- For complete order cancellation/return
- All items credited at full value

### Creating a Credit Note

#### Prerequisites
- Invoice from previous month (GST filed)
- Invoice is active (not cancelled)
- Credit note permission

#### Step-by-Step Process

**Step 1:** Open original invoice detail

**Step 2:** Click **"Create Credit Note"** button

**Step 3:** Credit Note form opens:

| Field | Description | Example |
|-------|-------------|---------|
| Credit Note Number | Auto-generated | CN-INV-2024-00456-01 |
| Reference Invoice | Pre-filled | INV-2024-00456 |
| Credit Date | Default today | 20-Feb-2024 |
| Reason | Select from list | Goods Returned |

**Step 4:** Select items to credit:
- Check the items being returned/credited
- Enter quantity for each
- System calculates credit amount

**Step 5:** Enter remarks:
- Describe reason in detail
- This appears on credit note

**Step 6:** Click **"Create Credit Note"**

### Credit Note Impact

| Area | Impact |
|------|--------|
| Invoice Outstanding | Reduced by credit amount |
| GST Liability | Reduced accordingly |
| Customer Account | Credit balance increases |
| Inventory | Can be updated if goods returned |

### Viewing Credit Notes
1. From invoice detail → Related Credit Notes section
2. From menu → Credit Notes screen
3. Click any credit note to view/print

---

## 10. Debit Notes

### Purpose of Debit Notes
Debit notes increase invoice values when:
- Additional charges applied after invoicing
- Price increases agreed after invoice
- Under-billing corrections

### Creating a Debit Note (Correct & Debit)

1. Open original invoice detail
2. Click **"Correct & Debit"** button
3. Enter corrected (higher) values
4. System calculates additional amount
5. Debit note created

### Debit Note Impact
- Invoice outstanding increases
- Customer owes additional amount
- GST liability increases

---

## 11. Payments & Tracking

### Recording Payments

#### Method 1: From Invoice Detail
1. Open invoice
2. Scroll to Payment History section
3. Click **"Record Payment"**
4. Enter payment details
5. Save

#### Method 2: From Payment Management
1. Navigate to Payment Management screen
2. Click **"New Payment"**
3. Select customer
4. Select invoice(s) to apply payment
5. Enter amount and details
6. Save

### Payment Form Fields

| Field | Description | Required |
|-------|-------------|----------|
| Customer | Select payer | ✅ |
| Invoice(s) | Select invoice(s) | ✅ |
| Amount | Payment amount | ✅ |
| Payment Date | Date received | ✅ |
| Payment Mode | Cash/Cheque/NEFT/UPI | ✅ |
| Reference No. | Transaction reference | ⚪ |
| Bank Name | For cheque/transfer | ⚪ |
| Remarks | Additional notes | ⚪ |

### Payment Modes Supported

| Mode | Details Needed |
|------|----------------|
| Cash | Just amount |
| Cheque | Cheque no., Bank, Date |
| NEFT/RTGS | UTR number, Bank |
| UPI | Transaction ID |
| Bank Transfer | Reference number |

### FIFO Payment Allocation

The system follows FIFO (First In, First Out) for payment allocation:

**How It Works:**
1. When payment received from customer
2. System identifies oldest unpaid invoices
3. Payment applied to oldest invoice first
4. Remaining amount to next oldest
5. Continues until payment exhausted

**Example:**
```
Customer: ABC Distributors
Open Invoices:
- INV-001 (Jan 10): ₹10,000 outstanding
- INV-002 (Jan 20): ₹15,000 outstanding
- INV-003 (Feb 05): ₹20,000 outstanding

Payment Received: ₹18,000

FIFO Allocation:
- INV-001: ₹10,000 (fully paid)
- INV-002: ₹8,000 (partial - ₹7,000 outstanding)
- INV-003: ₹0 (unchanged)
```

### Customer Advances

#### What Are Advances?
Pre-payments received before invoice creation.

#### Recording an Advance
1. Go to Customer Advances screen
2. Click **"New Advance"**
3. Select customer
4. Enter amount received
5. Enter payment details
6. Save

#### Applying Advance to Invoice
1. Open Customer Advances
2. Find customer's advance
3. Click **"Apply to Invoice"**
4. Select invoice(s)
5. Enter amount to apply
6. Confirm

#### Advance Balance
- Unused advance remains as credit
- Can be applied to future invoices
- View balance in Customer Advances

### Viewing Payment Status

**For Single Invoice:**
- Open invoice detail
- Check Payment Summary card
- View payment history below

**For All Invoices:**
- Go to Pending Payments screen
- Filter by customer if needed
- See all outstanding amounts

---

## 12. Printing & Exporting

### Print Invoice

#### Standard Print
1. Open invoice detail
2. Click **"Print"** button
3. Print-ready view opens in new tab
4. Use browser print (Ctrl+P / Cmd+P)

#### Print Settings
- Paper size: A4 recommended
- Margins: Default or narrow
- Scale: 100%
- Background graphics: ✅ Enabled

### Invoice Print Layout

```
┌────────────────────────────────────────────┐
│              [Company Logo]                │
│           Company Name & Address           │
│              GSTIN: 27XXXXX                │
├────────────────────────────────────────────┤
│  TAX INVOICE                               │
│  Invoice No: INV-2024-00456                │
│  Date: 15-Jan-2024                         │
├─────────────────────┬──────────────────────┤
│  Bill To:           │  Ship To:            │
│  Customer Name      │  Delivery Address    │
│  Address            │                      │
│  GSTIN: XXXXX       │                      │
├─────────────────────┴──────────────────────┤
│  ITEMS                                     │
│  ┌─────┬─────────┬─────┬─────┬─────────┐  │
│  │ HSN │ Product │ Qty │Rate │ Amount  │  │
│  ├─────┼─────────┼─────┼─────┼─────────┤  │
│  │ ... │ ....... │ ... │ ... │ ....... │  │
│  └─────┴─────────┴─────┴─────┴─────────┘  │
├────────────────────────────────────────────┤
│  Subtotal:                    ₹45,000.00  │
│  CGST @ 9%:                    ₹4,050.00  │
│  SGST @ 9%:                    ₹4,050.00  │
│  TOTAL:                       ₹53,100.00  │
├────────────────────────────────────────────┤
│  Amount in Words: Fifty Three Thousand     │
│  One Hundred Rupees Only                   │
├────────────────────────────────────────────┤
│  Bank Details:                             │
│  Account Name: XYZ Pvt Ltd                 │
│  Account No: 1234567890                    │
│  IFSC: ABCD0001234                         │
│  [UPI QR Code]                             │
├────────────────────────────────────────────┤
│  Terms & Conditions                        │
│  1. Payment due within 30 days             │
│  2. ...                                    │
├────────────────────────────────────────────┤
│                              [Signature]   │
│                         Authorised Signatory│
└────────────────────────────────────────────┘
```

### Print Invoice with Gatepass
1. Open invoice detail
2. Click **"Print with Gatepass"** button
3. Both documents print together
4. Or navigate to Dispatch Tracking for combined print

### Signature Selection
1. In invoice detail, find **Signature** dropdown
2. Select:
   - **Signature 1** - Primary signature
   - **Signature 2** - Alternate signature
3. Click Print - selected signature appears

### Email Invoice (Coming Soon)
- Click Email button
- Enter recipient email
- Invoice sent as PDF attachment

---

## 13. Search & Filtering

### Quick Search
Located at top of invoice list:
- Type invoice number: "INV-2024-00456"
- Type customer name: "ABC Distributors"
- Type amount: "53100"
- Results filter instantly

### Date Filters

| Filter Option | Description |
|---------------|-------------|
| All Dates | Show all invoices |
| Today | Today's invoices only |
| This Week | Current week |
| This Month | Current month |
| Last Month | Previous month |
| Date Range | Custom from-to dates |
| Select Month | Specific month picker |
| Select Year | Specific year |

### Customer Filter
1. Click **"Customer"** dropdown
2. Search or scroll to find customer
3. Select to filter
4. Shows only that customer's invoices

### Status Filter
1. Click **"Status"** dropdown
2. Select specific status:
   - All Statuses
   - Created
   - Ready for Dispatch
   - Gatepass Generated
   - Dispatched
   - In Transit
   - Delivered
   - Cancelled

### Payment Status Filter
- All
- Paid
- Partial
- Unpaid

### Combining Filters
All filters work together:
- Example: "This Month" + "ABC Distributors" + "Unpaid"
- Shows only January invoices for ABC that are unpaid

### Clearing Filters
- Click **"Clear Filters"** button
- Or click (X) on individual filter chips
- Returns to showing all invoices

### Sorting
Click column headers to sort:
- Invoice No. (ascending/descending)
- Date (newest/oldest first)
- Amount (highest/lowest first)
- Customer (A-Z / Z-A)

---

## 14. Common Scenarios & Examples

### Scenario 1: Standard Invoice Creation

**Situation:** New order from regular customer for 3 products

**Steps:**
1. Click "New Invoice"
2. Select customer: "XYZ Distributors"
3. Add items:
   - Product A: 50 cases @ ₹500, 18% GST
   - Product B: 30 cases @ ₹350, 12% GST
   - Product C: 20 cases @ ₹700, 18% GST
4. Select bank account
5. Save invoice
6. Print and send to customer

**Result:** Invoice INV-2024-00789 created with all calculations

---

### Scenario 2: Inter-State Sale

**Situation:** Customer in different state (your state: Maharashtra, customer: Gujarat)

**Steps:**
1. Create new invoice
2. Select Gujarat customer
3. System detects inter-state sale
4. GST type changes to IGST
5. Add items - GST shows as single IGST rate
6. Save and print

**Result:** Invoice shows IGST instead of CGST+SGST

---

### Scenario 3: Same-Day Edit

**Situation:** Customer calls 10 minutes after invoice to add 5 more cases

**Steps:**
1. Find invoice in list
2. Click to open detail
3. Click "Edit"
4. Find the product line
5. Change quantity from 50 to 55
6. Save
7. Print new copy

**Result:** Invoice updated, totals recalculated

---

### Scenario 4: Wrong Customer Selected (Current Month)

**Situation:** Selected "ABC Ltd" instead of "ABC Industries"

**Steps:**
1. Open wrong invoice
2. Click "Cancel & Reissue"
3. Confirm cancellation
4. New form opens
5. Change customer to "ABC Industries"
6. Save new invoice

**Result:** 
- Old invoice cancelled
- New invoice with correct customer
- Both linked in system

---

### Scenario 5: Price Correction After Delivery (Previous Month)

**Situation:** Invoiced ₹500/case in January, should have been ₹480/case

**Steps:**
1. Open January invoice (now February)
2. Cannot edit - "Previous month"
3. Click "Correct & Credit"
4. Enter correct price: ₹480
5. System calculates: ₹20 × 50 cases = ₹1,000 credit
6. Confirm and create credit note

**Result:** 
- Credit note CN-001 for ₹1,000 + GST
- Invoice outstanding reduced
- GST adjustment recorded

---

### Scenario 6: Goods Returned After Delivery

**Situation:** Customer returns 10 cases due to damage

**Steps:**
1. Open delivered invoice
2. Click "Create Credit Note"
3. Select returned product
4. Enter quantity: 10
5. Reason: "Damaged goods returned"
6. Create credit note
7. Update finished goods if returned to stock

**Result:**
- Credit note for 10 cases value
- Customer outstanding reduced
- Can restock if goods are repairable

---

### Scenario 7: Applying Customer Advance

**Situation:** Customer paid ₹50,000 advance, new invoice is ₹45,000

**Steps:**
1. Create invoice as normal
2. Save invoice (₹45,000 outstanding)
3. Go to Customer Advances
4. Find customer's ₹50,000 advance
5. Click "Apply to Invoice"
6. Select new invoice
7. Enter ₹45,000
8. Confirm

**Result:**
- Invoice shows as Paid
- Advance balance now ₹5,000
- Available for future invoices

---

### Scenario 8: Partial Payment Received

**Situation:** Invoice for ₹53,100, customer pays ₹30,000

**Steps:**
1. Go to Payment Management
2. Click "New Payment"
3. Select customer
4. Select invoice
5. Enter amount: ₹30,000
6. Payment mode: Bank Transfer
7. Reference: UTR12345678
8. Save

**Result:**
- Invoice shows "Partial - ₹30,000 paid"
- Outstanding: ₹23,100
- Payment recorded with reference

---

### Scenario 9: Multiple Invoices - Single Payment

**Situation:** Customer pays ₹80,000 covering multiple invoices

**Steps:**
1. New Payment
2. Select customer
3. Enter ₹80,000
4. System shows FIFO allocation:
   - INV-001: ₹25,000 (oldest, full)
   - INV-002: ₹35,000 (full)
   - INV-003: ₹20,000 (partial of ₹40,000)
5. Confirm allocation
6. Save

**Result:**
- 2 invoices fully paid
- 1 invoice partially paid
- Automatic FIFO applied

---

### Scenario 10: Finding Old Invoice

**Situation:** Customer asks about invoice from 3 months ago

**Steps:**
1. Go to Invoices
2. Set date filter: Select Month
3. Choose the month (e.g., October 2023)
4. Search customer name if needed
5. Find invoice in filtered list
6. Click to view details

**Alternative:**
- Use Quick Search
- Type invoice number directly: "INV-2023-00123"

---

### Scenario 11: Invoice with Different Shipping Address

**Situation:** Bill to Head Office, ship to Branch Office

**Steps:**
1. New Invoice
2. Select customer (Head Office details fill)
3. Toggle "Ship to Different Address" ON
4. Enter branch address:
   - Name: "ABC Industries - Pune Branch"
   - Address: "123 Industrial Area"
   - City: "Pune"
   - State: "Maharashtra"
   - Pincode: "411001"
5. Add items and save

**Result:** Invoice shows both Bill To and Ship To addresses

---

### Scenario 12: Creating Invoice from Gatepass (Legacy)

**Situation:** Gatepass created first, now need invoice

**Steps:**
1. Go to Gatepass list
2. Find gatepass without invoice
3. Click "Create Invoice"
4. Form opens with gatepass items pre-filled
5. Add/modify details
6. Save invoice

**Note:** Current workflow is Invoice-First, so this is for legacy gatepasses only.

---

### Scenario 13: Printing Invoice for Transporter

**Situation:** Transporter needs invoice copy with gatepass

**Steps:**
1. Open invoice
2. Click "Print with Gatepass"
3. Combined document opens
4. Print multiple copies as needed

**Alternative:**
- Go to Dispatch Tracking
- Find the shipment
- Click combined print option

---

### Scenario 14: Checking Customer Outstanding

**Situation:** Before dispatching, check if customer has pending payments

**Steps:**
1. Go to Pending Payments
2. Search customer name
3. View all outstanding invoices
4. Total outstanding shown
5. Decide whether to proceed with dispatch

---

### Scenario 15: Invoice Template Change

**Situation:** Need to use different company letterhead

**Steps:**
1. Edit invoice (or create new)
2. Change Template dropdown
3. Select different template
4. Seller details update accordingly
5. Save and print

**Note:** Templates are configured by Admin

---

## 15. Troubleshooting & FAQs

### Common Issues

#### Q: "New Invoice" button not visible
**Cause:** Missing create permission
**Solution:** Contact administrator to grant invoice create permission

#### Q: Cannot edit invoice
**Cause:** Invoice has gatepass or is delivered
**Solution:** 
- Current month: Use Cancel & Reissue
- Previous month: Use Credit Note

#### Q: Stock showing zero but we have inventory
**Cause:** Stock not approved/quality pending
**Solution:** Approve finished goods in inventory first

#### Q: Customer GSTIN not auto-filling
**Cause:** Customer GSTIN not entered in master
**Solution:** Update customer record with GSTIN

#### Q: Inter-state showing CGST/SGST instead of IGST
**Cause:** Customer state code not set correctly
**Solution:** Update customer state code in master

#### Q: Credit Note button not visible
**Cause:** Either current month (use Cancel & Reissue) or no permission
**Solution:** Check invoice month; contact admin for permissions

#### Q: Payment not reflecting on invoice
**Cause:** Payment allocated to older invoice (FIFO)
**Solution:** Check Payment Management for allocation details

#### Q: Cannot find old invoice
**Solution:** 
- Clear all filters
- Use exact invoice number in search
- Check date range filter

#### Q: Print showing blank pages
**Solution:**
- Enable "Print background graphics"
- Check printer settings
- Try different browser (Chrome recommended)

---

## 16. Permission Requirements

### Invoice Operations

| Operation | Required Permission |
|-----------|-------------------|
| View invoice list | invoices → view |
| View invoice detail | invoices → view |
| Create new invoice | invoices → create |
| Edit invoice | invoices → edit |
| Cancel & Reissue | invoices → edit |
| Print invoice | invoices → view |

### Related Operations

| Operation | Required Permission |
|-----------|-------------------|
| Create credit note | credit_notes → create |
| Create debit note | vendor_debit_notes → create |
| Record payment | payments → create |
| Create gatepass | gatepasses → create |
| View customer | vendors → view |

### Requesting Permissions
Contact your System Administrator to modify role permissions.

---

## 17. Tips & Best Practices

### Before Creating Invoice
- ✅ Verify customer GSTIN is correct
- ✅ Check stock availability for all items
- ✅ Confirm prices with latest price list
- ✅ Verify shipping address if different

### During Invoice Creation
- ✅ Use templates for consistency
- ✅ Double-check quantities before saving
- ✅ Preview before final save for large invoices
- ✅ Add internal remarks for special instructions

### After Invoice Creation
- ✅ Mark "Ready for Dispatch" promptly
- ✅ Print copy for dispatch team
- ✅ Update dispatch team about special handling

### Payment Management
- ✅ Record payments immediately when received
- ✅ Verify UTR/reference numbers
- ✅ Reconcile regularly with bank statements
- ✅ Follow up on overdue payments using Pending Payments report

### Month-End
- ✅ Complete all corrections before month close
- ✅ Ensure all credit notes are processed
- ✅ Reconcile GST reports
- ✅ Review cancelled invoices report

### General Best Practices
- 🚫 Don't create duplicate invoices
- 🚫 Don't manually change GST calculations
- 🚫 Don't share login credentials
- ✅ Use meaningful remarks for tracking
- ✅ Report issues to admin immediately

---

## 18. Glossary

| Term | Definition |
|------|------------|
| **CGST** | Central Goods and Services Tax - Goes to Central Government |
| **Credit Note** | Document reducing invoice value after GST filing |
| **Debit Note** | Document increasing invoice value |
| **FIFO** | First In First Out - Oldest invoices paid first |
| **Gatepass** | Document authorizing goods to leave facility |
| **GSTIN** | GST Identification Number - 15-digit unique ID |
| **HSN Code** | Harmonized System Nomenclature - Product classification |
| **IGST** | Integrated GST - For inter-state sales |
| **Intra-State** | Sale within same state (CGST + SGST) |
| **Inter-State** | Sale to different state (IGST) |
| **Invoice** | Bill for goods sold with GST details |
| **Outstanding** | Amount yet to be paid by customer |
| **POD** | Proof of Delivery - Confirmation of receipt |
| **SAC Code** | Service Accounting Code - For services |
| **SGST** | State Goods and Services Tax - Goes to State Government |
| **Stock Reservation** | Holding inventory for pending invoice |
| **Template** | Pre-configured format for invoices |
| **UTR** | Unique Transaction Reference - Bank transfer ID |

---

## Document Information

| Field | Value |
|-------|-------|
| Document Title | Sales Invoice Screen - User Guide |
| System | KINTO Operations & QA Management |
| Version | 1.0 |
| Last Updated | February 2024 |
| Author | System Documentation |

---

*End of Document*
