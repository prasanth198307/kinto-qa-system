# How to Upload Vyapaar CSV Files to KINTO Smart Ops

**Step-by-Step Guide for Data Upload and Import**

---

## Overview

You have 3 ways to upload and import your Vyapaar CSV data into KINTO:

1. **Option A:** Direct UI Upload (Easiest - if you have UI import feature)
2. **Option B:** Manual File Upload via SCP (Recommended)
3. **Option C:** Direct Database Import Script (Fastest)

---

## Option A: Direct UI Upload (If Available)

### If KINTO has an Admin Import Feature:

1. **Go to KINTO Admin Panel**
   ```
   https://ops.kintowwater.com → Admin → Data Import
   ```

2. **Upload CSV Files One by One**
   - Click "Choose File"
   - Select your Vyapaar CSV
   - Click "Import"
   - Repeat for each file

3. **Files to Upload (In Order)**
   - Customers.csv
   - Vendors.csv
   - Products.csv
   - Raw Materials.csv
   - Invoices.csv
   - Purchase Orders.csv
   - Stock Ledger.csv

---

## Option B: Upload Files via SCP (Recommended for OCI)

### If deploying on OCI, use SCP from Mac:

### Step 1: Export CSV Files from Vyapaar

```bash
# On your Mac, create a folder for CSV files
mkdir ~/vyapaar-export

# Save these CSV files in ~/vyapaar-export:
# - Customers.csv
# - Vendors.csv
# - Products.csv
# - RawMaterials.csv
# - Invoices.csv
# - PurchaseOrders.csv
# - StockLedger.csv
```

### Step 2: Upload Files to OCI via SCP

```bash
# Upload all CSV files to your OCI instance
scp -i ~/.ssh/kinto-instance.key ~/vyapaar-export/*.csv \
  opc@YOUR_PUBLIC_IP:/home/kinto/kinto-smart-ops/data/

# Example:
scp -i ~/.ssh/kinto-instance.key ~/vyapaar-export/*.csv \
  opc@152.70.123.45:/home/kinto/kinto-smart-ops/data/
```

### Step 3: Verify Files Uploaded

```bash
# SSH into your OCI instance
ssh -i ~/.ssh/kinto-instance.key opc@YOUR_PUBLIC_IP

# Check if files are there
ls -lah /home/kinto/kinto-smart-ops/data/

# You should see:
# Customers.csv
# Vendors.csv
# Products.csv
# ... etc
```

### Step 4: Run Import Scripts

```bash
# Switch to kinto user
sudo su - kinto

# Navigate to app folder
cd /home/kinto/kinto-smart-ops

# Run imports in this order:

# 1. Import Customers
node scripts/import-customers.js data/Customers.csv

# 2. Import Vendors
node scripts/import-vendors.js data/Vendors.csv

# 3. Import Products (you need CATEGORY_ID from Step 1.1)
# First get category ID:
psql -h localhost -U kinto_user -d kinto_ops -c "SELECT id, name FROM product_categories;"

# Then import:
node scripts/import-products.js data/Products.csv CATEGORY_ID

# 4. Import Raw Materials
node scripts/import-raw-materials.js data/RawMaterials.csv

# 5. Import Invoices
node scripts/import-invoices.js data/Invoices.csv

# 6. Import Purchase Orders
node scripts/import-purchase-orders.js data/PurchaseOrders.csv

# 7. Import Stock Ledger
node scripts/import-stock-ledger.js data/StockLedger.csv

# Watch output for success messages
```

### Step 5: Verify Import Completed

```bash
# Check record counts in database
psql -h localhost -U kinto_user -d kinto_ops

SELECT COUNT(*) as customers FROM customers;
SELECT COUNT(*) as vendors FROM vendors;
SELECT COUNT(*) as products FROM products;
SELECT COUNT(*) as invoices FROM invoices;

\q
```

---

## Option C: Direct Upload & Import Script

### If you want everything automated:

### Step 1: Create Combined Upload Script

