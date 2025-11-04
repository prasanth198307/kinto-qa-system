# KINTO QA Database Scripts - Quick Reference

## 📁 Files in this Directory

### SQL Scripts (Execute in Order)
1. **01_schema.sql** - Creates all database tables and schema
2. **02_seed_data.sql** - Inserts default roles, admin user, and sample data
3. **03_indexes.sql** - Creates performance indexes (optional but recommended)

### Documentation
- **README.md** - Installation instructions and troubleshooting
- **DATABASE_SCRIPTS_INDEX.md** - This file
- **MOBILE_APK_DEPLOYMENT.md** - Android app deployment guide
- **MOBILE_IPA_DEPLOYMENT.md** - iOS app deployment guide

## 🚀 Quick Start

### For New Installation

```bash
# 1. Create database
psql -U postgres -c "CREATE DATABASE kinto_qa;"

# 2. Run schema
psql -U postgres -d kinto_qa -f 01_schema.sql

# 3. Insert seed data
psql -U postgres -d kinto_qa -f 02_seed_data.sql

# 4. Create indexes (optional)
psql -U postgres -d kinto_qa -f 03_indexes.sql
```

### Default Login

After running seed data:
- **Username:** admin
- **Password:** Admin@123
- **Email:** admin@kinto.com

⚠️ Change password immediately after first login!

## 📊 What Gets Created

### Schema (01_schema.sql)
- 27 tables total
- All with soft delete support (record_status field)
- Complete with foreign key relationships
- Performance indexes included

### Seed Data (02_seed_data.sql)
- 4 default roles (admin, manager, operator, reviewer)
- 1 admin user (username: admin)
- 60+ role permissions
- 8 sample units of measure
- 5 sample machine types

### Indexes (03_indexes.sql)
- 40+ performance indexes
- Full-text search support
- Composite indexes for common queries
- Partial indexes for active records only

## 📋 Tables Created

### Core System
- sessions (session management)
- roles (role definitions)
- role_permissions (granular permissions)
- users (user accounts)

### Machine Management
- machines (equipment registry)
- machine_types (machine categories)
- machine_spares (machine-spare part relations)

### Quality Checklists
- checklist_templates (reusable templates)
- template_tasks (template task definitions)
- checklist_submissions (completed checklists)
- submission_tasks (individual task submissions)

### Spare Parts
- spare_parts_catalog (parts inventory)
- required_spares (maintenance requirements)
- purchase_orders (PO management)

### Maintenance
- maintenance_plans (PM schedules)
- pm_task_list_templates (PM task templates)
- pm_template_tasks (template tasks)
- pm_executions (PM execution records)
- pm_execution_tasks (execution task records)
- maintenance_history (historical records)

### Inventory
- uom (units of measure)
- products (product master data)
- raw_materials (raw material inventory)
- raw_material_transactions (transaction history)
- finished_goods (production output)

### Assignments
- user_assignments (user-machine assignments)

## 🔧 Customization

### Adding Custom Roles

Edit `02_seed_data.sql` before running:

```sql
INSERT INTO roles (id, name, description, permissions, record_status) VALUES
('role-custom', 'custom_role', 'My Custom Role', ARRAY['permission1', 'permission2'], 1);
```

### Adding Custom Permissions

```sql
INSERT INTO role_permissions (role_id, screen_key, can_view, can_create, can_edit, can_delete, record_status) VALUES
('role-custom', 'my_screen', 1, 1, 1, 1, 1);
```

### Adding Custom UOM

```sql
INSERT INTO uom (code, name, description, record_status) VALUES
('CUSTOM', 'Custom Unit', 'Description', 1);
```

## 🔄 Updates and Migrations

### When Updating Application

If you're updating from a previous version:

1. **Backup first!**
   ```bash
   pg_dump -U postgres kinto_qa > backup_before_update.sql
   ```

2. **Check for migration scripts**
   - Look for files like `migration_v1_to_v2.sql`
   - Run in order

3. **Or use Drizzle from application**
   ```bash
   npm run db:push
   ```

## 🛠️ Troubleshooting

### Script Fails to Run

**Error: "relation already exists"**
- Tables already created
- Either drop database and start fresh, or skip to next script

**Error: "permission denied"**
- Ensure PostgreSQL user has correct permissions
- Grant with: `GRANT ALL PRIVILEGES ON DATABASE kinto_qa TO your_user;`

**Error: "syntax error"**
- Ensure you're using PostgreSQL 13+
- Check you're running correct SQL file

### Verification Commands

```sql
-- Count tables
SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';
-- Should return 27

-- Count roles
SELECT COUNT(*) FROM roles WHERE record_status = 1;
-- Should return 4

-- Count permissions
SELECT COUNT(*) FROM role_permissions WHERE record_status = 1;
-- Should return 60+

-- Check admin user
SELECT username, email FROM users WHERE username = 'admin';
```

## 📞 Support

For help with database setup:
1. Check README.md in this directory
2. Review complete deployment guide
3. Check PostgreSQL logs
4. Contact technical support

---

**Last Updated:** November 2025  
**Schema Version:** 1.0.0
