# Database Migration Scripts

## Overview
This folder contains incremental migration scripts for updating existing KINTO QA databases.

## Migration Files

### 20251107_vendor_and_transactions.sql
**Date:** November 7, 2025  
**Purpose:** Adds vendor master, raw material issuance, and gatepass functionality

**Tables Added:**
1. `vendors` - Vendor/customer master data
2. `raw_material_issuance` - Raw material issuance headers
3. `raw_material_issuance_items` - Raw material issuance line items
4. `gatepasses` - Gatepass headers for finished goods dispatch
5. `gatepass_items` - Gatepass line items

**Features:**
- Complete vendor master with address, GST, Aadhaar, mobile number
- Multi-item transaction support via header-detail pattern
- Vendor integration in gatepasses
- Comprehensive indexes for performance
- Full audit trail support

## How to Apply Migration

### For Existing Databases

If you already have a KINTO QA database running, apply this migration:

```bash
# Using psql
psql $DATABASE_URL -f updated_dbscripts/20251107_vendor_and_transactions.sql

# Or with explicit connection
psql -U postgres -d kinto_qa -f updated_dbscripts/20251107_vendor_and_transactions.sql
```

### Fresh Installation

For new installations, use the main schema file instead:

```bash
psql $DATABASE_URL -f database_scripts/01_schema.sql
```

The main schema file already includes all tables from this migration.

## Migration Safety

All migrations use:
- `CREATE TABLE IF NOT EXISTS` - Safe to re-run
- `CREATE INDEX IF NOT EXISTS` - Won't create duplicates
- Foreign key constraints - Maintains data integrity

## Rollback

To rollback this migration (⚠️ **This will delete data!**):

```sql
-- Drop tables in reverse order (respecting foreign keys)
DROP TABLE IF EXISTS gatepass_items;
DROP TABLE IF EXISTS gatepasses;
DROP TABLE IF EXISTS raw_material_issuance_items;
DROP TABLE IF EXISTS raw_material_issuance;
DROP TABLE IF EXISTS vendors;
```

**WARNING:** Rollback will permanently delete all vendor, issuance, and gatepass data!

## Verification

After applying the migration, verify tables were created:

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('vendors', 'raw_material_issuance', 'raw_material_issuance_items', 'gatepasses', 'gatepass_items');

-- Should return 5 rows
```

## Using Drizzle Kit (Recommended for Development)

If using Drizzle ORM in development:

```bash
# Sync schema automatically (preferred method)
npm run db:push

# Force sync if needed
npm run db:push --force
```

Drizzle will automatically create these tables based on `shared/schema.ts`.

## Notes

- All tables use UUID primary keys via `gen_random_uuid()`
- Soft delete support via `record_status` field (1=active, 0=deleted)
- All tables include audit timestamps (`created_at`, `updated_at`)
- Foreign key constraints ensure referential integrity
- Indexes optimized for query performance

## Version Compatibility

- Requires PostgreSQL 13 or higher
- Compatible with KINTO QA v1.1.0+
- Safe to apply on any v1.0.0 database

## Support

For questions or issues, refer to:
- Main schema documentation: `database_scripts/README.md`
- Application documentation: `DEPLOYMENT_GUIDE.md`