```bash
# On OCI instance, create upload-and-import.sh
cat > /home/kinto/kinto-smart-ops/upload-and-import.sh << 'EOF'
#!/bin/bash

echo "🚀 KINTO Data Migration Started"

# Create data directory
mkdir -p /home/kinto/kinto-smart-ops/data

# Function to import file
import_data() {
  local script=$1
  local file=$2
  local category=$3
  
  if [ -z "$category" ]; then
    echo "📥 Importing $file..."
    node scripts/$script data/$file
  else
    echo "📥 Importing $file (Category: $category)..."
    node scripts/$script data/$file $category
  fi
}

# Get category ID (assuming only one exists)
CATEGORY_ID=$(psql -h localhost -U kinto_user -d kinto_ops -t -c "SELECT id FROM product_categories LIMIT 1;")

echo "✓ Using Category ID: $CATEGORY_ID"

# Run imports in order
import_data "import-customers.js" "Customers.csv"
import_data "import-vendors.js" "Vendors.csv"
import_data "import-products.js" "Products.csv" "$CATEGORY_ID"
import_data "import-raw-materials.js" "RawMaterials.csv"
import_data "import-invoices.js" "Invoices.csv"
import_data "import-purchase-orders.js" "PurchaseOrders.csv"
import_data "import-stock-ledger.js" "StockLedger.csv"

echo ""
echo "✅ Migration Complete!"
echo ""
echo "📊 Final Record Count:"
psql -h localhost -U kinto_user -d kinto_ops << SQL
SELECT 
  (SELECT COUNT(*) FROM customers) as customers,
  (SELECT COUNT(*) FROM vendors) as vendors,
  (SELECT COUNT(*) FROM products) as products,
  (SELECT COUNT(*) FROM raw_materials) as raw_materials,
  (SELECT COUNT(*) FROM invoices) as invoices,
  (SELECT COUNT(*) FROM purchase_orders) as purchase_orders;
SQL
EOF

chmod +x /home/kinto/kinto-smart-ops/upload-and-import.sh
```

### Step 2: Upload CSV Files via SCP

```bash
# From your Mac
scp -i ~/.ssh/kinto-instance.key ~/vyapaar-export/*.csv \
  opc@YOUR_PUBLIC_IP:/home/kinto/kinto-smart-ops/data/
```

### Step 3: Run Automated Import

```bash
# SSH into OCI
ssh -i ~/.ssh/kinto-instance.key opc@YOUR_PUBLIC_IP

# Run as kinto user
sudo su - kinto
cd /home/kinto/kinto-smart-ops

# Execute script
./upload-and-import.sh
```

---

## CSV File Format Reference

### 1. Customers.csv
```
Customer Name,Email,Phone,GST Number,Address,Credit Limit
ABC Industries,info@abc.com,9876543210,27AABCU1234M1Z5,Mumbai,50000
XYZ Supplies,contact@xyz.com,9876543211,27XYZS5678M1Z5,Delhi,30000
```

### 2. Vendors.csv
```
Vendor Name,Email,Phone,GST Number,Address
Global Supplies,sales@global.com,9876543210,27GLOBS1234M1Z5,Bangalore
Tech Imports,inquiry@tech.com,9876543211,27TECHI5678M1Z5,Chennai
```

### 3. Products.csv
```
Product Name,SKU,Unit,HSN Code,Tax Rate,Description
Widget A,WID-001,pcs,84439900,18,Standard widget
Widget B,WID-002,kg,84439900,5,Premium widget
```

### 4. RawMaterials.csv
```
Material Name,Unit,Opening Stock,Current Stock
Steel Sheet,kg,1000,950
Plastic Resin,kg,500,450
Aluminum Wire,meters,5000,4800
```

### 5. Invoices.csv
```
Invoice Number,Date,Customer Name,Amount,Tax
INV-001,2024-01-15,ABC Industries,50000,9000
INV-002,2024-01-20,XYZ Supplies,30000,5400
INV-003,2024-02-01,ABC Industries,75000,13500
```

### 6. PurchaseOrders.csv
```
PO Number,Date,Vendor Name,Amount,Tax
PO-001,2024-01-10,Global Supplies,25000,4500
PO-002,2024-01-12,Tech Imports,15000,2700
PO-003,2024-02-05,Global Supplies,40000,7200
```

### 7. StockLedger.csv
```
Transaction Type,Date,Product Name,Quantity,Reference
purchase,2024-01-10,Widget A,100,PO-001
sale,2024-01-15,Widget A,50,INV-001
adjustment,2024-01-20,Widget B,5,ADJ-001
production,2024-01-25,Widget A,25,PROD-001
```

---

## IMPORTANT: What Gets Created Automatically vs Manual

### ✅ Auto-Created by Upload Scripts
- Customers (from CSV)
- Vendors (from CSV)
- Products (from CSV)
- Raw Materials (from CSV)
- Invoices (from CSV)
- Purchase Orders (from CSV)
- Payments (from CSV)

