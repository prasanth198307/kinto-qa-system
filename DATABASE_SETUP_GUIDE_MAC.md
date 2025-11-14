# 🍎 KINTO Database Setup Guide for MAC

**Last Updated**: November 14, 2025  
**Database**: PostgreSQL  
**Total Tables**: 53

---

## 📊 Complete Database Schema Overview

### Tables Distribution
| Category | Tables | Scripts Location |
|----------|--------|------------------|
| **Baseline Schema** | 31 tables | `database_scripts/01_schema.sql` |
| **WhatsApp Integration** | 1 table | `updated_dbscripts/20251110_incremental_whatsapp_checklist.sql` |
| **Financial & Invoicing** | 6 tables | `updated_dbscripts/20251112_140000_financial_invoicing.sql` |
| **Sales Returns & Credit Notes** | 5 tables | `updated_dbscripts/20251112_140001_sales_returns_credit_notes.sql` |
| **Production Management** | 5 tables | `updated_dbscripts/20251112_140002_production_management.sql` |
| **Configuration & Assignments** | 5 tables | `updated_dbscripts/20251112_140003_configuration_assignments.sql` |
| **TOTAL** | **53 tables** | |

---

## 📋 Complete Table Inventory

### Baseline Schema (31 Tables) - `database_scripts/01_schema.sql`

**Core System (4):**
1. ✅ sessions
2. ✅ roles
3. ✅ role_permissions
4. ✅ users

**Machine Management (5):**
5. ✅ machine_types
6. ✅ machines
7. ✅ machine_spares
8. ✅ user_assignments
9. ✅ spare_parts_catalog

**Quality & Checklists (4):**
10. ✅ checklist_templates
11. ✅ template_tasks
12. ✅ checklist_submissions
13. ✅ submission_tasks

**Preventive Maintenance (6):**
14. ✅ maintenance_plans
15. ✅ pm_task_list_templates
16. ✅ pm_template_tasks
17. ✅ pm_executions
18. ✅ pm_execution_tasks
19. ✅ maintenance_history

**Inventory & Materials (5):**
20. ✅ uom
21. ✅ products
22. ✅ raw_materials
23. ✅ raw_material_transactions
24. ✅ finished_goods

**Vendors & Purchase (3):**
25. ✅ vendors
26. ✅ purchase_orders
27. ✅ required_spares

**Issuance & Dispatch (4):**
28. ✅ raw_material_issuance
29. ✅ raw_material_issuance_items
30. ✅ gatepasses
31. ✅ gatepass_items

---

### Incremental Migrations (22 Tables) - `updated_dbscripts/`

**WhatsApp Integration (1 table):**
32. ✅ partial_task_answers

**Financial & Invoicing (6 tables):**
33. ✅ banks
34. ✅ invoice_templates
35. ✅ terms_conditions
36. ✅ invoices
37. ✅ invoice_items
38. ✅ invoice_payments

**Sales Returns & Credit Notes (5 tables):**
39. ✅ sales_returns
40. ✅ sales_return_items
41. ✅ credit_notes
42. ✅ credit_note_items
43. ✅ manual_credit_note_requests

**Production Management (5 tables):**
44. ✅ raw_material_types
45. ✅ product_bom
46. ✅ production_entries
47. ✅ production_reconciliations
48. ✅ production_reconciliation_items

**Configuration & Assignments (5 tables):**
49. ✅ product_categories
50. ✅ product_types
51. ✅ notification_config
52. ✅ machine_startup_tasks
53. ✅ checklist_assignments

---

## ✅ Verification Status

**Schema Completeness:** ✅ ALL 53 TABLES PRESENT  
**Missing Scripts:** ✅ NONE  
**Script Organization:** ✅ PROPERLY ORGANIZED  
**Foreign Key Dependencies:** ✅ CORRECT ORDER

---

## 🚀 MAC Installation Instructions

### Prerequisites
1. **Install PostgreSQL** (if not already installed):
   ```bash
   brew install postgresql@15
   brew services start postgresql@15
   ```

