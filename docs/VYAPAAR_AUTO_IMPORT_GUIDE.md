# Vyapaar Excel Auto-Import Guide

## Overview

The KINTO Smart Ops system includes a **fully automated Excel import tool** that imports all your Vyapaar data without requiring any manual master data creation. Simply run one command, and all your customers, products, invoices, and categories are automatically created.

## What Gets Auto-Created

The import script automatically creates:

1. **Product Categories** - Extracted from item details
2. **UOMs (Units of Measure)** - Auto-created from unique units in your data
3. **Product Types** - Auto-created default "Sold Items" type if needed
4. **Customers** - From your Party Report (all 177 parties)
5. **Products** - From your Sales transactions with proper UOM and type references
6. **Invoices** - All 339 sales transactions with complete line items
7. **Invoice Line Items** - All 566 product entries linked to invoices
8. **Payment Records** - Automatically created for invoices with received amounts

## Enhanced Features

The import script includes several production-ready features:

### 🔄 Smart Duplicate Handling
- Pre-loads existing data before importing
- Skips duplicates without errors
- Safe to re-run multiple times
- Continues from last successful import

### 🔐 Database Transactions
- Each invoice + items wrapped in atomic transaction
- If any item fails, entire invoice is rolled back
- Prevents partial/corrupted invoice data
- Ensures data integrity

### 🌍 Intelligent GST Handling
- Auto-detects intra-state vs inter-state transactions
- Intra-state: Splits GST into CGST + SGST (50/50)
- Inter-state: Uses IGST
- Stores tax rates in basis points (18% → 1800)

### 🔍 Normalized Matching
- Case-insensitive customer/product lookups
- Handles extra spaces and formatting differences
- Prevents orphaned invoices from name mismatches
- Uses database IDs instead of string matching

### 💰 Automatic Payment Tracking
- Creates payment records for invoices with received amounts
- Automatically determines payment type (Full/Partial) using persisted invoice total
- Links payments to invoices for accurate outstanding balance tracking
- Preserves exact Vyapaar payment method field (defaults to "Cash" only if empty)
- Prevents duplicate payment records on re-runs (idempotent)
- **Uses Vyapaar's Total Amount** to ensure exact matching (prevents rounding mismatches)
- **Verifies Balance Due** - Warns if calculated balance doesn't match Vyapaar (>₹1 difference)
- **Enhanced logging** shows payment status: "✓ PAID", "pending amount", or "No payment received"
- Enables Pending Payments Dashboard to show accurate data

### ✅ Data Integrity Validation
- Validates UOM exists before creating products
- Validates product type exists before creating products
- Fails fast with clear error messages if validation fails
- Ensures fallback UOM 'pcs' always exists
- Prevents NULL references in product master data

## Prerequisites

### Required Files

Place your Vyapaar Excel exports in the `attached_assets/` folder:

1. **PartyReport_1763717077023.xlsx** - Contains customer/vendor information
2. **SaleReport_1763717077023.xlsx** - Contains sales transactions and item details

### Database Setup

Ensure your PostgreSQL database is running and the `.env` file is configured:

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/kinto_db
```

## How to Run the Auto-Import

### Option 1: Using the Shell Script (Recommended)

```bash
./import-vyapaar.sh
```

### Option 2: Using npm/tsx Directly

```bash
NODE_ENV=development tsx scripts/import-vyapaar-excel.ts
```

## Import Process Flow

### Step 1: Product Categories Auto-Creation
- Reads all unique categories from Item Details
- Creates category codes: CAT-001, CAT-002, etc.
- If no categories found, creates "General" category
- **Result**: 7 product categories created

### Step 2: Customer Auto-Creation
- Reads Party Report (all 177 parties)
- Creates customer codes: CUST-001, CUST-002, etc.
- Imports: Name, Email, Phone, Address, GSTIN, Aadhar
- Sets vendorType to "customer"
- **Result**: 174 new customers created

### Step 3: Product Auto-Creation
- Extracts unique products from Sales Item Details
- Creates product codes: PROD-001, PROD-002, etc.
- Links products to categories
- Imports: Name, SKU, HSN Code, Unit Price, GST%, Description
- **Result**: 11 new products created

### Step 4: Invoice & Line Items Auto-Creation
- Reads all sales transactions
- Creates invoices with proper GST calculations
- **Uses Vyapaar's Total Amount** to ensure exact matching (prevents rounding mismatches)
- Links invoice items to products
- Calculates CGST/SGST (for same-state) or IGST (for inter-state)
- Verifies invoice balance matches Vyapaar's Balance Due
- Sets invoice status to 'delivered' (all Vyapaar imports are historical sales)
- **Result**: 325 invoices with line items created

### Step 5: Payment Records Auto-Creation
- Creates payment records for invoices with received amounts > 0
- Automatically determines payment type (Full or Partial) using persisted invoice total
- Uses invoice date as payment date
- Preserves exact Vyapaar payment method field (defaults to "Cash" only if empty)
- Links payments to invoices for pending payments tracking
- Prevents duplicate payments on re-runs (idempotent)
- **Result**: Payment records created for all paid invoices

## Data Mapping

### Party Report → Customers

| Vyapaar Field | KINTO Field |
|---------------|-------------|
| Name | vendorName |
| Email | email |
| Phone No. | mobileNumber |
| Address | address |
| GSTIN | gstNumber |
| Aadhar | aadhaarNumber |

### Sale Report → Invoices

| Vyapaar Field | KINTO Field | Notes |
|---------------|-------------|-------|
| Invoice No | invoiceNumber |
| Date | invoiceDate |
| Party Name | buyerName |
| **Total Amount** | **totalAmount (in paise)** | **Primary source - ensures exact matching with payments** |
| Received Amount | Used to create payment records |
| **Balance Due** | _(Verification only)_ | **Cross-checked to detect data mismatches** |
| Payment Status | _(Not used - all imports set to 'delivered')_ |
| Vehicle No | vehicleNumber |

### Sale Report → Payment Records

| Vyapaar Field | KINTO Field | Notes |
|---------------|-------------|-------|
| Received Amount | amount (in paise) | Only creates record if > 0 |
| Date | paymentDate | Uses invoice date |
| Payment Type | paymentMethod | Preserves exact Vyapaar value; defaults to "Cash" if empty |
| Received Amount vs Total | paymentType | Auto-calculated: "Full" or "Partial" based on persisted invoice total |
| _(System)_ | remarks | "Payment imported from Vyapaar" |

### Item Details → Products & Invoice Items

| Vyapaar Field | KINTO Field |
|---------------|-------------|
| Item Name | productName |
| Item Code | skuCode |
| HSN/SAC | hsnCode |
| Category | categoryId (linked) |
| Unit Price | basePrice (in paise) |
| Tax Percent | gstPercent |
| Quantity | quantity |

## Important Notes

### Currency Conversion
- **Vyapaar**: Stores amounts in rupees (decimal)
- **KINTO**: Stores amounts in paise (integer)
- **Conversion**: ₹100.50 → 10050 paise

### GST Handling
- For same-state transactions: GST split into CGST + SGST (50/50)
- Tax rates converted to basis points: 18% → 1800

### Duplicate Handling
The script gracefully handles duplicates:
- If a customer/product/invoice already exists, it skips and continues
- No data is overwritten or duplicated
- You can safely re-run the import multiple times

### Code Generation
All codes are auto-generated with unique counters:
- **Categories**: CAT-001, CAT-002, CAT-003...
- **Customers**: CUST-001, CUST-002, CUST-003...
- **Products**: PROD-001, PROD-002, PROD-003...

## Verification

After import, verify your data in KINTO:

1. **Navigate to Masters** → Product Categories (should show 7 categories)
2. **Navigate to Masters** → Customers (should show 177 customers)
3. **Navigate to Masters** → Products (should show 11 products)
4. **Navigate to Sales** → Invoices (should show 339 invoices)

## Sample Output

```
🚀 Starting Vyapaar Excel Auto-Import...