### ⚠️ MUST Create MANUALLY FIRST in KINTO UI
1. **Product Categories** (required before product upload)
2. User Accounts (5 max)
3. User Roles & Permissions
4. Checklist Templates
5. Production Settings/Shifts

---

## Step-by-Step: From Vyapaar to KINTO

### Week 1: Preparation

```
Monday:
☐ Export all data from Vyapaar as CSV/Excel
☐ Save files locally on Mac in ~/vyapaar-export/
☐ Review CSV files for:
  - Correct date format (YYYY-MM-DD)
  - No currency symbols in amounts
  - GST numbers present and valid
  - No special characters in names
```

### Week 2: OCI Setup

```
Day 1-2:
☐ Set up OCI instance
☐ Deploy KINTO Smart Ops on OCI
☐ Create PostgreSQL database
☐ Test HTTPS connection to ops.kintowwater.com

Day 3-4:
☐ Create product categories in KINTO UI
☐ Get Category IDs
☐ Prepare import scripts
```

### Week 3: Data Migration

```
Day 1:
☐ Upload CSV files to OCI via SCP
☐ Verify files uploaded correctly
☐ Run import scripts in order

Day 2:
☐ Verify record counts in database
☐ Spot-check sample records
☐ Validate data integrity

Day 3-5:
☐ Set up users (5 max)
☐ Configure roles and permissions
☐ Create checklist templates
☐ Test WhatsApp integration
☐ Train team on KINTO
```

---

## Troubleshooting Upload Issues

### Issue: SCP Command Not Found

**Solution:**
```bash
# Make sure you're in Mac terminal (not inside Docker/VM)
which scp

# If not found, install OpenSSH
brew install openssh
```

### Issue: Permission Denied Error

**Solution:**
```bash
# Check SSH key permissions
ls -la ~/.ssh/kinto-instance.key

# Should show: -rw------- (600)
# Fix permissions:
chmod 600 ~/.ssh/kinto-instance.key
```

### Issue: File Upload Hangs

**Solution:**
```bash
# Add verbose flag to see what's happening
scp -v -i ~/.ssh/kinto-instance.key ~/vyapaar-export/*.csv \
  opc@YOUR_PUBLIC_IP:/home/kinto/kinto-smart-ops/data/

# Or upload one file at a time
scp -i ~/.ssh/kinto-instance.key ~/vyapaar-export/Customers.csv \
  opc@YOUR_PUBLIC_IP:/home/kinto/kinto-smart-ops/data/
```

### Issue: Import Script Fails

**Solution:**
```bash
# Check if CSV file format is correct
cat /home/kinto/kinto-smart-ops/data/Customers.csv | head -5

# Check if csv-parser is installed
npm list csv-parser

# If not installed:
npm install csv-parser

# Run import with verbose logging
node scripts/import-customers.js data/Customers.csv 2>&1 | tee import.log
```

### Issue: Database Connection Error During Import

**Solution:**
```bash
# Verify database is running
sudo systemctl status postgresql-15

# Test connection manually
psql -h localhost -U kinto_user -d kinto_ops -c "SELECT 1;"

# If still failing, restart database
sudo systemctl restart postgresql-15
```

---

## Security Notes

✅ **Best Practices:**
- Only upload from trusted sources (your Mac)
- Verify file checksums before upload
- Delete CSV files after import completes
- Keep .env file secure (never upload to public)
- Use SSH key authentication (not passwords)

❌ **Never:**
- Upload sensitive files via email
- Store CSV files in version control
- Share SSH keys
- Upload with password authentication

---

## Summary: Quick Upload Steps

```bash
# 1. Prepare CSV files on Mac
mkdir ~/vyapaar-export
# Copy CSV files here

# 2. Upload to OCI
scp -i ~/.ssh/kinto-instance.key ~/vyapaar-export/*.csv \
  opc@YOUR_PUBLIC_IP:/home/kinto/kinto-smart-ops/data/

# 3. SSH into OCI
ssh -i ~/.ssh/kinto-instance.key opc@YOUR_PUBLIC_IP

# 4. Run imports
sudo su - kinto
cd /home/kinto/kinto-smart-ops
./upload-and-import.sh

# 5. Verify
psql -h localhost -U kinto_user -d kinto_ops
SELECT COUNT(*) FROM customers;
```

---

**Total time for upload & import: 30-60 minutes**

Once upload is complete, refer to `/docs/VYAPAAR_TO_KINTO_MIGRATION_GUIDE.md` for post-import setup and validation steps.
