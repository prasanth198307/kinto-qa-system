# KINTO Smart Ops - Database Setup for Mac

Complete guide for setting up the KINTO Smart Ops database on your Mac with all the latest updates including vendor types, product categories, and more.

## 📦 What's Included

This package contains:
- ✅ **Complete Schema** (27 tables, 1080 lines SQL)
- ✅ **All Reference Data** including vendor types (Kinto, HPPani, Purejal)
- ✅ **Default Admin User** (username: admin, password: Admin@123)
- ✅ **62 Role Permissions** across 36 system screens
- ✅ **8 Units of Measurement** (PCS, KG, LTR, etc.)
- ✅ **5 Machine Types**
- ✅ **3 Vendor Types** (Kinto, HPPani, Purejal)
- ✅ **4 Product Categories** (Bottles, Caps, Labels, Packaging)
- ✅ **5 Product Types** (500ML, 1LTR, 2LTR, 5LTR, 20LTR)

## 🚀 Quick Start (Mac)

### Prerequisites

1. **Install PostgreSQL** (if not already installed):
```bash
# Using Homebrew (recommended)
brew install postgresql@15

# Start PostgreSQL service
brew services start postgresql@15
```

2. **Verify PostgreSQL is running**:
```bash
psql --version
# Should show: psql (PostgreSQL) 15.x
```

### Step 1: Create Database

```bash
# Create a new database
createdb kinto_ops

# Verify database exists
psql -l | grep kinto_ops
```

### Step 2: Set Database URL

```bash
# Export DATABASE_URL for current terminal session
export DATABASE_URL="postgresql://localhost/kinto_ops"

# Or if you have a password:
export DATABASE_URL="postgresql://username:password@localhost/kinto_ops"

# Verify it's set
echo $DATABASE_URL
```

**TIP:** Add this to your `~/.zshrc` or `~/.bash_profile` to make it permanent:
```bash
echo 'export DATABASE_URL="postgresql://localhost/kinto_ops"' >> ~/.zshrc
source ~/.zshrc
```

### Step 3: Run Database Scripts

Navigate to the `updated_dbscripts` folder and run:

```bash
# 1. Create all tables (schema)
psql $DATABASE_URL -f 01_complete_schema.sql

# 2. Load reference data (roles, permissions, vendor types, etc.)
psql $DATABASE_URL -f 02_seed_data.sql
```

### Step 4: Verify Installation

```bash
# Connect to database
psql $DATABASE_URL

# Check tables
\dt

# Check roles
SELECT * FROM roles;

# Check vendor types (should show Kinto, HPPani, Purejal)
SELECT * FROM vendor_types;

# Check admin user exists
SELECT username, email, first_name, last_name FROM users WHERE username = 'admin';

# Exit psql
\q
```

## 📋 What Gets Created

### Tables (27 total)
- banks
- checklist_assignments
- checklist_submissions  
- checklist_templates
- credit_notes & credit_note_items
- dispatch_tracking
- finished_goods
- gatepass_items & gatepasses
- invoice_items & invoices
- machines & machine_types
- payments
- product_bom & products
- product_categories & product_types
- production_entries & production_reconciliation
- purchase_order_items & purchase_orders
- raw_material_entry & raw_material_issuance
- raw_materials & raw_material_types
- roles & role_permissions
- sales_returns & sales_return_items
- sessions
- uom (units of measurement)
- users
- vendor_types & vendor_vendor_types
- vendors
- whatsapp_checklist_sessions

### Default Data

**Roles:**
- Admin (full access)
- Manager (management access)
- Operator (limited access)
- Reviewer (quality check access)

**Default Admin User:**
- Username: `admin`
- Password: `Admin@123`
- Email: admin@kinto.com
- ⚠️ **IMPORTANT: Change password after first login!**

**Vendor Types (NEW!):**
- **KINTO** - Kinto brand products and suppliers
- **HPPANI** - HPPani brand products and suppliers  
- **PUREJAL** - Purejal brand products and suppliers

