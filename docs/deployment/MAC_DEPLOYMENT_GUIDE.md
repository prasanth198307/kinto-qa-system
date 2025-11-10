# KINTO QA Management System - Mac Deployment Guide

## 📋 Prerequisites

Before starting, ensure you have:
- ✅ PostgreSQL installed on Mac (via Homebrew or Postgres.app)
- ✅ Database credentials (username, password, database name)
- ✅ Terminal access
- ✅ Backup of existing data (if any)

---

## 🗂️ Migration Scripts Overview

You have **12 migration scripts** ready to deploy located in `updated_dbscripts/`:

1. `20251106_163500_production_management.sql` - Core production tables
2. `20251107_020000_notification_config.sql` - Notification system
3. `20251107_040000_add_mobile_number.sql` - Mobile number fields
4. `20251107_critical_seed_data.sql` - Essential seed data
5. `20251107_fix_schema_issues.sql` - Schema corrections
6. `20251107_gatepass_invoice_relationship.sql` - **Invoice-first gatepass flow**
7. `20251107_invoicing_and_payments.sql` - Invoice & payment tables
8. `20251107_machine_startup_reminders.sql` - Machine startup system
9. `20251107_missed_checklist_notifications.sql` - Missed checklist alerts
10. `20251107_vendor_and_transactions.sql` - Vendor & transaction tables
11. `20251107_vendor_is_cluster.sql` - **Cluster flag for vendors**
12. `20251107_gatepass_invoice_is_cluster.sql` - **Cluster flags for gatepasses & invoices**

---

## 🚀 Quick Start Deployment

### Step 1: Backup Database (MANDATORY!)

```bash
mkdir -p ~/kinto-backups
pg_dump -U your_username -d your_database_name > ~/kinto-backups/backup_$(date +%Y%m%d_%H%M%S).sql
```

### Step 2: Run All Migrations

```bash
cd /path/to/kinto-project

# Run all scripts in order
for file in updated_dbscripts/*.sql; do
  echo "Running: $file"
  psql -U your_username -d your_database_name -f "$file"
done
```

### Step 3: Verify

```bash
psql -U your_username -d your_database_name -c "\d vendors"
psql -U your_username -d your_database_name -c "\d gatepasses"
psql -U your_username -d your_database_name -c "\d invoices"
```

You should see:
- `is_cluster` column in vendors
- `is_cluster` and `invoice_id` columns in gatepasses
- `is_cluster` column in invoices

---

## 📖 Detailed Deployment Guide

### Option A: Automated Migration Script

Create a migration runner:

```bash
cat > run_migrations.sh << 'SCRIPT'
#!/bin/bash

DB_USER="YOUR_USERNAME"
DB_NAME="YOUR_DATABASE"

echo "KINTO QA - Running Database Migrations"
echo "======================================"

MIGRATIONS=(
  "20251106_163500_production_management.sql"
  "20251107_020000_notification_config.sql"
  "20251107_040000_add_mobile_number.sql"
  "20251107_critical_seed_data.sql"
  "20251107_fix_schema_issues.sql"
  "20251107_gatepass_invoice_relationship.sql"
  "20251107_invoicing_and_payments.sql"
  "20251107_machine_startup_reminders.sql"
  "20251107_missed_checklist_notifications.sql"
  "20251107_vendor_and_transactions.sql"
  "20251107_vendor_is_cluster.sql"
  "20251107_gatepass_invoice_is_cluster.sql"
)

for script in "${MIGRATIONS[@]}"; do
  echo "Running: $script"
  psql -U "$DB_USER" -d "$DB_NAME" -f "updated_dbscripts/$script"
  if [ $? -eq 0 ]; then
    echo "✓ SUCCESS"
  else
    echo "✗ FAILED"
    exit 1
  fi
done

echo "======================================"
echo "All migrations completed successfully!"
SCRIPT

chmod +x run_migrations.sh
./run_migrations.sh
```

### Option B: Manual Step-by-Step

