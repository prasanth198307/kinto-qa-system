# Vyapaar to KINTO Smart Ops - Data Migration Guide

**Date:** November 2024  
**From:** Vyapaar (Accounting & Inventory Software)  
**To:** KINTO Smart Ops (Manufacturing Operations Platform)

---

## Table of Contents
1. [Overview](#overview)
2. [Data Mapping](#data-mapping)
3. [Pre-Migration Checklist](#pre-migration-checklist)
4. [Step-by-Step Migration](#step-by-step-migration)
5. [Data Validation](#data-validation)
6. [Troubleshooting](#troubleshooting)

---

## Overview

### What Gets Migrated
- ✅ **Customers/Parties** → Customers & Vendors
- ✅ **Products** → Products with BOM (Bill of Materials)
- ✅ **Inventory** → Raw Materials & Finished Goods Stock
- ✅ **Invoices** → Invoices & Gatepasses
- ✅ **Purchases** → Purchase Orders
- ✅ **Payments** → Payment Records
- ✅ **Stock Ledger** → Inventory Transactions

### What Doesn't Migrate (Setup Required in KINTO)
- ❌ **User Roles** (must create manually - 5 users max)
- ❌ **Checklist Templates** (create in KINTO UI)
- ❌ **Quality Settings** (set up in admin)
- ❌ **Production Shifts** (define in configuration)

---

## Data Mapping

### 1. Customers → Customers Table

**Vyapaar Data**
```
Customer Name, Phone, Email, Address, GST Number, Credit Limit
```

**KINTO Mapping**
```
name: Vyapaar "Customer Name"
email: Vyapaar "Email"
phone: Vyapaar "Phone"
gstNumber: Vyapaar "GST Number"
address: Vyapaar "Address"
type: "customer"
creditLimit: Vyapaar "Credit Limit"
```

**Fields**
| Vyapaar | KINTO | Type | Notes |
|---------|-------|------|-------|
| Name | name | text | Required |
| Phone | phone | text | Required |
| Email | email | text | Optional |
| GST Number | gstNumber | text | Required for invoicing |
| Address | address | text | Optional |
| Credit Limit | creditLimit | decimal | For credit control |

### 2. Vendors → Vendors Table

**Vyapaar Data**
```
Supplier Name, Phone, Email, Address, GST Number
```

**KINTO Mapping**
```
name: Vyapaar "Supplier Name"
email: Vyapaar "Email"
phone: Vyapaar "Phone"
gstNumber: Vyapaar "GST Number"
address: Vyapaar "Address"
type: "vendor"
```

### 3. Products → Products Table

**Vyapaar Data**
```
Product Name, SKU, Unit, HSN Code, Tax Rate
```

**KINTO Mapping**
```
name: Vyapaar "Product Name"
sku: Vyapaar "SKU"
unit: Vyapaar "Unit" (e.g., "pcs", "kg", "liters")
hsn: Vyapaar "HSN Code"
taxRate: Vyapaar "Tax Rate"
categoryId: (create category first)
```

### 4. Raw Materials → Raw Materials Table

**Vyapaar Data**
```
Material Name, Unit, Opening Stock, Current Stock
```

**KINTO Mapping**
```
name: Vyapaar "Material Name"
unit: Vyapaar "Unit"
openingStock: Vyapaar "Opening Stock"
currentStock: Vyapaar "Current Stock"
stockMode: "Ongoing Inventory" (or "Opening Stock Entry Only")
```

### 5. Invoices → Invoices Table

**Vyapaar Data**
```
Invoice Number, Date, Customer, Amount, Tax, Status
```

**KINTO Mapping**
```
invoiceNumber: Vyapaar "Invoice Number"
invoiceDate: Vyapaar "Date"
customerId: (mapped from customer)
totalAmount: Vyapaar "Amount"
taxAmount: Vyapaar "Tax"
status: "completed" (if already finalized)
```

### 6. Purchases → Purchase Orders Table

**Vyapaar Data**
```
PO Number, Date, Vendor, Amount, Tax, Status
```

**KINTO Mapping**
```
poNumber: Vyapaar "PO Number"
poDate: Vyapaar "Date"
vendorId: (mapped from vendor)
totalAmount: Vyapaar "Amount"
taxAmount: Vyapaar "Tax"
status: "completed"
```

### 7. Stock Ledger → Inventory Transactions

**Vyapaar Data**
```
Transaction Type, Date, Product, Quantity, Reference
```

**KINTO Mapping**
```
type: Vyapaar "Transaction Type" (purchase, sale, adjustment)
transactionDate: Vyapaar "Date"
productId: (mapped from product)
quantity: Vyapaar "Quantity"
referenceId: Vyapaar "Reference" (invoice/PO number)
```

---

## Pre-Migration Checklist

### Step 1: Export Data from Vyapaar

**Export as CSV/Excel:**
- [ ] Export all Customers (with GST, address, phone)
- [ ] Export all Vendors (with GST, address, phone)
- [ ] Export all Products (with SKU, unit, HSN, tax rate)
- [ ] Export all Raw Materials (with unit, opening stock)
- [ ] Export all Invoices (with customer, dates, amounts)
- [ ] Export all Purchase Orders (with vendor, dates, amounts)
- [ ] Export Stock Ledger (with all transactions)

**How to Export from Vyapaar:**
```
Vyapaar → Reports → Export Data → Select Report Type → Download CSV/Excel
```

### Step 2: Validate Export Data

```
Checklist:
☑ All dates are in correct format (YYYY-MM-DD)
☑ All amounts are numbers (no currency symbols)
☑ Customer/Vendor names are filled
☑ Product names and units are filled
☑ GST numbers are formatted correctly
☑ No special characters in critical fields
```

### Step 3: Prepare KINTO Environment

```bash
# Ensure KINTO database is ready
npm run db:push

# Verify database connection
psql -h localhost -U kinto_user -d kinto_ops -c "SELECT version();"
```

---

## Step-by-Step Migration

### Phase 1: Set Up Master Data

#### Step 1.1: Create Product Categories

**In KINTO UI:**
1. Go to Admin → Product Categories
2. Create categories matching Vyapaar products
   - Example: "Raw Materials", "Finished Goods", "Components"

#### Step 1.2: Create Customers

**Via CSV Import Script:**

```bash
# Create import script
cat > /home/kinto/kinto-smart-ops/scripts/import-customers.js << 'EOF'
const fs = require('fs');
const csv = require('csv-parser');
const { db } = require('../server/db');
const { customers } = require('../shared/schema');

async function importCustomers(filePath) {
  const results = [];
  
  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', async (row) => {
      const customer = {
        name: row['Customer Name'],
        email: row['Email'] || '',
        phone: row['Phone'],
        gstNumber: row['GST Number'],
        address: row['Address'],
        type: 'customer',
        creditLimit: parseFloat(row['Credit Limit']) || 0
      };
      results.push(customer);
    })
    .on('end', async () => {
      for (const customer of results) {
        await db.insert(customers).values(customer);
      }
      console.log(`✅ Imported ${results.length} customers`);
    });
}

importCustomers(process.argv[2]);
EOF

# Run import
node scripts/import-customers.js vyapaar-customers.csv
```

#### Step 1.3: Create Vendors

```bash
cat > /home/kinto/kinto-smart-ops/scripts/import-vendors.js << 'EOF'
const fs = require('fs');
const csv = require('csv-parser');
const { db } = require('../server/db');
const { vendors } = require('../shared/schema');

async function importVendors(filePath) {
  const results = [];
  
  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', async (row) => {
      const vendor = {
        name: row['Vendor Name'] || row['Supplier Name'],
        email: row['Email'] || '',
        phone: row['Phone'],
        gstNumber: row['GST Number'],
        address: row['Address'],
        type: 'vendor'
      };
      results.push(vendor);
    })
    .on('end', async () => {
      for (const vendor of results) {
        await db.insert(vendors).values(vendor);
      }
      console.log(`✅ Imported ${results.length} vendors`);
    });
}

importVendors(process.argv[2]);
EOF

# Run import
node scripts/import-vendors.js vyapaar-vendors.csv
```

#### Step 1.4: Create Products

```bash
cat > /home/kinto/kinto-smart-ops/scripts/import-products.js << 'EOF'
const fs = require('fs');
const csv = require('csv-parser');
const { db } = require('../server/db');
const { products } = require('../shared/schema');

async function importProducts(filePath, categoryId) {
  const results = [];
  
  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', async (row) => {
      const product = {
        name: row['Product Name'],
        sku: row['SKU'],
        unit: row['Unit'],
        categoryId: parseInt(categoryId),
        hsn: row['HSN Code'] || '',
        taxRate: parseFloat(row['Tax Rate']) || 0,
        description: row['Description'] || ''
      };
      results.push(product);
    })
    .on('end', async () => {
      for (const product of results) {
        await db.insert(products).values(product);
      }
      console.log(`✅ Imported ${results.length} products`);
    });
}

importProducts(process.argv[2], process.argv[3]);
EOF

# Run import (replace CATEGORY_ID with actual ID from Step 1.1)
node scripts/import-products.js vyapaar-products.csv CATEGORY_ID
```

#### Step 1.5: Create Raw Materials

```bash
cat > /home/kinto/kinto-smart-ops/scripts/import-raw-materials.js << 'EOF'
const fs = require('fs');
const csv = require('csv-parser');
const { db } = require('../server/db');
const { rawMaterials } = require('../shared/schema');

async function importRawMaterials(filePath) {
  const results = [];
  
  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', async (row) => {
      const material = {
        name: row['Material Name'],
        unit: row['Unit'],
        openingStock: parseFloat(row['Opening Stock']) || 0,
        currentStock: parseFloat(row['Current Stock']) || 0,
        stockMode: 'Ongoing Inventory'
      };
      results.push(material);
    })
    .on('end', async () => {
      for (const material of results) {
        await db.insert(rawMaterials).values(material);
      }
      console.log(`✅ Imported ${results.length} raw materials`);
    });
}

importRawMaterials(process.argv[2]);
EOF

# Run import
node scripts/import-raw-materials.js vyapaar-raw-materials.csv
```

### Phase 2: Import Transactional Data

#### Step 2.1: Import Invoices

```bash
cat > /home/kinto/kinto-smart-ops/scripts/import-invoices.js << 'EOF'
const fs = require('fs');
const csv = require('csv-parser');
const { db } = require('../server/db');
const { invoices } = require('../shared/schema');

async function importInvoices(filePath) {
  const results = [];
  
  // First, fetch all customers to map names to IDs
  const allCustomers = await db.query.customers.findMany();
  const customerMap = new Map(allCustomers.map(c => [c.name, c.id]));
  
  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', async (row) => {
      const customerId = customerMap.get(row['Customer Name']);
      if (!customerId) {
        console.warn(`⚠️ Customer not found: ${row['Customer Name']}`);
        return;
      }
      
      const invoice = {
        invoiceNumber: row['Invoice Number'],
        invoiceDate: new Date(row['Date']),
        customerId: customerId,
        totalAmount: parseFloat(row['Amount']) || 0,
        taxAmount: parseFloat(row['Tax']) || 0,
        status: 'completed'
      };
      results.push(invoice);
    })
    .on('end', async () => {
      for (const invoice of results) {
        await db.insert(invoices).values(invoice);
      }
      console.log(`✅ Imported ${results.length} invoices`);
    });
}

importInvoices(process.argv[2]);
EOF

# Run import
node scripts/import-invoices.js vyapaar-invoices.csv
```

#### Step 2.2: Import Purchase Orders

```bash
cat > /home/kinto/kinto-smart-ops/scripts/import-purchase-orders.js << 'EOF'
const fs = require('fs');
const csv = require('csv-parser');
const { db } = require('../server/db');
const { purchaseOrders } = require('../shared/schema');

async function importPOs(filePath) {
  const results = [];
  
  // Fetch all vendors
  const allVendors = await db.query.vendors.findMany();
  const vendorMap = new Map(allVendors.map(v => [v.name, v.id]));
  
  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', async (row) => {
      const vendorId = vendorMap.get(row['Vendor Name'] || row['Supplier Name']);
      if (!vendorId) {
        console.warn(`⚠️ Vendor not found: ${row['Vendor Name']}`);
        return;
      }
      
      const po = {
        poNumber: row['PO Number'],
        poDate: new Date(row['Date']),
        vendorId: vendorId,
        totalAmount: parseFloat(row['Amount']) || 0,
        taxAmount: parseFloat(row['Tax']) || 0,
        status: 'completed'
      };
      results.push(po);
    })
    .on('end', async () => {
      for (const po of results) {
        await db.insert(purchaseOrders).values(po);
      }
      console.log(`✅ Imported ${results.length} purchase orders`);
    });
}

importPOs(process.argv[2]);
EOF

# Run import
node scripts/import-purchase-orders.js vyapaar-purchase-orders.csv
```

#### Step 2.3: Import Stock Ledger

```bash
cat > /home/kinto/kinto-smart-ops/scripts/import-stock-ledger.js << 'EOF'
const fs = require('fs');
const csv = require('csv-parser');
const { db } = require('../server/db');
const { inventoryTransactions } = require('../shared/schema');

async function importStockLedger(filePath) {
  const results = [];
  
  // Fetch products
  const allProducts = await db.query.products.findMany();
  const productMap = new Map(allProducts.map(p => [p.name, p.id]));
  
  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', async (row) => {
      const productId = productMap.get(row['Product Name']);
      if (!productId) {
        console.warn(`⚠️ Product not found: ${row['Product Name']}`);
        return;
      }
      
      const transaction = {
        type: row['Transaction Type'],
        transactionDate: new Date(row['Date']),
        productId: productId,
        quantity: parseFloat(row['Quantity']) || 0,
        referenceId: row['Reference'] || ''
      };
      results.push(transaction);
    })
    .on('end', async () => {
      for (const trans of results) {
        await db.insert(inventoryTransactions).values(trans);
      }
      console.log(`✅ Imported ${results.length} stock transactions`);
    });
}

importStockLedger(process.argv[2]);
EOF

# Run import
node scripts/import-stock-ledger.js vyapaar-stock-ledger.csv
```

### Phase 3: Create Payments & Complete Setup

#### Step 3.1: Import Payments

```bash
cat > /home/kinto/kinto-smart-ops/scripts/import-payments.js << 'EOF'
const fs = require('fs');
const csv = require('csv-parser');
const { db } = require('../server/db');
const { payments } = require('../shared/schema');

async function importPayments(filePath) {
  const results = [];
  
  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', async (row) => {
      const payment = {
        invoiceNumber: row['Invoice Number'],
        amount: parseFloat(row['Amount']) || 0,
        paymentDate: new Date(row['Payment Date']),
        paymentMethod: row['Payment Method'] || 'cash',
        referenceNumber: row['Reference'] || '',
        status: 'completed'
      };
      results.push(payment);
    })
    .on('end', async () => {
      for (const payment of results) {
        await db.insert(payments).values(payment);
      }
      console.log(`✅ Imported ${results.length} payments`);
    });
}

importPayments(process.argv[2]);
EOF

# Run import
node scripts/import-payments.js vyapaar-payments.csv
```

---

## Data Validation

### Step 1: Verify All Data Imported

```bash
# Connect to database
psql -h localhost -U kinto_user -d kinto_ops

# Check counts
SELECT COUNT(*) as customers FROM customers;
SELECT COUNT(*) as vendors FROM vendors;
SELECT COUNT(*) as products FROM products;
SELECT COUNT(*) as raw_materials FROM raw_materials;
SELECT COUNT(*) as invoices FROM invoices;
SELECT COUNT(*) as purchase_orders FROM purchase_orders;
SELECT COUNT(*) as payments FROM payments;

# Exit
\q
```

### Step 2: Compare with Vyapaar Export

```
Vyapaar Customers: ____ 
KINTO Customers: ____
Match: ☑ Yes ☐ No

Vyapaar Products: ____
KINTO Products: ____
Match: ☑ Yes ☐ No

Vyapaar Invoices: ____
KINTO Invoices: ____
Match: ☑ Yes ☐ No

[Repeat for all tables]
```

### Step 3: Spot-Check Sample Records

```bash
# Check a customer
SELECT * FROM customers WHERE id = 1;

# Check a product
SELECT * FROM products WHERE id = 1;

# Check an invoice
SELECT * FROM invoices WHERE id = 1;

# Verify amounts match Vyapaar
```

### Step 4: Validate Data Integrity

```bash
# Check for orphaned records
SELECT * FROM invoices WHERE "customerId" NOT IN (SELECT id FROM customers);

# Check for duplicate product names
SELECT name, COUNT(*) FROM products GROUP BY name HAVING COUNT(*) > 1;

# Verify all dates are valid
SELECT * FROM invoices WHERE "invoiceDate" > NOW();
```

---

## Post-Migration Setup

### Step 1: Set Up Users in KINTO

**Manual Setup (UI):**
1. Go to Admin → User Management
2. Create users (max 5):
   - Admin user
   - Production Manager
   - Quality Inspector
   - Inventory Manager
   - Operator

### Step 2: Configure Roles & Permissions

1. Admin → Role Management
2. Assign permissions for each role

### Step 3: Set Up Production Settings

1. Admin → Production Settings
   - Define shifts (morning, evening, night)
   - Set shift timings
   - Configure production units

### Step 4: Create Checklist Templates

1. Admin → Checklist Templates
2. Create templates for:
   - Machine startup
   - Quality checks
   - Production completion
   - Shift closure

### Step 5: Configure WhatsApp

1. Set up WhatsApp Business Account
2. Configure Colloki Flow API
3. Test message flow

---

## Complete Migration Checklist

### Pre-Migration
- [ ] Vyapaar data exported to CSV/Excel
- [ ] All CSV files validated
- [ ] KINTO database created
- [ ] Database connection verified

### Data Import
- [ ] Product categories created
- [ ] Customers imported
- [ ] Vendors imported
- [ ] Products imported
- [ ] Raw materials imported
- [ ] Invoices imported
- [ ] Purchase orders imported
- [ ] Stock ledger imported
- [ ] Payments imported

### Validation
- [ ] Record counts verified
- [ ] Sample data spot-checked
- [ ] Data integrity validated
- [ ] No duplicate records
- [ ] No orphaned records

### Post-Migration Setup
- [ ] Users created (5 max)
- [ ] Roles configured
- [ ] Permissions assigned
- [ ] Production settings configured
- [ ] Checklist templates created
- [ ] WhatsApp integration tested

### User Testing
- [ ] Dashboard loads correctly
- [ ] Invoices display correctly
- [ ] Inventory balances correct
- [ ] Payment history shows correctly
- [ ] Reports generate correctly

---

## Troubleshooting

### Issue: "Customer not found" during invoice import

**Solution:**
```bash
# Check if customer names match exactly
SELECT DISTINCT "Customer Name" FROM vyapaar_invoices.csv;
SELECT DISTINCT name FROM customers;

# If formats differ, update CSV file with correct names
# Or add mapping logic in import script
```

### Issue: Date format errors

**Solution:**
```bash
# Ensure dates are in YYYY-MM-DD format
# In import scripts:
transactionDate: new Date(row['Date']), // Will parse multiple formats

# If still failing:
invoiceDate: new Date('2024-01-15') // Use explicit format
```

### Issue: Amount precision issues

**Solution:**
```bash
# Use parseFloat for all amounts
totalAmount: parseFloat(row['Amount']).toFixed(2)

# Or in database:
ALTER TABLE invoices MODIFY totalAmount DECIMAL(12,2);
```

### Issue: Duplicate customer names

**Solution:**
```bash
# If Vyapaar has duplicate names:
# 1. Manually edit CSV to add suffixes (Customer A, Customer A-2)
# 2. Create unique identifiers
# 3. Or contact support for data deduplication
```

### Issue: Import script fails

**Solution:**
```bash
# Check if csv-parser is installed
npm install csv-parser

# Verify database connection
npm run db:push

# Run script with error logging
node scripts/import-customers.js vyapaar-customers.csv 2>&1 | tee import.log
```

---

## Rollback Plan

If migration fails, rollback:

```bash
# 1. Restore from backup
npm run db:reset

# 2. Or restore database backup
pg_restore -d kinto_ops /var/backups/kinto_ops_backup.dump

# 3. Or delete imported data
DELETE FROM invoices;
DELETE FROM customers;
DELETE FROM products;

# 4. Retry migration with corrections
```

---

## Timeline Estimate

| Phase | Task | Duration |
|-------|------|----------|
| Phase 1 | Export & Validate | 1-2 hours |
| Phase 2 | Set Up Categories | 30 minutes |
| Phase 3 | Import Customers | 30 minutes |
| Phase 4 | Import Products | 30 minutes |
| Phase 5 | Import Invoices & POs | 1 hour |
| Phase 6 | Validate Data | 1 hour |
| Phase 7 | Post-Migration Setup | 2-3 hours |
| **Total** | **Complete Migration** | **6-8 hours** |

---

## Support & Questions

For issues during migration:

1. **Check Troubleshooting section** (above)
2. **Review import scripts logs**
3. **Verify CSV file format**
4. **Check database logs:**
   ```bash
   sudo journalctl -u postgresql-15 -n 50
   ```
5. **Contact KINTO support** with:
   - CSV file sample
   - Error message
   - Import script output

---

## Post-Migration Best Practices

✅ **Do:**
- Create user accounts before going live
- Test all reports in production
- Verify payment reconciliation
- Set up automated backups
- Train users on KINTO UI
- Run parallel testing with Vyapaar for 1-2 weeks

❌ **Don't:**
- Delete Vyapaar data immediately
- Go live without testing
- Skip validation steps
- Ignore duplicate records
- Forget to set up WhatsApp

---

**Document Version:** 1.0  
**Last Updated:** November 2024  
**For:** KINTO Smart Ops Data Migration  
**From:** Vyapaar Accounting & Inventory Software