2. **Verify Installation**:
   ```bash
   psql --version
   # Should show: psql (PostgreSQL) 15.x or higher
   ```

---

### Step 1: Create Database

```bash
# Create database
createdb kinto_qa

# Or using psql:
psql postgres -c "CREATE DATABASE kinto_qa;"
```

---

### Step 2: Execute Baseline Schema Scripts

```bash
# Navigate to project directory
cd /path/to/your/project

# Execute baseline schema (creates 31 tables)
psql -d kinto_qa -f database_scripts/01_schema.sql

# Insert seed data (roles, admin user, permissions, units, machine types)
psql -d kinto_qa -f database_scripts/02_seed_data.sql

# Create performance indexes (optional but recommended)
psql -d kinto_qa -f database_scripts/03_indexes.sql

# Create test users (optional - for testing only)
psql -d kinto_qa -f database_scripts/03_test_users.sql
```

**Expected Output:**
- ✅ 31 tables created
- ✅ 4 roles created (Admin, Manager, Operator, Reviewer)
- ✅ 1 admin user created (admin / Admin@123)
- ✅ 60+ permissions configured
- ✅ 8 units created
- ✅ 5 machine types created
- ✅ 40+ indexes created

---

### Step 3: Execute Incremental Migrations

**Execute in this EXACT order:**

```bash
# 1. Legacy migrations (chronological order)
psql -d kinto_qa -f updated_dbscripts/20251106_163500_production_management.sql
psql -d kinto_qa -f updated_dbscripts/20251107_020000_notification_config.sql
psql -d kinto_qa -f updated_dbscripts/20251110_incremental_whatsapp_checklist.sql
psql -d kinto_qa -f updated_dbscripts/20251111_add_photo_spare_parts_columns.sql

# 2. Complete schema migrations (respects foreign key dependencies)
psql -d kinto_qa -f updated_dbscripts/20251112_140000_financial_invoicing.sql
psql -d kinto_qa -f updated_dbscripts/20251112_140001_sales_returns_credit_notes.sql
psql -d kinto_qa -f updated_dbscripts/20251112_140002_production_management.sql
psql -d kinto_qa -f updated_dbscripts/20251112_140003_configuration_assignments.sql

# 3. Recent patches
psql -d kinto_qa -f updated_dbscripts/20251112_150000_add_credit_notes_approved_by.sql
psql -d kinto_qa -f updated_dbscripts/20251113_060000_product_category_type_display_order.sql
```

**Expected Output:**
- ✅ 22 additional tables created
- ✅ Total: 53 tables in database

---

### Step 4: Verify Installation

```bash
# Count tables (should be 53)
psql -d kinto_qa -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"

# List all tables
psql -d kinto_qa -c "\dt"

# Verify admin user exists
psql -d kinto_qa -c "SELECT username, email, role_id FROM users WHERE username = 'admin';"
```

**Expected Results:**
- Table count: **53**
- Admin user: **admin / admin@kinto.com**

---

## 🔐 Default Credentials

After installation, you can log in with:

| Role | Username | Password | Email |
|------|----------|----------|-------|
| Admin | admin | Admin@123 | admin@kinto.com |
| Manager | manager_test | Test@123 | manager.test@kinto.com |
| Operator | operator_test | Test@123 | operator.test@kinto.com |
| Reviewer | reviewer_test | Test@123 | reviewer.test@kinto.com |

⚠️ **IMPORTANT:** Change admin password immediately after first login!

---

## 🗑️ Production Deployment Checklist

Before deploying to production:

1. ✅ Change admin password from `Admin@123`
2. ✅ Delete test users:
   ```sql
   DELETE FROM users WHERE username IN ('manager_test', 'operator_test', 'reviewer_test');
   ```
3. ✅ Review and adjust role permissions
4. ✅ Configure notification settings (Email/WhatsApp)
5. ✅ Backup database
6. ✅ Set production DATABASE_URL in environment

---