```bash
DB_USER="your_username"
DB_NAME="your_database_name"

psql -U $DB_USER -d $DB_NAME -f updated_dbscripts/20251106_163500_production_management.sql
psql -U $DB_USER -d $DB_NAME -f updated_dbscripts/20251107_020000_notification_config.sql
psql -U $DB_USER -d $DB_NAME -f updated_dbscripts/20251107_040000_add_mobile_number.sql
psql -U $DB_USER -d $DB_NAME -f updated_dbscripts/20251107_critical_seed_data.sql
psql -U $DB_USER -d $DB_NAME -f updated_dbscripts/20251107_fix_schema_issues.sql
psql -U $DB_USER -d $DB_NAME -f updated_dbscripts/20251107_gatepass_invoice_relationship.sql
psql -U $DB_USER -d $DB_NAME -f updated_dbscripts/20251107_invoicing_and_payments.sql
psql -U $DB_USER -d $DB_NAME -f updated_dbscripts/20251107_machine_startup_reminders.sql
psql -U $DB_USER -d $DB_NAME -f updated_dbscripts/20251107_missed_checklist_notifications.sql
psql -U $DB_USER -d $DB_NAME -f updated_dbscripts/20251107_vendor_and_transactions.sql
psql -U $DB_USER -d $DB_NAME -f updated_dbscripts/20251107_vendor_is_cluster.sql
psql -U $DB_USER -d $DB_NAME -f updated_dbscripts/20251107_gatepass_invoice_is_cluster.sql
```

---

## ✅ Verification

Check that new columns exist:

```bash
psql -U your_username -d your_database_name << 'SQL'
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'vendors' AND column_name = 'is_cluster';

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('gatepasses', 'invoices') 
  AND column_name IN ('is_cluster', 'invoice_id')
ORDER BY table_name, column_name;
SQL
```

Expected output:
```
 column_name | data_type
-------------+-----------
 is_cluster  | integer

 column_name | data_type        | table_name
-------------+------------------+------------
 invoice_id  | character varying| gatepasses
 is_cluster  | integer          | gatepasses
 is_cluster  | integer          | invoices
```

---

## 🔧 Environment Configuration

Create `.env` file:

```
DATABASE_URL=postgresql://user:pass@localhost:5432/kinto_db
SESSION_SECRET=your-secret-key
SENDGRID_API_KEY=your-sendgrid-key
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
NOTIFICATION_MODE=production
NODE_ENV=production
PORT=5000
```

---

## 🧪 Testing New Features

### 1. Vendor Cluster Flag
- Go to: **Inventory → Vendor Master**
- Click "Add Vendor"
- Fill details
- **Check "Is Cluster" checkbox**
- Save
- Verify "Cluster" column shows "Yes"

### 2. Invoice Inventory Validation
- Go to: **Operations → Sales Invoices**
- Click "Create Sales Invoice"
- Try selecting product with no stock → **Should alert "No Stock Available"**
- Select product with stock → **Shows available quantity**
- Enter quantity > available → **Auto-corrects to max**

### 3. Gatepass Auto-Population
- Create an invoice first
- Go to: **Operations → Gatepasses**
- Click "Add Gatepass"
- **Select invoice from dropdown**
- Customer name auto-fills ✓
- Cluster flag auto-copies ✓
- Items auto-populate ✓

---

## 🔄 Rollback Procedure

If needed:

```bash
# Stop application
# Restore from backup
psql -U your_username -d your_database_name < ~/kinto-backups/backup_TIMESTAMP.sql
```

---

## 📊 Post-Deployment Checklist

- [ ] Database backup created
- [ ] All 12 migration scripts run successfully
- [ ] `is_cluster` in vendors, gatepasses, invoices
- [ ] `invoice_id` in gatepasses
- [ ] Application starts without errors
- [ ] Vendor cluster flag works
- [ ] Invoice inventory validation works
- [ ] Gatepass auto-population works

---

## 🆘 Common Issues

**"psql: command not found"**
```bash
# Postgres.app
export PATH="/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH"

# Homebrew
brew install postgresql@15
```

**"relation already exists"**
- This is normal - scripts use `CREATE TABLE IF NOT EXISTS`

**Migration fails**
1. Check error message
2. Restore from backup
3. Fix issue
4. Re-run migrations

---

## 🎉 Success Criteria

✅ All migrations completed  
✅ New columns present in database  
✅ Application runs without errors  
✅ New features working  
✅ Ready for production!  

---

**Version:** 1.0  
**Date:** November 7, 2025  
**Total Scripts:** 12