**Product Categories:**
- Bottles
- Caps
- Labels
- Packaging

**Product Types:**
- 500ML
- 1LTR
- 2LTR
- 5LTR
- 20LTR

**Units of Measurement:**
- PCS (Pieces)
- KG (Kilograms)
- LTR (Liters)
- MTR (Meters)
- BOX, SET, ROLL, BAG

## 🔧 Troubleshooting

### Error: "role does not exist"

```bash
# Create PostgreSQL user if needed
createuser -s yourusername
```

### Error: "database does not exist"

```bash
# Create the database first
createdb kinto_ops
```

### Error: "connection refused"

```bash
# Start PostgreSQL service
brew services start postgresql@15

# Check if it's running
brew services list | grep postgresql
```

### Error: "permission denied"

```bash
# Connect as superuser first
psql postgres

# Grant permissions
GRANT ALL PRIVILEGES ON DATABASE kinto_ops TO yourusername;
\q
```

## 🔄 Re-running Scripts

Both scripts are **IDEMPOTENT** - safe to run multiple times:

```bash
# Safe to re-run - will skip existing data
psql $DATABASE_URL -f 01_complete_schema.sql
psql $DATABASE_URL -f 02_seed_data.sql
```

The seed script uses `ON CONFLICT` to prevent duplicates:
- Existing data is **updated**, not duplicated
- Admin password is **preserved** if user already exists
- Vendor types and other reference data are updated

## 📊 Verify Vendor Types

After running the scripts, verify vendor types are loaded:

```bash
psql $DATABASE_URL -c "SELECT code, name, description FROM vendor_types ORDER BY code;"
```

Expected output:
```
  code   |  name   |           description
---------+---------+------------------------------------
 HPPANI  | HPPani  | HPPani brand products and suppliers
 KINTO   | Kinto   | Kinto brand products and suppliers
 PUREJAL | Purejal | Purejal brand products and suppliers
```

## 🔐 Security Notes

1. **Change default password immediately:**
```sql
-- Connect to database
psql $DATABASE_URL

-- Update admin password (use your own secure password)
UPDATE users 
SET password = 'your-hashed-password-here' 
WHERE username = 'admin';
```

2. **Remove test users before production:**
```sql
DELETE FROM users WHERE username LIKE '%_test';
```

3. **Use strong passwords in production:**
```bash
# Generate random password
openssl rand -base64 24
```

## 🎯 Next Steps

After successful database setup:

1. ✅ Verify all tables created: `psql $DATABASE_URL -c "\dt"`
2. ✅ Login with admin credentials
3. ✅ Change admin password
4. ✅ Create your first vendor with vendor type classification
5. ✅ Set up products with categories and types
6. ✅ Configure machines and checklist templates

## 📞 Support

If you encounter issues:
1. Check PostgreSQL is running: `brew services list`
2. Verify DATABASE_URL is set: `echo $DATABASE_URL`
3. Check database exists: `psql -l`
4. Review error logs in terminal output

## 🆕 What's New (Latest Updates)

- ✨ **Vendor Type System** - Three-tier classification (Kinto, HPPani, Purejal)
- ✨ **Product Categories & Types** - Enhanced product organization
- ✨ **Raw Material Types** - Complete material classification
- ✨ **Payment Write-Off** - Admin functionality for invoice management
- ✨ **Comprehensive Search & Filters** - Advanced filtering across all screens
- ✨ **Vyapaar Data Import Support** - Automatic vendor type classification
- ✨ **62 Role Permissions** - Granular access control across 36 screens

---

**Database Scripts Version:** November 2025  
**Schema Version:** 1.0.0  
**Total Tables:** 27  
**Total Reference Data:** 4 roles, 62 permissions, 8 UOMs, 5 machine types, 3 vendor types, 4 categories, 5 product types