## 🔧 Environment Configuration

Create a `.env` file in your project root:

```env
# Database Connection
DATABASE_URL=postgresql://username:password@localhost:5432/kinto_qa

# Example for local development:
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/kinto_qa

# Session Secret
SESSION_SECRET=your-super-secret-key-here-min-32-chars
```

---

## 📁 Script Organization Summary

### `database_scripts/` (Baseline)
| File | Purpose | Tables Created |
|------|---------|----------------|
| 01_schema.sql | Core database schema | 31 tables |
| 02_seed_data.sql | Initial data (roles, admin, units) | Data only |
| 03_indexes.sql | Performance indexes | 40+ indexes |
| 03_test_users.sql | Test user accounts | 3 users |

### `updated_dbscripts/` (Incremental)
| File | Purpose | Tables Created |
|------|---------|----------------|
| 20251110_incremental_whatsapp_checklist.sql | WhatsApp integration | 1 table |
| 20251112_140000_financial_invoicing.sql | Financial system | 6 tables |
| 20251112_140001_sales_returns_credit_notes.sql | Returns & credit notes | 5 tables |
| 20251112_140002_production_management.sql | Production system | 5 tables |
| 20251112_140003_configuration_assignments.sql | Configuration | 5 tables |
| 20251112_150000_add_credit_notes_approved_by.sql | Credit note approval | Column addition |
| 20251113_060000_product_category_type_display_order.sql | Display ordering | Column additions |

---

## 💾 Backup and Restore

### Backup Database
```bash
# Full backup
pg_dump -d kinto_qa -F c -f kinto_qa_backup_$(date +%Y%m%d).dump

# SQL format backup
pg_dump -d kinto_qa > kinto_qa_backup_$(date +%Y%m%d).sql
```

### Restore Database
```bash
# From custom format
pg_restore -d kinto_qa kinto_qa_backup_20251114.dump

# From SQL format
psql -d kinto_qa < kinto_qa_backup_20251114.sql
```

---

## 🐛 Troubleshooting

### Issue: "database does not exist"
```bash
createdb kinto_qa
```

### Issue: "permission denied"
```bash
# Grant privileges to your user
psql postgres -c "GRANT ALL PRIVILEGES ON DATABASE kinto_qa TO your_username;"
```

### Issue: "table already exists"
- Scripts use `CREATE TABLE IF NOT EXISTS`, so they're safe to re-run
- If you need to start fresh:
  ```bash
  dropdb kinto_qa
  createdb kinto_qa
  # Then re-run all scripts
  ```

### Issue: "foreign key violation"
- Ensure you execute scripts in the exact order specified above
- Foreign key dependencies are respected in the migration order

---

## 📊 Quick Verification Queries

```sql
-- Count all tables
SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';
-- Expected: 53

-- List all tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check roles
SELECT * FROM roles ORDER BY id;
-- Expected: 4 roles (Admin, Manager, Operator, Reviewer)

-- Check users
SELECT username, email, role_id FROM users;

-- Check permissions count
SELECT COUNT(*) FROM role_permissions;
-- Expected: 60+ permissions
```

---

## ✅ Installation Checklist

- [ ] PostgreSQL installed and running
- [ ] Database `kinto_qa` created
- [ ] Baseline schema executed (01_schema.sql)
- [ ] Seed data inserted (02_seed_data.sql)
- [ ] Indexes created (03_indexes.sql)
- [ ] Test users created (03_test_users.sql) - optional
- [ ] All 10 incremental migrations executed in order
- [ ] Total 53 tables verified
- [ ] Admin login tested
- [ ] Environment variables configured
- [ ] Database backup taken

---

## 📞 Support

For issues or questions:
1. Check troubleshooting section above
2. Verify all scripts executed in correct order
3. Check PostgreSQL logs: `tail -f /usr/local/var/log/postgres.log`
4. Refer to deployment guide

---

**Document Version**: 1.0  
**Last Verified**: November 14, 2025  
**Status**: Production Ready ✅
