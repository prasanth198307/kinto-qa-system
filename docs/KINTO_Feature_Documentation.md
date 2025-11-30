# KINTO Smart Ops - Complete Feature Documentation

**Version:** 1.0  
**Last Updated:** November 2024  
**Company:** Inmoisure Private Limited  
**GSTIN:** 37AAHCI5047B1ZR

---

## How to Use This Documentation

This guide explains every feature of KINTO Smart Ops in simple language. Each feature includes:

| Section | What You'll Find |
|---------|------------------|
| **What is this?** | Simple explanation of the feature |
| **Why do you need it?** | Real business reasons to use this |
| **Where to find it?** | Exact navigation path and URL |
| **Screenshot** | Visual reference (capture from your screen) |
| **Step-by-Step** | Detailed instructions with examples |
| **Common Mistakes** | What to avoid |
| **FAQ** | Answers to common questions |

---

## Table of Contents

1. [Getting Started - Dashboard](#1-getting-started---dashboard)
2. [Master Data - Setting Up Your Business](#2-master-data---setting-up-your-business)
3. [Production & Inventory](#3-production--inventory)
4. [Sales & Invoicing](#4-sales--invoicing)
5. [Dispatch & Delivery](#5-dispatch--delivery)
6. [Money & Payments](#6-money--payments)
7. [Returns & Corrections](#7-returns--corrections)
8. [Daily Cash Management](#8-daily-cash-management)
9. [Quality Checklists](#9-quality-checklists)
10. [Document Storage](#10-document-storage)
11. [Reports](#11-reports)

---

# 1. Getting Started - Dashboard

## 1.1 Main Dashboard (Overview)

### What is this?
The Dashboard is your home page - the first screen you see after logging in. It shows a quick summary of everything happening in your business today.

### Why do you need it?
Imagine walking into your office and instantly knowing:
- How much you sold today
- How much money customers owe you
- What needs your attention right now
- Any pending tasks

That's what the Dashboard gives you - a bird's eye view of your entire business in one screen.

### Where to find it?

| How to Navigate | URL |
|-----------------|-----|
| **Sidebar** → Dashboard & Analytics → **Overview** | `/` |
| Or simply click the **KINTO logo** at the top | `/` |

### Screenshot
```
┌─────────────────────────────────────────────────────────────────┐
│  📊 DASHBOARD                                          [Today ▼]│
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Today's Sale │  │   Pending    │  │   Today's    │          │
│  │   ₹45,000    │  │  Payments    │  │  Production  │          │
│  │    ↑ 12%     │  │ ₹3,25,000    │  │   150 Units  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                 │
│  RECENT INVOICES                              [View All →]      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ INV-2024-0125 │ ABC Traders  │ ₹12,500 │ Pending │ View │   │
│  │ INV-2024-0124 │ XYZ Corp     │ ₹8,750  │ Paid    │ View │   │
│  │ INV-2024-0123 │ PQR Ltd      │ ₹15,000 │ Partial │ View │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  QUICK ACTIONS                                                  │
│  [+ New Invoice]  [+ New Vendor]  [Record Payment]              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**[📸 SCREENSHOT: Capture your actual Dashboard screen here]**

### What Each Card Shows

| Card | What It Means | Example |
|------|---------------|---------|
| **Today's Sale** | Total invoices created today | ₹45,000 means you billed ₹45,000 today |
| **Pending Payments** | Money customers still owe you | ₹3,25,000 is outstanding from all customers |
| **Today's Production** | Units manufactured today | 150 units produced in factory |
| **This Month Sale** | Total sales this month | Running total since 1st of month |

### Quick Actions Explained

| Button | What Happens When You Click |
|--------|----------------------------|
| **+ New Invoice** | Opens form to create a new sales bill |
| **+ New Vendor** | Opens form to add a new customer |
| **Record Payment** | Opens form to record money received |
| **View All** | Shows complete list with all entries |

### FAQ

**Q: Why doesn't the dashboard show yesterday's data?**
A: Dashboard shows TODAY's summary by default. Use the date filter (top right) to see other dates.

**Q: The numbers look wrong. What should I do?**
A: Dashboard updates in real-time. If numbers seem off:
1. Refresh the page (press F5)
2. Check if recent invoices were saved properly
3. Verify payment entries are complete

---

## 1.2 Vendor Analytics

### What is this?
A detailed analysis of your customers - who buys the most, who pays on time, who has pending payments.

### Why do you need it?
Understanding your customers helps you:
- Focus on your best customers
- Follow up with slow payers
- Plan sales strategy

### Where to find it?

| How to Navigate | URL |
|-----------------|-----|
| **Sidebar** → Dashboard & Analytics → **Vendor Analytics** | `/vendor-analytics` |

### Screenshot
```
┌─────────────────────────────────────────────────────────────────┐
│  📈 VENDOR ANALYTICS                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  VENDOR CLASSIFICATION                                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Primary (Distributors)    │████████████│  45 vendors    │  │
│  │  Secondary (Retailers)     │████████│      32 vendors    │  │
│  │  Tertiary (Walk-in)        │████│          18 vendors    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  TOP 5 CUSTOMERS BY REVENUE                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 1. ABC Distributors     │ ₹25,50,000 │ ██████████       │   │
│  │ 2. XYZ Traders          │ ₹18,75,000 │ ████████         │   │
│  │ 3. PQR Agencies         │ ₹12,25,000 │ █████            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**[📸 SCREENSHOT: Capture Vendor Analytics screen]**

---

# 2. Master Data - Setting Up Your Business

Think of Master Data as the foundation of your system. Before you can create invoices or track production, you need to set up:
- What products you sell
- Who your customers are
- What raw materials you use
- How you measure things (kg, liters, pieces)

## 2.1 Product Master

### What is this?
A complete list of all products your company makes or sells. Like a catalog of everything you offer to customers.

### Why do you need it?
When you create an invoice, you select products from this list. Each product has:
- A code (for quick identification)
- A name (what customers see)
- A price (default selling rate)
- Tax information (HSN code, GST rate)

Without this setup, you cannot create invoices.

### Where to find it?

| How to Navigate | URL |
|-----------------|-----|
| **Sidebar** → Production & Inventory → **Product Master** | `/` (Products tab) |

### Screenshot
```
┌─────────────────────────────────────────────────────────────────┐
│  📦 PRODUCT MASTER                          [+ Add Product]     │
├─────────────────────────────────────────────────────────────────┤
│  🔍 Search products...                      [Filter ▼] [Sort ▼] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Code   │ Product Name        │ Category │ Price  │ Actions ││
│  ├────────┼────────────────────┼──────────┼────────┼─────────┤│
│  │ P001   │ Moisture Barrier   │ Films    │ ₹250/kg│ ✏️ 🗑️   ││
│  │ P002   │ VCI Paper Roll     │ Paper    │ ₹180/kg│ ✏️ 🗑️   ││
│  │ P003   │ Desiccant Packets  │ Chemical │ ₹5/pc  │ ✏️ 🗑️   ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  Showing 1-10 of 45 products          [< Previous] [Next >]     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**[📸 SCREENSHOT: Capture Product Master list screen]**

### Step-by-Step: How to Add a New Product

**Scenario:** You've started making a new product called "Anti-Corrosion Film" and want to add it to the system.

#### Step 1: Open the Add Product Form
1. Go to **Sidebar** → Production & Inventory → **Product Master**
2. Click the **"+ Add Product"** button (top right corner)
3. A form will open

**[📸 SCREENSHOT: Capture empty Add Product form]**

#### Step 2: Fill in Basic Information

| Field | What to Enter | Example |
|-------|---------------|---------|
| **Product Code** | A unique short code | `ACF-001` |
| **Product Name** | Full product name | `Anti-Corrosion Film 100 micron` |
| **Description** | Optional details | `High-grade VCI film for metal protection` |

> **Tip:** Keep codes short but meaningful. ACF = Anti-Corrosion Film

#### Step 3: Select Category and Type

| Field | What to Select | Why |
|-------|----------------|-----|
| **Category** | Films | Groups similar products together |
| **Type** | VCI Films | More specific classification |
| **Brand** | In-house | Your own manufacturing |

> **Note:** Categories and Types must be created first (see sections 2.2 and 2.3)

#### Step 4: Set Measurement and Pricing

| Field | What to Enter | Example |
|-------|---------------|---------|
| **Unit of Measurement** | How you sell it | Kilogram (Kg) |
| **Selling Price** | Default rate | ₹320 per Kg |
| **Minimum Order** | Smallest quantity | 10 Kg |

#### Step 5: Add Tax Information (Very Important!)

| Field | What to Enter | Why It Matters |
|-------|---------------|----------------|
| **HSN Code** | Government code for this product | `3920` for plastic films |
| **GST Rate** | Tax percentage | 18% |

> **Warning:** Wrong HSN code or GST rate will create incorrect invoices! Check with your accountant if unsure.

#### Step 6: Save the Product
1. Review all information
2. Click **"Save"** button
3. Product appears in the list

**[📸 SCREENSHOT: Capture filled Add Product form before saving]**

### Common Mistakes to Avoid

| Mistake | Problem | Solution |
|---------|---------|----------|
| Duplicate product code | System rejects | Use unique codes |
| Wrong GST rate | Tax calculation wrong | Verify with CA |
| No HSN code | Invoice incomplete | Look up on GST portal |
| Typo in price | Billing errors | Always double-check |

### FAQ

**Q: I made a mistake in product details. Can I fix it?**
A: Yes! Click the ✏️ (edit) button next to the product and make changes.

**Q: Can I delete a product?**
A: Only if it hasn't been used in any invoice. Otherwise, you can mark it as "Inactive".

**Q: What if I sell the same product in different sizes?**
A: Create separate product entries for each size:
- Anti-Corrosion Film 50 micron (ACF-050)
- Anti-Corrosion Film 100 micron (ACF-100)
- Anti-Corrosion Film 150 micron (ACF-150)

---

## 2.2 Product Categories

### What is this?
A way to group similar products together. Think of it like folders on your computer.

### Why do you need it?
Categories help you:
- Find products quickly
- Generate category-wise reports
- Organize a large product catalog

### Examples of Categories
| Category | Products Inside |
|----------|-----------------|
| Films | VCI Film, Barrier Film, Stretch Film |
| Papers | VCI Paper, Kraft Paper, Crepe Paper |
| Chemicals | Desiccants, Rust Preventives |
| Packaging | Boxes, Bags, Pouches |

### Where to find it?

| How to Navigate | URL |
|-----------------|-----|
| **Sidebar** → Production & Inventory → **Product Categories** | `/` (Categories tab) |

### Step-by-Step: Add a Category

1. Click **"+ Add Category"** button
2. Enter Category Code: `FLM`
3. Enter Category Name: `Films`
4. Add Description (optional): `All types of protective films`
5. Click **"Save"**

**[📸 SCREENSHOT: Capture Add Category form]**

---

## 2.3 Product Types

### What is this?
A sub-classification within categories. More specific grouping.

### Real-World Example
```
Category: Films
├── Type: VCI Films (for corrosion protection)
├── Type: Barrier Films (for moisture protection)
├── Type: Stretch Films (for wrapping)
└── Type: Shrink Films (for heat shrinking)
```

### Where to find it?

| How to Navigate | URL |
|-----------------|-----|
| **Sidebar** → Production & Inventory → **Product Types** | `/` (Types tab) |

---

## 2.4 Raw Materials

### What is this?
Materials you purchase to manufacture your products. The "ingredients" that go into making finished goods.

### Why do you need it?
- Track what raw materials you have in stock
- Know when to reorder
- Calculate production costs
- Manage Bill of Materials (BOM)

### Examples
| Raw Material | Used For |
|--------------|----------|
| LDPE Granules | Making plastic films |
| VCI Powder | Adding anti-corrosion properties |
| Kraft Paper Rolls | Base for VCI paper |
| Adhesive | Lamination |

### Where to find it?

| How to Navigate | URL |
|-----------------|-----|
| **Sidebar** → Production & Inventory → **Raw Materials** | `/` (Raw Materials tab) |

### Screenshot
```
┌─────────────────────────────────────────────────────────────────┐
│  📦 RAW MATERIALS                        [+ Add Raw Material]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Code   │ Material Name     │ Stock    │ UOM  │ Reorder Lvl ││
│  ├────────┼──────────────────┼──────────┼──────┼─────────────┤│
│  │ RM001  │ LDPE Granules    │ 5,000 kg │ Kg   │ 1,000 kg    ││
│  │ RM002  │ VCI Powder       │ 250 kg   │ Kg   │ 100 kg ⚠️   ││
│  │ RM003  │ Kraft Paper      │ 3,500 kg │ Kg   │ 500 kg      ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ⚠️ = Stock below reorder level                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**[📸 SCREENSHOT: Capture Raw Materials list]**

### Key Fields Explained

| Field | What It Means | Example |
|-------|---------------|---------|
| **Material Code** | Unique identifier | RM001 |
| **Material Name** | What you call it | LDPE Granules |
| **UOM** | How you measure it | Kilogram |
| **Current Stock** | How much you have now | 5,000 kg |
| **Reorder Level** | When to order more | 1,000 kg (alert when stock falls below) |
| **Loss Percentage** | Expected wastage | 2% (some material wasted in production) |

---

## 2.5 Vendor Master (Customer Database)

### What is this?
Your complete customer database. Everyone you sell to is called a "Vendor" in this system.

### Why do you need it?
- Store customer contact details
- Track their purchase history
- See how much they owe you
- Auto-fill their details in invoices
- Classify customers for better management

### Where to find it?

| How to Navigate | URL |
|-----------------|-----|
| **Sidebar** → Master Data → **Vendor Master** | `/vendor-management` |

### Screenshot
```
┌─────────────────────────────────────────────────────────────────┐
│  🏢 VENDOR MASTER                              [+ Add Vendor]   │
├─────────────────────────────────────────────────────────────────┤
│  🔍 Search by name, code, or mobile...         [Type ▼] [All ▼]│
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Code  │ Vendor Name      │ Mobile     │ GSTIN   │ Balance  ││
│  ├───────┼─────────────────┼────────────┼─────────┼──────────┤│
│  │ V001  │ ABC Traders     │ 9876543210 │ 37AAA.. │ ₹45,000  ││
│  │ V002  │ XYZ Industries  │ 9123456789 │ 37BBB.. │ ₹0       ││
│  │ V003  │ PQR Agencies    │ 9988776655 │ -       │ ₹12,500  ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  Total: 178 vendors                    [< Previous] [Next >]    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**[📸 SCREENSHOT: Capture Vendor Master list]**

### Step-by-Step: Add a New Customer

**Scenario:** A new company "Reliable Packaging Ltd" wants to buy from you. You need to add them to the system.

#### Step 1: Open the Form
1. Go to **Sidebar** → Master Data → **Vendor Master**
2. Click **"+ Add Vendor"** button

#### Step 2: Enter Basic Details

| Field | What to Enter | Example |
|-------|---------------|---------|
| **Vendor Code** | Unique identifier | `V179` (auto-generated) |
| **Vendor Name** | Company name | `Reliable Packaging Ltd` |
| **Contact Person** | Who to talk to | `Mr. Suresh Kumar` |
| **Mobile Number** | Primary phone | `9876543210` |
| **Email** | Email address | `suresh@reliablepkg.com` |

#### Step 3: Enter GST Details

| Field | What to Enter | Notes |
|-------|---------------|-------|
| **GSTIN** | 15-digit GST number | `37ABCDE1234F1Z5` |
| **PAN** | 10-digit PAN | Auto-extracted from GSTIN |
| **State** | State from GSTIN | Auto-detected |

> **Note:** GSTIN format is: 2 digits state code + 10 digit PAN + 1 digit entity + 1 digit check
> Example: `37` (Andhra Pradesh) + `ABCDE1234F` (PAN) + `1` + `Z` + `5`

#### Step 4: Enter Address

| Field | Example |
|-------|---------|
| **Address Line 1** | Plot No. 45, Industrial Area |
| **Address Line 2** | Phase-2, Sector 5 |
| **City** | Visakhapatnam |
| **State** | Andhra Pradesh |
| **PIN Code** | 530012 |

#### Step 5: Assign Vendor Type

Select which types apply to this customer:
- [ ] Distributor (buys in large quantities)
- [x] Retailer (buys for resale)
- [ ] End User (uses products themselves)
- [ ] Government (PSU/Government agency)

#### Step 6: Set Credit Terms (Optional)

| Field | What to Enter | Notes |
|-------|---------------|-------|
| **Credit Limit** | ₹2,00,000 | Maximum outstanding allowed |
| **Credit Days** | 30 days | Payment due within 30 days |

#### Step 7: Save
Click **"Save"** button. The new vendor appears in the list.

**[📸 SCREENSHOT: Capture filled Add Vendor form]**

### Vendor Classification System

KINTO uses a 3-tier classification to help you understand your customer base:

| Tier | Who They Are | Characteristics |
|------|--------------|-----------------|
| **Primary** | Big buyers (Distributors) | High volume, regular orders, good payment history |
| **Secondary** | Medium buyers (Retailers) | Moderate volume, periodic orders |
| **Tertiary** | Small buyers (Walk-in) | One-time or occasional, small orders |

This classification helps you:
- Prioritize follow-ups
- Set credit limits appropriately
- Generate tier-wise sales reports

### FAQ

**Q: Customer doesn't have GST number. Can I still add them?**
A: Yes! GSTIN is optional. Leave it blank for unregistered customers.

**Q: Can I have multiple contacts for one vendor?**
A: Currently, store primary contact in the vendor record. Add secondary contacts in the Notes field.

**Q: How do I update customer address?**
A: Click the ✏️ (edit) icon next to the vendor and update any field.

---

## 2.6 Unit of Measurement (UOM)

### What is this?
Standard units used to measure your products and materials - Kilogram, Liter, Piece, Meter, etc.

### Why do you need it?
- Consistent measurement across the system
- Accurate quantity tracking
- Proper invoicing

### Common UOMs

| Code | Full Name | Used For |
|------|-----------|----------|
| Kg | Kilogram | Films, papers by weight |
| Ltr | Liter | Liquids, chemicals |
| Pcs | Pieces | Desiccant packets, boxes |
| Mtr | Meter | Rolls, lengths |
| Rll | Roll | Paper rolls, film rolls |
| Box | Box | Packaged items |
| Bag | Bag | Bulk materials |

### Where to find it?

| How to Navigate | URL |
|-----------------|-----|
| **Sidebar** → Master Data → **Unit of Measurement** | `/` (UOM tab) |

---

# 3. Production & Inventory

## 3.1 Raw Material Issuance

### What is this?
When you take materials from store and give them to the production floor, you "issue" them. This feature tracks every material taken for production.

### Why do you need it?
Imagine your storeroom has 5,000 kg of LDPE granules. Production needs 500 kg today. After issuing:
- Store shows: 4,500 kg remaining
- Production floor has: 500 kg to use
- You have a record of who took what and when

### Where to find it?

| How to Navigate | URL |
|-----------------|-----|
| **Sidebar** → Production & Inventory → **Raw Material Issuance** | `/` (Issuance tab) |

### Screenshot
```
┌─────────────────────────────────────────────────────────────────┐
│  📤 RAW MATERIAL ISSUANCE                    [+ New Issuance]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Today's Issuances                              [Date: Nov 30]  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Issue # │ Time  │ Issued To    │ Materials │ Status        ││
│  ├─────────┼───────┼─────────────┼───────────┼───────────────┤│
│  │ ISS-045 │ 09:30 │ Line 1      │ 3 items   │ ✅ Completed   ││
│  │ ISS-046 │ 11:15 │ Line 2      │ 2 items   │ ✅ Completed   ││
│  │ ISS-047 │ 14:00 │ Line 1      │ 1 item    │ 🕐 Pending     ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**[📸 SCREENSHOT: Capture Issuance list screen]**

### Step-by-Step: Issue Materials to Production

**Scenario:** Production Line 1 needs LDPE Granules and VCI Powder to make VCI Film.

#### Step 1: Start New Issuance
1. Click **"+ New Issuance"** button
2. Form opens

#### Step 2: Fill Header Information

| Field | What to Enter | Example |
|-------|---------------|---------|
| **Issue Date** | Today's date | `30-Nov-2024` (auto-filled) |
| **Issued To** | Production line or person | `Line 1 - Morning Shift` |
| **Purpose** | What will be made | `VCI Film 100 micron production` |

#### Step 3: Add Materials

Click **"+ Add Item"** for each material:

**Item 1:**
| Field | Value |
|-------|-------|
| Material | LDPE Granules |
| Requested Quantity | 500 kg |
| Available Stock | 5,000 kg ✅ |

**Item 2:**
| Field | Value |
|-------|-------|
| Material | VCI Powder |
| Requested Quantity | 25 kg |
| Available Stock | 250 kg ✅ |

#### Step 4: Review and Issue
1. Check all quantities are correct
2. Click **"Issue Materials"** button
3. System updates:
   - LDPE stock: 5,000 → 4,500 kg
   - VCI Powder stock: 250 → 225 kg
4. Issuance record created with number ISS-048

**[📸 SCREENSHOT: Capture New Issuance form with items]**

### What If Stock Is Not Enough?

```
┌─────────────────────────────────────────────────┐
│  ⚠️ Insufficient Stock                          │
│                                                 │
│  Material: VCI Powder                           │
│  Requested: 300 kg                              │
│  Available: 250 kg                              │
│                                                 │
│  You cannot issue more than available stock.    │
│                                                 │
│  [Adjust Quantity]    [Cancel]                  │
│                                                 │
└─────────────────────────────────────────────────┘
```

The system prevents you from issuing more than what's in stock. You must either:
- Reduce the quantity to what's available
- Wait for new stock to arrive

---

## 3.2 Production Entries

### What is this?
Recording what was produced today. Tracks finished goods output and compares with expected production based on Bill of Materials (BOM).

### Why do you need it?
- Know exactly how much you manufactured
- Compare actual vs expected material usage
- Identify wastage or efficiency issues
- Update finished goods inventory

### Where to find it?

| How to Navigate | URL |
|-----------------|-----|
| **Sidebar** → Production & Inventory → **Production Entries** | `/` (Production tab) |

### What is Bill of Materials (BOM)?

BOM tells you: "To make 100 kg of VCI Film, you need X kg of LDPE and Y kg of VCI Powder."

Example BOM for VCI Film 100 micron:
| Raw Material | Quantity per 100 kg Output |
|--------------|---------------------------|
| LDPE Granules | 95 kg |
| VCI Powder | 5 kg |
| Expected Loss | 2% |

So for 100 kg film, you use 100 kg raw materials (95 + 5), expecting 2 kg loss.

### Step-by-Step: Record Production

#### Step 1: Open Production Entry
1. Go to **Sidebar** → Production & Inventory → **Production Entries**
2. Click **"+ New Entry"**

#### Step 2: Select Product

| Field | Selection |
|-------|-----------|
| Product | VCI Film 100 micron |
| BOM | Auto-selected based on product |

#### Step 3: Enter Production Quantity

| Field | Value |
|-------|-------|
| Production Date | 30-Nov-2024 |
| Production Quantity | 450 kg |
| Shift | Morning |
| Machine | Extruder Line 1 |

#### Step 4: System Calculates Expected Materials

Based on BOM (for 450 kg output):
| Material | Expected Usage |
|----------|----------------|
| LDPE Granules | 427.5 kg |
| VCI Powder | 22.5 kg |

#### Step 5: Enter Actual Materials Used

| Material | Expected | Actual | Variance |
|----------|----------|--------|----------|
| LDPE Granules | 427.5 kg | 435 kg | +7.5 kg (1.75% over) |
| VCI Powder | 22.5 kg | 23 kg | +0.5 kg (2.2% over) |

#### Step 6: Review Variance

```
┌─────────────────────────────────────────────────────────────────┐
│  📊 VARIANCE ANALYSIS                                           │
│                                                                 │
│  LDPE Granules: +1.75% (within acceptable range ✅)             │
│  VCI Powder: +2.2% (within acceptable range ✅)                 │
│                                                                 │
│  Overall Efficiency: 98.1%                                      │
│                                                                 │
│  Status: Normal - No action required                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Step 7: Save Entry
Click **"Save"** to record the production entry.

**[📸 SCREENSHOT: Capture Production Entry form]**

### Understanding Variance

| Variance Range | Status | What It Means |
|----------------|--------|---------------|
| 0-5% | Normal ✅ | Expected variation, no concern |
| 5-10% | Warning ⚠️ | Review process, might be issue |
| >10% | Alert 🔴 | Investigate immediately |

Possible reasons for high variance:
- Machine malfunction
- Material quality issue
- Operator error
- Wrong BOM settings

---

## 3.3 Production Reconciliation

### What is this?
End-of-day check that compares:
- Materials issued to production
- Materials actually used
- Finished goods produced
- Any leftover materials

### Why do you need it?
Ensures nothing is lost or misused. Like balancing your cash register at end of day, but for materials.

### Where to find it?

| How to Navigate | URL |
|-----------------|-----|
| **Sidebar** → Production & Inventory → **Production Reconciliation** | `/` (Reconciliation tab) |

### The Formula

```
Issued Materials = Used Materials + Returned Materials + Loss
```

If this doesn't balance, there's a problem that needs investigation.

**[📸 SCREENSHOT: Capture Production Reconciliation screen]**

---

# 4. Sales & Invoicing

## 4.1 Creating Sales Invoices

### What is this?
The bill you give to customers when they buy from you. A legal document showing what was sold, prices, taxes, and total amount.

### Why do you need it?
- Get paid by customers
- Legal requirement for GST
- Track what was sold to whom
- Proof of sale for accounting

### Where to find it?

| How to Navigate | URL |
|-----------------|-----|
| **Sidebar** → Finance & Sales → **Sales Invoices** | `/` (Invoices tab) |

### Screenshot: Invoice List
```
┌─────────────────────────────────────────────────────────────────┐
│  🧾 SALES INVOICES                             [+ New Invoice]  │
├─────────────────────────────────────────────────────────────────┤
│  🔍 Search invoice...    [Status ▼] [Date Range ▼] [Vendor ▼]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Invoice #    │ Date       │ Vendor      │ Amount   │ Status ││
│  ├──────────────┼────────────┼────────────┼──────────┼────────┤│
│  │ INV-2024-125 │ 30-Nov-24  │ ABC Traders │ ₹45,500  │ 🟢 Paid││
│  │ INV-2024-124 │ 29-Nov-24  │ XYZ Corp    │ ₹32,750  │ 🟡 Part││
│  │ INV-2024-123 │ 28-Nov-24  │ PQR Ltd     │ ₹18,900  │ 🔴 Due ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  Total: 125 invoices  │  Value: ₹45,25,000  │  Pending: ₹8,50,000│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**[📸 SCREENSHOT: Capture Invoice List screen]**

### Step-by-Step: Create a New Invoice

**Scenario:** Customer "ABC Traders" orders:
- 100 kg VCI Film at ₹320/kg
- 50 kg Barrier Film at ₹280/kg

#### Step 1: Open New Invoice Form
1. Go to **Sidebar** → Finance & Sales → **Sales Invoices**
2. Click **"+ New Invoice"** button
3. Invoice form opens

#### Step 2: Select Invoice Template

| Template | Use When |
|----------|----------|
| Standard Invoice | Regular sales |
| Tax Invoice | GST registered parties |
| Proforma Invoice | Quotations |

Select: **Tax Invoice**

#### Step 3: Select Customer

1. Click **"Select Buyer"** dropdown
2. Type "ABC" to search
3. Select "ABC Traders"
4. Details auto-fill:
   - Name: ABC Traders
   - GSTIN: 37ABCDE1234F1Z5
   - Address: Industrial Area, Visakhapatnam
   - State: Andhra Pradesh

**[📸 SCREENSHOT: Capture buyer selection dropdown]**

#### Step 4: Add Invoice Items

Click **"+ Add Item"**:

**Item 1:**
| Field | Value |
|-------|-------|
| Product | VCI Film 100 micron |
| HSN Code | 3920 (auto-filled) |
| Quantity | 100 |
| UOM | Kg |
| Rate | ₹320 |
| Discount | 0% |
| **Taxable Value** | **₹32,000** |

**Item 2:**
| Field | Value |
|-------|-------|
| Product | Barrier Film |
| HSN Code | 3920 (auto-filled) |
| Quantity | 50 |
| UOM | Kg |
| Rate | ₹280 |
| Discount | 0% |
| **Taxable Value** | **₹14,000** |

#### Step 5: Review Tax Calculation

System automatically calculates GST:

```
┌─────────────────────────────────────────────────┐
│  TAX SUMMARY                                    │
│                                                 │
│  Subtotal (before tax):        ₹46,000.00      │
│                                                 │
│  CGST @ 9%:                     ₹4,140.00      │
│  SGST @ 9%:                     ₹4,140.00      │
│                                                 │
│  ─────────────────────────────────────────     │
│  GRAND TOTAL:                  ₹54,280.00      │
│                                                 │
└─────────────────────────────────────────────────┘
```

> **Note:** CGST + SGST applies when you and customer are in same state (intra-state).
> IGST applies when customer is in different state (inter-state).

#### Step 6: Add Payment Terms

| Field | Value |
|-------|-------|
| Payment Terms | 30 Days |
| Due Date | 30-Dec-2024 (auto-calculated) |
| Bank Details | STATE BANK OF INDIA, A/c: 43130528170, IFSC: SBIN0002704 |
| Notes | Standard terms apply |

#### Step 7: Preview Invoice

Click **"Preview"** to see how it will look when printed.

```
┌─────────────────────────────────────────────────────────────────┐
│                    INMOISURE PRIVATE LIMITED                    │
│               Industrial Area, Visakhapatnam, AP                │
│              GSTIN: 37AAHCI5047B1ZR | PAN: AAHCI5047B           │
│                                                                 │
│                        TAX INVOICE                              │
│                                                                 │
│  Invoice No: INV-2024-126          Date: 30-Nov-2024           │
│                                                                 │
│  Bill To:                          Ship To:                     │
│  ABC Traders                       Same as billing              │
│  GSTIN: 37ABCDE1234F1Z5                                        │
│  Industrial Area, Vizag                                         │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ # │ Description      │ HSN  │ Qty │ Rate  │ Amount     │   │
│  ├───┼─────────────────┼──────┼─────┼───────┼────────────┤   │
│  │ 1 │ VCI Film 100mic │ 3920 │ 100 │ ₹320  │ ₹32,000    │   │
│  │ 2 │ Barrier Film    │ 3920 │ 50  │ ₹280  │ ₹14,000    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│                                    Subtotal:    ₹46,000        │
│                                    CGST (9%):    ₹4,140        │
│                                    SGST (9%):    ₹4,140        │
│                                    ───────────────────         │
│                                    TOTAL:       ₹54,280        │
│                                                                 │
│  Amount in words: Fifty Four Thousand Two Hundred Eighty Only  │
│                                                                 │
│  Bank: STATE BANK OF INDIA         [QR CODE]                   │
│  A/c: 43130528170                  Scan to pay                 │
│  IFSC: SBIN0002704                 via UPI                     │
│                                                                 │
│  Terms & Conditions:                                            │
│  1. Payment due within 30 days                                  │
│  2. Goods once sold will not be taken back                     │
│                                                                 │
│  Authorized Signatory: _______________                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**[📸 SCREENSHOT: Capture Invoice Preview]**

#### Step 8: Save Invoice

| Button | What It Does |
|--------|--------------|
| **Save as Draft** | Saves but doesn't finalize |
| **Save** | Creates final invoice |
| **Save & Print** | Creates and opens print dialog |

Click **"Save & Print"**.

### Invoice Status Explained

| Status | Color | Meaning |
|--------|-------|---------|
| Draft | ⚪ Gray | Not finalized yet |
| Pending | 🔴 Red | No payment received |
| Partial | 🟡 Yellow | Some payment received |
| Paid | 🟢 Green | Fully paid |
| Cancelled | ⚫ Black | Cancelled invoice |

### Common Mistakes to Avoid

| Mistake | Problem | Prevention |
|---------|---------|------------|
| Wrong customer selected | Invoice goes to wrong party | Double-check before saving |
| Incorrect quantity | Billing error | Verify with sales order |
| Wrong rate entered | Under/over billing | Use default rates, adjust only if needed |
| Missed GST | Tax compliance issue | System auto-calculates, don't override |

---

## 4.2 Invoice Detail Page

### What is this?
When you click on any invoice, you see its complete details plus available actions.

### Where to find it?

| How to Navigate | URL |
|-----------------|-----|
| From Invoice List → Click any invoice row | `/invoice/:id` |
| Or search for invoice number | `/invoice/123` |

### What You See on This Page

```
┌─────────────────────────────────────────────────────────────────┐
│  🧾 INVOICE: INV-2024-126                      Status: 🔴 Due   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────┐  ┌─────────────────────────────┐  │
│  │ INVOICE DETAILS         │  │ BUYER DETAILS               │  │
│  │                         │  │                             │  │
│  │ Date: 30-Nov-2024       │  │ ABC Traders                 │  │
│  │ Due Date: 30-Dec-2024   │  │ GSTIN: 37ABCDE1234F1Z5      │  │
│  │ Total: ₹54,280          │  │ Visakhapatnam, AP           │  │
│  │ Received: ₹0            │  │ Mobile: 9876543210          │  │
│  │ Balance: ₹54,280        │  │                             │  │
│  └─────────────────────────┘  └─────────────────────────────┘  │
│                                                                 │
│  ITEMS                                                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ # │ Product         │ Qty  │ Rate   │ GST    │ Amount  │   │
│  ├───┼────────────────┼──────┼────────┼────────┼─────────┤   │
│  │ 1 │ VCI Film 100mic│ 100  │ ₹320   │ ₹5,760 │ ₹37,760 │   │
│  │ 2 │ Barrier Film   │ 50   │ ₹280   │ ₹2,520 │ ₹16,520 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  PAYMENT HISTORY                                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ (No payments recorded yet)                              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ACTIONS                                                        │
│  [🖨️ Print] [📤 Create Gatepass] [💳 Record Payment]           │
│  [❌ Cancel & Reissue] [📝 Create Credit Note]                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**[📸 SCREENSHOT: Capture Invoice Detail page]**

### Available Actions Explained

| Button | When Available | What Happens |
|--------|----------------|--------------|
| **Print** | Always | Opens PDF for printing |
| **Create Gatepass** | No gatepass exists | Creates dispatch document |
| **Record Payment** | Invoice not fully paid | Opens payment form |
| **Cancel & Reissue** | Same month, no gatepass | Cancels this, creates new |
| **Create Credit Note** | After gatepass created | For adjustments |
| **Create Debit Note** | Previous month invoice | For increases |

---

## 4.3 Cancel & Reissue Invoice

### What is this?
If you made a mistake in an invoice (wrong price, wrong quantity, wrong customer), you can cancel it and create a new one.

### When to use?
- **Current month invoice** only
- **Before gatepass** is created
- Wrong price entered
- Wrong quantity
- Wrong product selected
- Wrong customer

### Where to find it?

| How to Navigate |
|-----------------|
| Open Invoice Detail → Click **"Cancel & Reissue"** button |

### GST Rule (Very Important!)

| Invoice Month | Correction Method | Why |
|---------------|-------------------|-----|
| **Current Month** | Cancel & Reissue | GST return not yet filed |
| **Previous Month** | Credit Note (for reduction) | GST return already filed |
| **Previous Month** | Debit Note (for increase) | GST return already filed |

### Step-by-Step: Cancel & Reissue

#### Scenario
You created Invoice INV-2024-126 today with wrong rate (₹320 instead of ₹350).

#### Step 1: Open the Invoice
1. Go to **Invoice List**
2. Find INV-2024-126
3. Click to open detail page

#### Step 2: Click Cancel & Reissue
1. Click **"Cancel & Reissue"** button
2. A confirmation appears:

```
┌─────────────────────────────────────────────────┐
│  ⚠️ Cancel Invoice?                             │
│                                                 │
│  You are about to cancel INV-2024-126           │
│                                                 │
│  Please enter reason for cancellation:          │
│  ┌─────────────────────────────────────────┐   │
│  │ Wrong rate entered - should be ₹350    │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  A new invoice will be created for editing.     │
│                                                 │
│  [Yes, Cancel & Create New]    [No, Go Back]   │
│                                                 │
└─────────────────────────────────────────────────┘
```

#### Step 3: Confirm Cancellation
1. Enter reason: "Wrong rate entered - should be ₹350"
2. Click **"Yes, Cancel & Create New"**

#### Step 4: System Actions
The system automatically:
1. Marks INV-2024-126 as **Cancelled**
2. Records cancellation reason and timestamp
3. Creates new invoice INV-2024-127 with same items
4. Opens INV-2024-127 for editing

#### Step 5: Make Corrections
1. Change rate from ₹320 to ₹350
2. Review updated totals
3. Click **"Save"**

#### Result
- INV-2024-126: Cancelled (visible in Cancelled Invoices Report)
- INV-2024-127: New corrected invoice

**[📸 SCREENSHOT: Capture Cancel & Reissue confirmation dialog]**

### What You CANNOT Cancel

| Situation | Why Not | What To Do Instead |
|-----------|---------|-------------------|
| Invoice from last month | GST return filed | Create Credit/Debit Note |
| Invoice with Gatepass | Goods already dispatched | Create Credit Note |
| Invoice already paid | Financial transaction done | Create Credit Note |

---

# 5. Dispatch & Delivery

## 5.1 Gatepasses

### What is this?
A gatepass is official permission for goods to leave your premises. The security guard needs this document to let the vehicle out.

### Why do you need it?
- Proof that goods were sent
- Security control at exit gate
- Triggers inventory reduction
- Part of dispatch workflow

### Important: When does inventory reduce?

```
Invoice Created → Inventory: NO change
     ↓
Gatepass Created → Inventory: REDUCED ✅
     ↓
Dispatched → Already reduced
```

> **Key Point:** Stock is deducted when Gatepass is created, NOT when Invoice is created.

### Where to find it?

| How to Navigate | URL |
|-----------------|-----|
| **Sidebar** → Dispatch & Logistics → **Gatepasses** | `/` (Gatepasses tab) |

### Step-by-Step: Create Gatepass from Invoice

#### Step 1: Open Invoice
1. Go to **Invoice Detail** page for the invoice
2. Or search in Invoice List

#### Step 2: Click Create Gatepass
1. Click **"Create Gatepass"** button
2. Gatepass form opens with invoice items pre-filled

#### Step 3: Enter Vehicle Details

| Field | What to Enter | Example |
|-------|---------------|---------|
| **Vehicle Number** | Truck/tempo number | AP09TA1234 |
| **Driver Name** | Driver's name | Ramesh Kumar |
| **Driver Phone** | Contact number | 9876543210 |
| **Transporter** | Transport company | Sri Sai Transport |

#### Step 4: Verify Items

System shows items from invoice:
| Product | Invoice Qty | Gatepass Qty |
|---------|-------------|--------------|
| VCI Film 100 micron | 100 kg | 100 kg |
| Barrier Film | 50 kg | 50 kg |

You can adjust if partial dispatch.

#### Step 5: Create Gatepass
1. Click **"Create Gatepass"**
2. System generates gatepass number: GP-2024-089
3. Inventory is reduced

**[📸 SCREENSHOT: Capture Create Gatepass form]**

### Gatepass Document

```
┌─────────────────────────────────────────────────────────────────┐
│                         GATE PASS                               │
│                                                                 │
│  Gatepass No: GP-2024-089          Date: 30-Nov-2024           │
│  Invoice No: INV-2024-126          Time: 14:30                 │
│                                                                 │
│  Consignee: ABC Traders, Industrial Area, Visakhapatnam        │
│                                                                 │
│  Vehicle No: AP09TA1234            Driver: Ramesh Kumar        │
│  Transporter: Sri Sai Transport    Phone: 9876543210           │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ # │ Description         │ Quantity │ UOM │ Remarks     │   │
│  ├───┼────────────────────┼──────────┼─────┼─────────────┤   │
│  │ 1 │ VCI Film 100 micron │ 100      │ Kg  │ 5 rolls     │   │
│  │ 2 │ Barrier Film        │ 50       │ Kg  │ 3 rolls     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Prepared By: ___________    Security: ___________              │
│                              Gate Out Time: ___________         │
│                                                                 │
│  Note: This is an outward gate pass. Security to stamp after   │
│  verification.                                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**[📸 SCREENSHOT: Capture Gatepass Print Preview]**

---

## 5.2 Dispatch Tracking

### What is this?
Track where your goods are - from warehouse to customer's door. A 5-stage journey.

### Why do you need it?
- Know status of every shipment
- Answer customer queries ("Where is my order?")
- Identify delayed deliveries
- Confirm delivery with proof

### Where to find it?

| How to Navigate | URL |
|-----------------|-----|
| **Sidebar** → Dispatch & Logistics → **Dispatch Tracking** | `/dispatch-tracking` |

### The 5-Stage Journey

```
Stage 1          Stage 2          Stage 3          Stage 4          Stage 5
INVOICE    →    GATEPASS    →    DISPATCHED   →   IN TRANSIT   →   DELIVERED
CREATED         CREATED          (Left Gate)      (On the way)      (POD Done)
   📄              📦               🚚               🛣️               ✅
```

### Screenshot: Dispatch Tracking Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│  🚚 DISPATCH TRACKING                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  STATUS SUMMARY                                                 │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐  │
│  │ Pending GP │ │ Ready to   │ │ In Transit │ │ Delivered  │  │
│  │     5      │ │ Dispatch: 8│ │     3      │ │  Today: 12 │  │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Invoice     │ Vendor      │ Stage        │ Updated   │ Act ││
│  ├─────────────┼────────────┼──────────────┼───────────┼─────┤│
│  │ INV-2024-126│ ABC Traders │ 🚚 Dispatched│ 2h ago    │ [→] ││
│  │ INV-2024-125│ XYZ Corp    │ 📦 GP Ready  │ 3h ago    │ [→] ││
│  │ INV-2024-124│ PQR Ltd     │ ✅ Delivered │ Yesterday │ [📸]││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**[📸 SCREENSHOT: Capture Dispatch Tracking dashboard]**

### Step-by-Step: Update Dispatch Status

#### Mark as Dispatched
When vehicle leaves your gate:
1. Find the invoice in Dispatch Tracking
2. Click **"Mark Dispatched"** button
3. Confirm dispatch time
4. Status changes to 🚚 Dispatched

#### Mark as Delivered (Capture POD)
When driver confirms delivery:
1. Find the dispatched invoice
2. Click **"Mark Delivered"** button
3. Enter delivery details:

| Field | Example |
|-------|---------|
| Delivered To | Mr. Suresh (Stores) |
| Delivery Time | 30-Nov-2024, 16:45 |
| Receiver Signature | [Upload photo] |
| Delivery Photo | [Upload photo] |

4. Click **"Confirm Delivery"**
5. Status changes to ✅ Delivered

**[📸 SCREENSHOT: Capture POD (Proof of Delivery) form]**

---

# 6. Money & Payments

## 6.1 Vendor History (Customer Ledger)

### What is this?
A complete record of every transaction with a customer:
- All invoices you sent them
- All payments they made
- All credit notes issued
- Running balance (how much they owe)

### Why do you need it?
- Check customer balance quickly
- Settle disputes with clear records
- Follow up on pending payments
- Account reconciliation

### Where to find it?

| How to Navigate | URL |
|-----------------|-----|
| **Sidebar** → Finance & Sales → **Vendor History** | `/vendor-history` |
| Click on vendor → **View Details** | `/vendor-history/:vendorId` |

### Screenshot: Vendor List

```
┌─────────────────────────────────────────────────────────────────┐
│  📋 VENDOR HISTORY                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  SUMMARY                                                        │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │ Total Billed │ │ Total Paid   │ │ Outstanding  │            │
│  │ ₹85,89,399   │ │ ₹77,85,855   │ │ ₹8,03,544    │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
│                                                                 │
│  🔍 Search vendor...                              [Export]      │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Vendor Name      │ Total Invoiced │ Paid     │ Balance     ││
│  ├─────────────────┼────────────────┼──────────┼─────────────┤│
│  │ ABC Traders     │ ₹12,50,000     │ ₹10,00,000│ ₹2,50,000  ││
│  │ XYZ Industries  │ ₹8,75,000      │ ₹8,75,000 │ ₹0         ││
│  │ PQR Agencies    │ ₹5,25,000      │ ₹4,00,000 │ ₹1,25,000  ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  Total Vendors: 178                   [< Previous] [Next >]     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**[📸 SCREENSHOT: Capture Vendor History list]**

### Screenshot: Individual Vendor Ledger

```
┌─────────────────────────────────────────────────────────────────┐
│  📋 ABC TRADERS - Transaction History            [🖨️ Print]     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  VENDOR INFO                                                    │
│  Code: V001 │ GSTIN: 37ABCDE1234F1Z5 │ Mobile: 9876543210      │
│  Address: Industrial Area, Visakhapatnam, AP 530012            │
│                                                                 │
│  BALANCE SUMMARY                                                │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐  │
│  │ Invoiced   │ │ Payments   │ │ Credits    │ │ Balance    │  │
│  │ ₹12,50,000 │ │ ₹10,00,000 │ │ ₹25,000    │ │ ₹2,25,000  │  │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘  │
│                                                                 │
│  TRANSACTION LEDGER                         [Filter: All ▼]    │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Date       │ Particulars    │ Debit    │ Credit   │ Balance││
│  ├────────────┼───────────────┼──────────┼──────────┼────────┤│
│  │ 01-Nov-24  │ Opening Bal   │          │          │ ₹1,50,000│
│  │ 05-Nov-24  │ INV-2024-101  │ ₹45,000  │          │ ₹1,95,000│
│  │ 10-Nov-24  │ Payment Recd  │          │ ₹50,000  │ ₹1,45,000│
│  │ 15-Nov-24  │ INV-2024-115  │ ₹32,000  │          │ ₹1,77,000│
│  │ 20-Nov-24  │ Credit Note   │          │ ₹2,000   │ ₹1,75,000│
│  │ 25-Nov-24  │ Payment Recd  │          │ ₹50,000  │ ₹1,25,000│
│  │ 30-Nov-24  │ INV-2024-126  │ ₹54,280  │          │ ₹1,79,280│
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  Current Balance Due: ₹1,79,280                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**[📸 SCREENSHOT: Capture individual vendor ledger]**

### Understanding the Ledger

| Column | Meaning |
|--------|---------|
| **Date** | When transaction happened |
| **Particulars** | What kind of transaction (Invoice/Payment/Credit Note) |
| **Debit** | Increases what customer owes (invoices, debit notes) |
| **Credit** | Decreases what customer owes (payments, credit notes) |
| **Balance** | Running total after each transaction |

### The Balance Formula

```
Balance = Opening Balance + Invoices + Debit Notes - Payments - Credit Notes
```

Example:
- Opening: ₹1,50,000
- New Invoice: +₹45,000 = ₹1,95,000
- Payment: -₹50,000 = ₹1,45,000
- Credit Note: -₹2,000 = ₹1,43,000

---

## 6.2 Pending Payments

### What is this?
Dashboard showing all outstanding amounts from customers, organized by age.

### Why do you need it?
- Know exactly how much is pending collection
- Identify old unpaid invoices
- Prioritize follow-ups
- Cash flow planning

### Where to find it?

| How to Navigate | URL |
|-----------------|-----|
| **Sidebar** → Finance & Sales → **Pending Payments** | `/pending-payments` |

### Screenshot

```
┌─────────────────────────────────────────────────────────────────┐
│  💰 PENDING PAYMENTS                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  AGING ANALYSIS                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 0-30 Days  │ 31-60 Days │ 61-90 Days │ Over 90 Days       │  │
│  │ ₹3,25,000  │ ₹1,50,000  │ ₹75,000    │ ₹50,000  ⚠️       │  │
│  │ (54%)      │ (25%)      │ (12%)      │ (9%) - Alert!     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Total Outstanding: ₹6,00,000                                   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Vendor        │ Amount    │ Oldest Due │ Days Overdue      ││
│  ├──────────────┼───────────┼────────────┼───────────────────┤│
│  │ ABC Traders  │ ₹2,25,000 │ 15-Oct-24  │ 46 days ⚠️        ││
│  │ XYZ Corp     │ ₹1,50,000 │ 01-Nov-24  │ 29 days           ││
│  │ PQR Ltd      │ ₹1,25,000 │ 20-Nov-24  │ 10 days           ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**[📸 SCREENSHOT: Capture Pending Payments dashboard]**

### Aging Buckets Explained

| Age Bucket | Meaning | Action Needed |
|------------|---------|---------------|
| 0-30 Days | Recent invoices | Normal - within credit period |
| 31-60 Days | Slightly overdue | Gentle reminder |
| 61-90 Days | Significantly overdue | Strong follow-up |
| Over 90 Days | Seriously overdue | Escalate, consider legal action |

---

## 6.3 Recording Payments

### What is this?
When a customer pays money, you record it here. The payment is automatically linked to their pending invoices.

### Where to find it?

| How to Navigate | URL |
|-----------------|-----|
| **Sidebar** → Finance & Sales → **Payment Management** | `/payment-management` |
| Or from Invoice Detail → Click **"Record Payment"** | - |

### Step-by-Step: Record Customer Payment

**Scenario:** ABC Traders paid ₹50,000 via bank transfer.

#### Step 1: Open Payment Form
1. Go to **Payment Management**
2. Click **"+ Record Payment"**

#### Step 2: Select Customer

| Field | Value |
|-------|-------|
| Vendor | ABC Traders (search and select) |

System shows their unpaid invoices:
| Invoice | Date | Total | Paid | Balance |
|---------|------|-------|------|---------|
| INV-2024-101 | 05-Nov-24 | ₹45,000 | ₹0 | ₹45,000 |
| INV-2024-115 | 15-Nov-24 | ₹32,000 | ₹0 | ₹32,000 |
| INV-2024-126 | 30-Nov-24 | ₹54,280 | ₹0 | ₹54,280 |

#### Step 3: Enter Payment Details

| Field | Value |
|-------|-------|
| Payment Date | 30-Nov-2024 |
| Amount | ₹50,000 |
| Payment Mode | Bank Transfer |
| Reference | UTR: 123456789012 |
| Remarks | November payment |

#### Step 4: Allocate to Invoices

**FIFO Method (Default):** System automatically applies to oldest invoice first.

| Invoice | Due | Allocated |
|---------|-----|-----------|
| INV-2024-101 | ₹45,000 | ₹45,000 ✅ (fully paid) |
| INV-2024-115 | ₹32,000 | ₹5,000 (partial) |
| INV-2024-126 | ₹54,280 | ₹0 |

Or you can manually change allocation.

#### Step 5: Save Payment
1. Click **"Save Payment"**
2. System updates:
   - INV-2024-101 status → Paid
   - INV-2024-115 status → Partial
   - Vendor balance reduced by ₹50,000

**[📸 SCREENSHOT: Capture Record Payment form with allocation]**

### Payment Modes Explained

| Mode | When Used | Reference to Enter |
|------|-----------|-------------------|
| Cash | Cash payment | Receipt number |
| Bank Transfer | NEFT/RTGS/IMPS | UTR number |
| UPI | PhonePe/GPay/etc | Transaction ID |
| Cheque | Bank cheque | Cheque number |

---

## 6.4 Credit Notes

### What is this?
A document to reduce an invoice amount after it was issued. Think of it as a "negative invoice".

### When to use?
- Customer returned goods (after Sales Return process)
- Price reduction given after invoice
- Discount agreed later
- Damaged goods compensation
- Any reduction to past invoice

### Where to find it?

| How to Navigate | URL |
|-----------------|-----|
| **Sidebar** → Finance & Sales → **Credit Notes** | `/credit-notes` |
| From Invoice Detail → **"Create Credit Note"** button | - |

### Credit Note vs Cancel & Reissue

| Situation | Use Credit Note | Use Cancel & Reissue |
|-----------|-----------------|---------------------|
| Current month, no gatepass | ❌ | ✅ Better option |
| Current month, with gatepass | ✅ Only option | ❌ Not possible |
| Previous month invoice | ✅ Only option | ❌ Not possible |

### Screenshot: Credit Notes List

```
┌─────────────────────────────────────────────────────────────────┐
│  📝 CREDIT NOTES                                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ CN Number   │ Date      │ Invoice     │ Vendor   │ Amount  ││
│  ├─────────────┼───────────┼────────────┼──────────┼─────────┤│
│  │ CN-2024-015 │ 28-Nov-24 │ INV-2024-120│ABC Traders│ ₹5,000 ││
│  │ CN-2024-014 │ 25-Nov-24 │ INV-2024-110│XYZ Corp  │ ₹12,500 ││
│  │ CN-2024-013 │ 20-Nov-24 │ INV-2024-105│PQR Ltd   │ ₹3,200  ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**[📸 SCREENSHOT: Capture Credit Notes list]**

---

# 7. Returns & Corrections

## 7.1 Sales Returns (Physical Goods Return)

### What is this?
When a customer physically returns goods to you (damaged, wrong product, quality issue), you process it through Sales Returns.

### Sales Returns vs Credit Notes - What's the Difference?

| Sales Return | Credit Note |
|--------------|-------------|
| Physical goods come back | No goods movement |
| 3-stage workflow (receive, inspect) | Direct financial adjustment |
| May result in restocking | Just reduces invoice amount |
| Takes time (inspection needed) | Immediate effect |

### The 3-Stage Process

```
Stage 1: CREATE RETURN
Customer reports issue → You create return request in system

Stage 2: RECEIVE GOODS
Goods physically arrive → Warehouse marks as received

Stage 3: INSPECT & DECIDE
Quality team checks → Decide: Restock or Scrap → Credit Note auto-generated
```

### Where to find it?

| How to Navigate | URL |
|-----------------|-----|
| **Sidebar** → Finance & Sales → **Sales Returns** | `/sales-returns` |

### Step-by-Step: Complete Sales Return Process

**Scenario:** ABC Traders returns 20 kg of VCI Film (damaged in transit).

#### Stage 1: Create Return Request

1. Go to **Sales Returns**
2. Click **"+ Create Return"**
3. Fill details:

| Field | Value |
|-------|-------|
| Return Date | 30-Nov-2024 |
| Invoice Reference | INV-2024-126 |
| Return Reason | Damaged in transit |

4. Add return items:

| Product | Original Qty | Return Qty | Item Reason |
|---------|--------------|------------|-------------|
| VCI Film 100 micron | 100 kg | 20 kg | Torn packaging, film damaged |

5. Click **"Submit Return"**
6. Status: **Pending**

**[📸 SCREENSHOT: Capture Create Return form]**

#### Stage 2: Receive Goods

When goods physically arrive at your warehouse:

1. Find return in list (status: Pending)
2. Click **"Mark Received"** button
3. Enter receiving details:

| Field | Value |
|-------|-------|
| Received By | Store Keeper - Ramesh |
| Received Date | 01-Dec-2024 |
| Condition on Arrival | Goods match return request |

4. Click **"Confirm Receipt"**
5. Status: **Received**

**[📸 SCREENSHOT: Capture Receive Goods form]**

#### Stage 3: Inspect & Decide

Quality team inspects returned goods:

1. Find return in list (status: Received)
2. Click **"Inspect"** button
3. For each item, decide:

| Product | Qty | Condition | Decision | Restock? |
|---------|-----|-----------|----------|----------|
| VCI Film | 20 kg | Damaged | Scrap | No |

Options:
- **Good Condition → Restock**: Add back to inventory
- **Damaged → Scrap**: Write off, don't add to inventory

4. Click **"Complete Inspection"**
5. System automatically:
   - Updates inventory (if restocking)
   - Creates Credit Note for ₹6,400 (20 kg × ₹320)
   - Links credit note to original invoice
6. Status: **Completed**

**[📸 SCREENSHOT: Capture Inspection form with decisions]**

### FAQ

**Q: Customer wants money back. What do I do?**
A: After Sales Return is completed, a Credit Note is created. This reduces their outstanding balance. If they already paid, it becomes a credit for future purchases.

**Q: Can I return only part of the invoice?**
A: Yes! You can return 20 kg from a 100 kg invoice. Only the returned portion gets credit.

**Q: What if goods are okay but customer doesn't want?**
A: Still process as Sales Return. In inspection, mark as "Good" and restock. Credit note still issued.

---

## 7.2 Cancelled Invoices Report

### What is this?
Audit trail of all invoices that were cancelled, showing reason and replacement invoice.

### Where to find it?

| How to Navigate | URL |
|-----------------|-----|
| **Sidebar** → Finance & Sales → **Cancelled Invoices** | `/cancelled-invoices` |

### Screenshot

```
┌─────────────────────────────────────────────────────────────────┐
│  ❌ CANCELLED INVOICES REPORT                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Date Range: [01-Nov-2024] to [30-Nov-2024]        [Apply]      │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Original    │ Cancel Date│ Reason          │ Replacement   ││
│  ├─────────────┼────────────┼────────────────┼───────────────┤│
│  │ INV-2024-120│ 25-Nov-24  │ Wrong rate     │ INV-2024-121  ││
│  │ INV-2024-115│ 20-Nov-24  │ Wrong customer │ INV-2024-116  ││
│  │ INV-2024-108│ 15-Nov-24  │ Duplicate entry│ -             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  Total Cancelled This Month: 3                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**[📸 SCREENSHOT: Capture Cancelled Invoices Report]**

---

# 8. Daily Cash Management

## 8.1 Daily Cash Register

### What is this?
Track all cash coming in and going out of your business each day. Like a cash book, but digital.

### Why do you need it?
- Know how much cash you should have
- Prevent cash theft or misuse
- Daily reconciliation
- Audit trail

### Where to find it?

| How to Navigate | URL |
|-----------------|-----|
| **Sidebar** → Cash & Expenses → **Daily Cash Register** | `/cash-register` |

### Daily Workflow

```
MORNING                    DURING DAY                    EVENING
────────                   ──────────                    ───────
Open Day                   Record transactions           Reconcile
Enter Opening              - Cash received              Count actual cash
Balance                    - Cash expenses              Enter actual amount
                           - Bank deposits              Explain variance
                                                        Close Day
```

### Screenshot: Cash Register Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│  💵 DAILY CASH REGISTER                      Date: 30-Nov-2024  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  TODAY'S SUMMARY                                                │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │ Opening Bal  │ │ Cash In      │ │ Cash Out     │            │
│  │ ₹25,000      │ │ ₹45,500      │ │ ₹12,300      │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
│                                                                 │
│  EXPECTED CLOSING: ₹58,200                                      │
│                                                                 │
│  TODAY'S TRANSACTIONS                      [+ Add Transaction]  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Time  │ Type        │ Description      │ In      │ Out     ││
│  ├───────┼────────────┼─────────────────┼─────────┼─────────┤│
│  │ 09:15 │ Sale Cash  │ Walk-in customer │ ₹5,500  │         ││
│  │ 10:30 │ Sale Cash  │ ABC Traders      │ ₹40,000 │         ││
│  │ 11:45 │ Expense    │ Fuel for vehicle │         │ ₹2,000  ││
│  │ 14:00 │ Expense    │ Office supplies  │         │ ₹800    ││
│  │ 15:30 │ Bank Dep   │ Transferred to SBI│        │ ₹9,500  ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  [📊 Reconcile]                              [✅ Close Day]     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**[📸 SCREENSHOT: Capture Cash Register main screen]**

### Step-by-Step: Complete Daily Cash Register

#### Morning: Open the Day

1. Go to **Cash Register**
2. System shows yesterday's closing balance
3. Click **"Start New Day"**
4. Confirm opening balance: ₹25,000
5. Day is now open for transactions

#### During Day: Record Transactions

Each time cash moves:

1. Click **"+ Add Transaction"**
2. Select type:

| Type | Meaning | Example |
|------|---------|---------|
| Sale Cash | Cash received from sale | Customer paid ₹5,000 cash |
| Secondary Sale | Other cash income | Sold scrap material |
| UPI Received | UPI payment collected | PhonePe payment |
| Expense | Cash spent | Bought fuel |
| Bank Deposit | Transferred to bank | Deposited at SBI |

3. Enter amount and description
4. Click **"Save"**

#### Evening: Reconcile & Close

**Step 1: Count Cash**
Physically count all cash in your drawer/safe.

**Step 2: Reconcile**
1. Click **"Reconcile"** button
2. Enter actual cash count:

```
┌─────────────────────────────────────────────────┐
│  💵 RECONCILIATION                              │
│                                                 │
│  Expected Balance (system):     ₹58,200        │
│                                                 │
│  Enter Actual Cash on Hand:                     │
│  ┌───────────────────────────────────────┐     │
│  │ ₹ 58,000                              │     │
│  └───────────────────────────────────────┘     │
│                                                 │
│  Variance: -₹200 (Short)                        │
│                                                 │
│  Reason for variance (required):               │
│  ┌───────────────────────────────────────┐     │
│  │ Small change given to customer        │     │
│  └───────────────────────────────────────┘     │
│                                                 │
│  [Cancel]              [Confirm Reconciliation] │
│                                                 │
└─────────────────────────────────────────────────┘
```

3. If there's a variance, enter explanation
4. Click **"Confirm Reconciliation"**

**Step 3: Close Day**
1. After reconciliation, click **"Close Day"**
2. Day is finalized
3. Tomorrow's opening = Today's closing

**[📸 SCREENSHOT: Capture Reconciliation dialog]**

### What Happens If There's Variance?

| Variance | Meaning | Action |
|----------|---------|--------|
| Positive (Excess) | You have more cash than expected | Investigate source |
| Negative (Short) | You have less cash than expected | Explain in remarks |
| Zero | Perfect match | Ideal situation |

> **Important:** Day cannot be closed without reconciling. Any unexplained variance must be documented.

---

## 8.2 Expense Vouchers

### What is this?
Formal records of business expenses with approval workflow. Creates vouchers for audit.

### Where to find it?

| How to Navigate | URL |
|-----------------|-----|
| **Sidebar** → Cash & Expenses → **Expense Vouchers** | `/expenses` |

### Expense Workflow

```
DRAFT → SUBMITTED → APPROVED → PAID
         ↓ (or)
       REJECTED
```

### Step-by-Step: Create Expense Voucher

1. Click **"+ New Expense"**
2. Fill header:

| Field | Value |
|-------|-------|
| Expense Date | 30-Nov-2024 |
| Category | Transportation |
| Payment Mode | Cash |

3. Add line items:

| Description | Amount | GST |
|-------------|--------|-----|
| Diesel for delivery truck | ₹1,500 | ₹270 |
| Toll charges | ₹200 | - |

4. Attach bills/receipts (photo or scan)
5. Click **"Submit for Approval"**
6. Manager reviews and approves
7. Finance marks as paid

**[📸 SCREENSHOT: Capture New Expense form]**

---

# 9. Quality Checklists

## 9.1 Checklist Builder

### What is this?
Create custom checklists for regular quality checks, machine startup procedures, or safety inspections.

### Where to find it?

| How to Navigate | URL |
|-----------------|-----|
| **Sidebar** → Quality & Checklists → **Checklist Builder** | `/checklists` |

### Types of Questions You Can Add

| Question Type | Example | Answer Format |
|---------------|---------|---------------|
| Yes/No | Is machine cleaned? | Yes or No |
| Number | What is temperature? | 25.5 |
| Text | Describe any issues | Free text |
| Photo | Upload machine photo | Image |

**[📸 SCREENSHOT: Capture Checklist Builder screen]**

---

## 9.2 WhatsApp Checklist Completion

### What is this?
Operators can complete checklists directly on WhatsApp without opening the app. Very convenient for factory floor workers.

### How it Works

1. At scheduled time, system sends WhatsApp message to operator
2. Message contains checklist questions
3. Operator replies with answers
4. Responses are automatically saved in system

### Example Conversation

```
System: Good morning! Please complete Machine-1 startup checklist.

System: Question 1: Is the machine cleaned and ready? (Reply Yes/No)
Operator: Yes

System: Question 2: What is the oil level reading?
Operator: 4.5

System: Question 3: Any issues observed? (Reply in text)
Operator: No issues

System: Thank you! Checklist completed successfully. ✅
```

**[📸 SCREENSHOT: Capture WhatsApp message example]**

---

# 10. Document Storage

## 10.1 Document Management

### What is this?
Central storage for all business documents - contracts, certificates, licenses. With expiry tracking.

### Where to find it?

| How to Navigate | URL |
|-----------------|-----|
| **Sidebar** → Cash & Expenses → **Documents** | `/documents` |

### Features

| Feature | Description |
|---------|-------------|
| Upload | Add PDFs, images, documents |
| Categories | Organize by type (Contract, License, etc.) |
| Expiry Tracking | Get alerts before documents expire |
| Vendor Link | Attach documents to specific vendors |
| Bulk Download | Download multiple files as ZIP |

### Expiry Alert System

| Days to Expiry | Alert Level | Color |
|----------------|-------------|-------|
| Over 30 days | Safe | Green |
| 15-30 days | Warning | Yellow |
| 0-14 days | Urgent | Orange |
| Expired | Critical | Red |

System sends WhatsApp/Email alerts for upcoming expirations.

**[📸 SCREENSHOT: Capture Documents list with expiry status]**

---

# 11. Reports

## 11.1 Available Reports

| Report | Purpose | Location |
|--------|---------|----------|
| **Sales Summary** | Daily/Monthly sales totals | Reports Hub |
| **GST Report (GSTR-1)** | Data for GST filing | Reports Hub |
| **Outstanding Report** | All pending payments | Pending Payments |
| **Cancelled Invoices** | Audit trail of cancellations | Cancelled Invoices |
| **Write-Off Report** | Written off amounts | Write-Off Report |
| **Production Variance** | Material usage analysis | Production Reports |
| **Cash Register Report** | Daily cash flow history | Cash Register Report |
| **Vendor History** | Individual customer ledgers | Vendor History |

### Where to find Reports Hub

| How to Navigate | URL |
|-----------------|-----|
| **Sidebar** → Dashboard & Analytics → **Reports** | `/reports` |

**[📸 SCREENSHOT: Capture Reports Hub screen]**

---

# Quick Reference Cards

## Daily Operations Checklist

### Morning (Start of Day)
- [ ] Open Cash Register (enter opening balance)
- [ ] Check Machine Startup Checklists completed
- [ ] Review pending dispatches for today
- [ ] Check any overdue payments

### During Day
- [ ] Create invoices for orders
- [ ] Create gatepasses for dispatches
- [ ] Record payments received
- [ ] Process any returns

### Evening (End of Day)
- [ ] Complete production reconciliation
- [ ] Reconcile cash register
- [ ] Review next day's pending items
- [ ] Close cash register

---

## Invoice Correction Decision Chart

```
                   NEED TO CORRECT INVOICE?
                            │
                   Which month?
                     /          \
              THIS MONTH      LAST MONTH
                 │                │
         Has Gatepass?      What change?
          /       \           /      \
        NO        YES     REDUCE   INCREASE
         │         │         │         │
    CANCEL &   CREDIT     CREDIT    DEBIT
    REISSUE     NOTE       NOTE      NOTE
```

---

## GST Quick Reference

| Transaction Type | Tax Applicable |
|------------------|----------------|
| Same State Sale | CGST + SGST |
| Different State Sale | IGST |
| Export | Zero rated |
| SEZ Supply | Zero rated |

| Common HSN Codes | Products |
|------------------|----------|
| 3920 | Plastic films |
| 4811 | Coated paper |
| 3824 | Chemical preparations |

---

## Support Information

**For System Issues:**
- Contact your system administrator
- Check this documentation
- Report bugs with screenshots

**For Business Process Questions:**
- Consult your manager
- Refer to company SOPs
- Check GST portal for tax rules

---

# How to Capture Screenshots

For each feature, capture a screenshot from your actual system:

1. Navigate to the screen
2. Press **Print Screen** (Windows) or **Cmd+Shift+4** (Mac)
3. Paste in image editor
4. Save as PNG file
5. Add to this document

Suggested naming convention:
- `screenshot-01-dashboard.png`
- `screenshot-02-product-list.png`
- `screenshot-03-invoice-form.png`
- etc.

---

*Document prepared for KINTO Smart Ops - Inmoisure Private Limited*
*Last Updated: November 2024*
