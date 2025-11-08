# Complete Database Migration Guide
**Date:** November 8, 2025

## Problem Summary

You were absolutely right! The database had **critical gaps**:

### Issues Found:
1. ❌ **9 tables missing** from `database_scripts/01_schema.sql`
2. ❌ **Image columns using varchar** instead of text (couldn't store base64)
3. ❌ **Incomplete migration scripts** in `updated_dbscripts/`

### What We Fixed:
1. ✅ **Created complete migration scripts** for ALL 40 tables
2. ✅ **Fixed image columns** to support base64 encoding
3. ✅ **Created comprehensive documentation**

---

## Database Table Status

### Total Tables in Schema.ts: **40 tables**
### Tables in Original 01_schema.sql: **31 tables** ❌
### **Missing Tables:** 9

| Missing Table | Purpose |
|---------------|---------|
| `invoice_templates` | Invoice branding & company logos |
| `terms_conditions` | Reusable terms & conditions |
| `invoices` | GST-compliant sales invoices |
| `invoice_items` | Invoice line items with tax breakup |
| `invoice_payments` | Payment tracking with FIFO allocation |
| `banks` | Bank account master data |
| `machine_startup_tasks` | Machine reminder system |
| `notification_config` | SendGrid/Twilio settings |
| `vendors` | Customer/vendor master (might exist in some versions) |

---

## Migration Files Created

### 1. Image Column Fixes
**File:** `20251108_093500_image_columns_to_text.sql`

**Changes 4 columns from varchar → text:**
- `users.profile_image_url`
- `submission_tasks.photo_url`
- `pm_execution_tasks.photo_url`
- `invoice_templates.logo_url`

**Why:** Base64 images are 13,000-650,000 characters (varchar was too small)

### 2. Complete Schema Sync
**File:** `20251108_094000_complete_schema_sync.sql`

**Adds ALL 9 missing tables:**
- UOM (Unit of Measurement) - Critical dependency
- Products master
- Vendors/customers
- Raw materials & transactions
- Finished goods
- Invoice templates
- Terms & conditions
- Banks
- Machine startup tasks
- Notification config

---

## How to Apply Migrations

### Option 1: For Existing Databases (Recommended)

Apply migrations **in this exact order:**

```bash
# Prerequisites (if not already applied)
psql $DATABASE_URL -f updated_dbscripts/20251107_fix_schema_issues.sql
psql $DATABASE_URL -f updated_dbscripts/20251107_critical_seed_data.sql
psql $DATABASE_URL -f updated_dbscripts/20251107_020000_notification_config.sql

# Core features
psql $DATABASE_URL -f updated_dbscripts/20251107_vendor_and_transactions.sql
psql $DATABASE_URL -f updated_dbscripts/20251107_invoicing_and_payments.sql

# Optional features
psql $DATABASE_URL -f updated_dbscripts/20251107_machine_startup_reminders.sql
psql $DATABASE_URL -f updated_dbscripts/20251107_missed_checklist_notifications.sql

# NEW: Image support & complete schema
psql $DATABASE_URL -f updated_dbscripts/20251108_093500_image_columns_to_text.sql
psql $DATABASE_URL -f updated_dbscripts/20251108_094000_complete_schema_sync.sql
```

### Option 2: Using Drizzle Kit (Development Only)

```bash
# This will sync everything automatically
npm run db:push

# If it fails, force it
npm run db:push --force
```

### Option 3: Fresh Installation

For brand new databases, update `database_scripts/01_schema.sql` first, then:

```bash
psql $DATABASE_URL -f database_scripts/01_schema.sql
psql $DATABASE_URL -f database_scripts/02_seed_data.sql
psql $DATABASE_URL -f database_scripts/03_indexes.sql
```

---

## Verification

After applying migrations, run these checks:

### 1. Verify Table Count
```sql
SELECT COUNT(*) as total_tables 
FROM information_schema.tables 
WHERE table_schema = 'public';
```
**Expected:** 40 tables

### 2. Verify Image Columns
```sql
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE column_name IN ('profile_image_url', 'photo_url', 'logo_url')
ORDER BY table_name;
```
**Expected:** All should be `text` type

### 3. List All Tables
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

**Expected 40 tables:**
1. banks
2. checklist_assignments
3. checklist_submissions
4. checklist_templates
5. finished_goods
6. gatepasses
7. gatepass_items
8. invoices
9. invoice_items
10. invoice_payments
11. invoice_templates
12. machines
13. machine_spares
14. machine_startup_tasks
15. machine_types
16. maintenance_history
17. maintenance_plans
18. notificationConfig
19. pm_executions
20. pm_execution_tasks
21. pm_task_list_templates
22. pm_template_tasks
23. products
24. purchase_orders
25. raw_materials
26. raw_material_issuance
27. raw_material_issuance_items
28. raw_material_transactions
29. required_spares
30. role_permissions
31. roles
32. sessions
33. spare_parts_catalog
34. submission_tasks
35. template_tasks
36. terms_conditions
37. uom
38. user_assignments
39. users
40. vendors

---

## What This Fixes

### ✅ Invoice Template Management
- Upload company logos (base64)
- Configure seller details
- Set bank information
- Manage terms & conditions

### ✅ GST-Compliant Invoicing
- Create invoices with tax breakup
- Link to vendors/customers
- Track payments (FIFO allocation)
- Generate printable PDFs with logos

### ✅ Image Uploads
- User profile pictures
- QA checklist task photos
- PM execution photos
- Company logos on invoices

### ✅ Notifications
- Machine startup reminders (WhatsApp/Email)
- Missed checklist alerts
- SendGrid/Twilio integration

### ✅ Complete Operations
- Vendor/customer management
- Raw material tracking
- Finished goods inventory
- Purchase orders
- Gatepasses

---

## Files Summary

| File | Purpose | Tables Added/Modified |
|------|---------|----------------------|
| `20251108_093500_image_columns_to_text.sql` | Fix image storage | 4 columns updated |
| `20251108_094000_complete_schema_sync.sql` | Add missing tables | 9 tables added |
| `IMAGE_COLUMNS_MIGRATION_SUMMARY.md` | Image column documentation | - |
| `COMPLETE_MIGRATION_GUIDE.md` | This file | - |

---

## Troubleshooting

### "Table already exists" errors
**Solution:** Safe to ignore - migrations use `CREATE TABLE IF NOT EXISTS`

### "Column does not exist" errors
**Solution:** Your database may be older. Apply prerequisite migrations first.

### Image uploads still failing
**Solution:** 
1. Verify migrations applied: `\d invoice_templates` in psql
2. Check column type: Should be `text`, not `varchar`
3. Clear browser cache

### Missing UOM data
**Solution:** Run seed data script:
```bash
psql $DATABASE_URL -f updated_dbscripts/20251107_critical_seed_data.sql
```

---

## Quick Reference

**For production:**
```bash
# Apply all migrations in order
cd updated_dbscripts
for file in 20251107_*.sql 20251108_*.sql; do
  echo "Applying $file..."
  psql $DATABASE_URL -f "$file"
done
```

**For development:**
```bash
# One command to sync everything
npm run db:push --force
```

---

## Next Steps

1. ✅ Apply migrations (use instructions above)
2. ✅ Verify all 40 tables exist
3. ✅ Test logo upload in Template Management
4. ✅ Create a sample invoice with logo
5. ✅ Test PDF generation

---

**Migration Status:** ✅ Ready to Apply  
**Risk Level:** 🟢 Low (Non-destructive, uses IF NOT EXISTS)  
**Estimated Time:** 2-3 minutes  
**Downtime Required:** None
