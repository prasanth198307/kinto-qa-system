KINTO Smart Ops - COMPLETE Database Scripts for Mac
====================================================

✅ ALL SCHEMA ISSUES FIXED (v2):
- ✓ invoices: Added authorized_signatory_name field
- ✓ production_entries: Added produced_quantity field
- ✓ production_reconciliations: Added production_entry_id field
- ✓ users table: Added mobile_number field
- ✓ role_permissions: Fixed to use INTEGER (0/1) not BOOLEAN
- ✓ vendor_types table: Included
- ✓ product_categories: Added 'code' field
- ✓ product_types: Added 'code' field

📦 4 FILES (COMPLETE SCHEMA):

1. 01_complete_schema.sql (101 KB) ⬅ UPDATED!
   - FRESH export from current dev database
   - ALL 57 tables with COMPLETE structure
   - Includes ALL latest columns
   - No missing fields!

2. 02_seed_data.sql (9 KB)
   - Vendor Types: Kinto, HPPani, Purejal
   - Product Categories (with codes): BTL, CAP, LBL, PKG
   - Product Types (with codes): 500ML, 1LTR, 2LTR, 5LTR, 20LTR
   - 4 Roles + 62 Permissions (using 0/1 not true/false)
   - 8 UOMs, 5 Machine Types
   - Admin user with mobile: 9999999999
   - Fixed: No duplicate key errors

3. setup_mac.sh
   - Automated installation script

4. README.txt
   - This file

INSTALLATION:
-------------

METHOD 1 (Automatic):
    bash setup_mac.sh

METHOD 2 (Manual):
    export DATABASE_URL="postgresql://localhost/kinto_ops"
    psql $DATABASE_URL -f 01_complete_schema.sql
    psql $DATABASE_URL -f 02_seed_data.sql

VERIFY:
-------
    psql kinto_ops -c "SELECT code, name FROM vendor_types;"

Should show: KINTO, HPPANI, PUREJAL

LOGIN:
------
Username: admin
Password: Admin@123
Mobile: 9999999999

✅ COMPLETE SCHEMA - ALL COLUMNS INCLUDED!
Run setup_mac.sh to install fresh database.
