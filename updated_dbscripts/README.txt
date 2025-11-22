KINTO Smart Ops - Latest Database Scripts for Mac
==================================================

3 FILES ONLY:

1. 01_complete_schema.sql (60 KB)
   - Complete database schema with 27 tables
   - Includes vendor_types, product_categories, product_types
   - All latest updates

2. 02_seed_data.sql (11 KB)
   - Vendor Types: Kinto, HPPani, Purejal
   - Product Categories & Types
   - 4 Roles + 62 Permissions
   - 8 UOMs, 5 Machine Types
   - Admin user (admin / Admin@123)

3. setup_mac.sh
   - Automated installation script

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

That's it!
