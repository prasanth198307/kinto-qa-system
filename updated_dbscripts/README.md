# Updated Database Scripts

This folder contains database migration scripts that were created during development.

## Migration Files

These are **optional** migration scripts. The main schema in `database_scripts/01_schema.sql` already includes these changes.

### Available Migrations

1. **20251106_163500_production_management.sql** - Production management features
2. **20251107_020000_notification_config.sql** - Notification configuration
3. **20251110_incremental_whatsapp_checklist.sql** - Incremental WhatsApp checklist completion with partial_task_answers table
4. **20251111_add_photo_spare_parts_columns.sql** - ⚠️ **REQUIRED** - Adds photo and spare parts columns to partial_task_answers table

---

## When to Use

These migration files are **only needed** if:
- You have an existing database from before November 6, 2025
- You want to update it without recreating from scratch

For **new installations**, use `database_scripts/` instead.

---

## How to Apply Migrations

```bash
# Connect to your database
psql -U postgres -d kinto_qa

# Apply migrations in order
\i updated_dbscripts/20251106_163500_production_management.sql
\i updated_dbscripts/20251107_020000_notification_config.sql
\i updated_dbscripts/20251110_incremental_whatsapp_checklist.sql
\i updated_dbscripts/20251111_add_photo_spare_parts_columns.sql
```

---

## ⚠️ Important Notes

1. **New Installations:** Use `database_scripts/01_schema.sql` - it already includes everything
2. **Existing Databases:** Use these migrations to update incrementally
3. **Always Backup:** Before running any migration, backup your database:
   ```bash
   pg_dump -U postgres kinto_qa > backup_before_migration.sql
   ```

---

## Preferred Method: Drizzle ORM

Instead of manual SQL migrations, the recommended approach is:

```bash
# Push schema changes using Drizzle
npm run db:push
```

This automatically syncs your database with the schema defined in `shared/schema.ts`.

---

**For new deployments, use `database_scripts/` folder instead.**