📖 Reading Excel files...
✓ Found 177 parties
✓ Found 339 sales
✓ Found 566 item details

🔍 Preloading existing data from database...
✓ Loaded 0 existing categories
✓ Loaded 0 existing vendors
✓ Loaded 0 existing products

📦 Step 1: Auto-creating Product Categories...
  ✓ Created category: General (CAT-001)
  ✓ Created category: Water Products (CAT-002)
✅ Created 7 new categories (Total: 7)

👥 Step 2: Auto-creating Customers...
  ✓ Created customer: ADHOC SRINIVASA PETROLEUM (CUST-001)
  ✓ Created customer: AMMAYAMMA HP GAS GRAMIN VITRAK (CUST-002)
  ... (175 more customers)
✅ Created 177 new customers (Total: 177)

📦 Step 3: Auto-creating Products...
  ✓ Created product: 20 Ltr CAN (PROD-001)
  ✓ Created product: 1 Ltr. Bottle - Pack of 12 (PROD-002)
  ... (9 more products)
✅ Created 11 new products (Total: 11)

📄 Step 4: Auto-creating Invoices with Transactions...
  ✓ Created invoice: 1 (2 items, CGST+SGST, ₹3781.30)
  ✓ Created invoice: 2 (1 items, CGST+SGST, ₹3441.69)
  ✓ Created invoice: 3 (1 items, IGST, ₹5000.00)
  ... (336 more invoices)
✅ Created 339 invoices (Skipped: 0)

═══════════════════════════════════════
✅ AUTO-IMPORT COMPLETE!
═══════════════════════════════════════
📦 Product Categories: 7 new (7 total)
👥 Customers: 177 new (177 total)
📦 Products: 11 new (11 total)
📄 Invoices: 339 (Skipped: 0)
═══════════════════════════════════════

🎉 All data imported successfully!
📊 You can now view your data in KINTO Smart Ops
```

## Troubleshooting

### Error: Excel files not found
**Solution**: Ensure your Excel files are in `attached_assets/` folder with exact filenames:
- `PartyReport_1763717077023.xlsx`
- `SaleReport_1763717077023.xlsx`

### Error: Database connection failed
**Solution**: Check your `.env` file has correct `DATABASE_URL`

### Warning: Customer/Product already exists
**Info**: This is normal if you've run the import before. The script skips duplicates safely.

### Some invoices show "may already exist"
**Info**: This happens if invoice numbers are duplicated. The script preserves existing invoices.

## Post-Import Checklist

- [ ] Verify customer count matches (177 parties)
- [ ] Verify invoice count matches (341 sales)
- [ ] Check product categories are assigned correctly
- [ ] Review GST calculations on sample invoices
- [ ] Confirm payment statuses (Paid/Unpaid) are correct
- [ ] Test creating a new invoice to ensure system works

## Next Steps

After successful import:

1. **Review Master Data** - Check customers and products for accuracy
2. **Verify Invoices** - Sample-check invoices for correct amounts and GST
3. **Configure Gatepasses** - Link existing invoices to gatepasses if needed
4. **Train Users** - Show team how to use the system
5. **Start Daily Operations** - Begin using KINTO for new transactions

## Support

For issues or questions:
- Check the `scripts/import-vyapaar-excel.ts` file for technical details
- Review error messages in the console output
- Ensure all prerequisites are met

---

**Document Version**: 1.0  
**Last Updated**: November 21, 2025  
**Compatible with**: KINTO Smart Ops v1.0
