KINTO Smart Ops - FIXED Database Scripts for Mac
=================================================

✅ CORRECTED ISSUES:
- ✓ users table: Added mobile_number field
- ✓ role_permissions: Fixed to use INTEGER (0/1) instead of BOOLEAN
- ✓ vendor_types table: NOW INCLUDED! (was missing before)
- ✓ product_categories: Added required 'code' field
- ✓ product_types: Added required 'code' field

📦 4 FILES:

1. 01_complete_schema.sql (71 KB)
   - Complete database schema from YOUR current dev database
   - Includes vendor_types, product_categories, product_types
   - All 27 tables with correct structure

2. 02_seed_data.sql (9 KB)
   - Vendor Types: Kinto, HPPani, Purejal
   - Product Categories (with codes): BTL, CAP, LBL, PKG
   - Product Types (with codes): 500ML, 1LTR, 2LTR, 5LTR, 20LTR
   - 4 Roles + 62 Permissions (using 0/1 not true/false)
   - 8 UOMs, 5 Machine Types
   - Admin user with mobile: 9999999999

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

✅ ALL ERRORS FIXED - READY TO USE!
