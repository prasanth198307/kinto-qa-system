# KINTO Database Scripts

SQL scripts for database setup and initialization.

## 📁 Files in This Folder

### Core SQL Scripts (Execute in Order)
1. **01_schema.sql** - Creates all database tables and schema
2. **02_seed_data.sql** - Inserts default roles and admin user  
3. **03_indexes.sql** - Creates performance indexes (optional but recommended)
4. **03_test_users.sql** - Creates test users for testing (optional)

## Prerequisites

- PostgreSQL 13 or higher
- Database user with CREATE, INSERT, UPDATE, DELETE privileges
- Network access to the PostgreSQL server

## Quick Start Installation

Execute the scripts in the following order:

1. **01_schema.sql** - Creates 27 tables with soft delete support
2. **02_seed_data.sql** - Inserts 4 roles, admin user, and initial data
3. **03_indexes.sql** - Creates 40+ performance indexes (optional but recommended)
4. **03_test_users.sql** - Creates 4 test users (for testing only)

## 📊 What Gets Created

### 01_schema.sql (27 Tables)
**Core System:**
- sessions, roles, role_permissions, users

**Machine Management:**
- machines, machine_types, machine_spares, spare_parts

**Quality & Checklists:**
- checklist_templates, checklist_template_tasks, checklist_assignments
- checklist_submissions, checklist_submission_tasks

**Preventive Maintenance:**
- pm_task_lists, pm_task_list_items, pm_executions, pm_execution_items

**Inventory & Materials:**
- inventory_master, raw_material_issuance_headers, raw_material_issuance_details

**Vendors & Customers:**
- vendor_master (customers, suppliers, both)

**Purchase & Invoicing:**
- purchase_orders, purchase_order_items
- invoice_templates, bank_details
- invoices, invoice_items
- gatepasses, gatepass_items

**Reminders:**
- machine_startup_tasks

All tables include soft delete support (record_status field)

### 02_seed_data.sql (Initial Data)
- **4 Roles:** Admin, Manager, Operator, Reviewer
- **1 Admin User:** admin / Admin@123
- **60+ Permissions:** Screen-level access control
- **8 Units:** Kg, Ltr, Nos, Mtr, Pcs, Box, Carton, Set
- **5 Machine Types:** CNC, Lathe, Mill, Grinder, Press

### 03_indexes.sql (40+ Indexes)
- Performance indexes on all foreign keys
- Composite indexes for common queries
- Partial indexes for active records only
- Full-text search support

### 03_test_users.sql (Test Accounts)
- manager_test / Test@123 (Manager)
- operator_test / Test@123 (Operator)
- reviewer_test / Test@123 (Reviewer)

⚠️ **Delete test users before production deployment!**

## Execution Instructions

### Method 1: Using psql Command Line

```bash
# Connect to PostgreSQL and create database
psql -U postgres -c "CREATE DATABASE kinto_qa;"

# Run schema creation
psql -U postgres -d kinto_qa -f 01_schema.sql

# Insert seed data
psql -U postgres -d kinto_qa -f 02_seed_data.sql

# Create indexes (optional)
psql -U postgres -d kinto_qa -f 03_indexes.sql
```

### Method 2: Using pgAdmin

1. Open pgAdmin and connect to your PostgreSQL server
2. Create a new database named `kinto_qa`
3. Open Query Tool for the `kinto_qa` database
4. Open and execute `01_schema.sql`
5. Open and execute `02_seed_data.sql`
6. Open and execute `03_indexes.sql`

### Method 3: Using DBeaver

1. Connect to PostgreSQL server
2. Create new database `kinto_qa`
3. Right-click on database → SQL Editor → Execute SQL Script
4. Select and execute each file in order

## 🔐 Default Admin Credentials

After running seed data:

- **Username:** admin
- **Password:** Admin@123
- **Email:** admin@kinto.com
- **Role:** Administrator

⚠️ **IMPORTANT:** Change password immediately after first login!

## ⚠️ Production Security

Before deploying to production:

1. **Change admin password** from Admin@123
2. **Delete test users** (if you ran 03_test_users.sql):
   ```sql
   DELETE FROM users WHERE username IN ('manager_test', 'operator_test', 'reviewer_test');
   ```
3. **Review permissions** for each role
4. **Backup database** before going live

## Database Configuration

Set the following environment variable in your application:

```env
DATABASE_URL=postgresql://username:password@hostname:port/kinto_qa
```

Example:
```env
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/kinto_qa
```

## Backup and Restore

### Backup
```bash
pg_dump -U postgres kinto_qa > kinto_qa_backup.sql
```

### Restore
```bash
psql -U postgres kinto_qa < kinto_qa_backup.sql
```

## Troubleshooting

### Connection Issues
- Verify PostgreSQL service is running
- Check firewall settings
- Verify `pg_hba.conf` allows connections from your IP
- Ensure correct port (default 5432)

### Permission Issues
- Ensure database user has necessary privileges
- Grant privileges: `GRANT ALL PRIVILEGES ON DATABASE kinto_qa TO your_user;`

### Schema Already Exists
- Drop and recreate database if starting fresh
- Or use migration scripts for updates

## Support

For issues or questions, contact your system administrator or refer to the deployment guide.
