# Database Migration Scripts

## Overview
This folder contains incremental migration scripts for updating existing KINTO QA databases.

## Migration Files

### 20251107_fix_schema_issues.sql ⚠️ **CRITICAL - RUN FIRST**
**Date:** November 7, 2025  
**Purpose:** Fixes critical schema inconsistencies between code and database

**Changes:**
1. Adds `mobile_number` column to `users` table (REQUIRED for notifications)
2. Fixes `banks` table schema:
   - Adds missing columns: `account_holder_name`, `branch_name`, `account_type`, `updated_at`
   - Renames `recordstatus` to `record_status` (standardization)

**Why Critical:**
- Without mobile_number: User creation fails, notifications broken
- Without banks fix: Payment features will crash at runtime
- Must run BEFORE using inventory or payment features

### 20251107_critical_seed_data.sql ⚠️ **CRITICAL - RUN SECOND**
**Date:** November 7, 2025  
**Purpose:** Seeds essential master data required for application to function

**Data Inserted:**
1. **UOM (Unit of Measurement)** - 20 standard units (PCS, KG, LTR, MTR, etc.)
   - **BLOCKS ALL INVENTORY if missing**
2. **Default Bank Account** (optional, commented out - customize with real data)

**Why Critical:**
- Empty UOM table → Cannot create raw materials, finished goods, or any transactions
- Without UOM: Inventory, issuance, gatepasses, invoices ALL fail

### 20251108_093500_image_columns_to_text.sql
**Date:** November 8, 2025  
**Purpose:** Support base64-encoded images across all tables (users, tasks, invoices)

**Changes:**
1. `users.profile_image_url`: varchar → text (profile pictures)
2. `submission_tasks.photo_url`: varchar(500) → text (QA checklist photos)
3. `pm_execution_tasks.photo_url`: varchar(500) → text (PM task photos)
4. `invoice_templates.logo_url`: varchar(500) → text (company logos)

**Why Needed:**
- Base64 encoded images are typically 13,000-650,000 characters
- varchar(500) was too small, causing insert/update failures
- text type supports unlimited length, optimized for large strings

**Affected Features:**
- User profile pictures (base64 upload)
- QA checklist task photos (camera capture)
- PM execution task photos (maintenance documentation)
- Invoice template company logos (branding)

**Safety:**
- Non-breaking changes (varchar → text is always safe)
- No data loss occurs during conversion
- All existing data preserved
- Compatible with all PostgreSQL versions
- No application code changes required

### 20251107_020000_notification_config.sql ⚠️ **IMPORTANT - RUN THIRD**
**Date:** November 7, 2025  
**Purpose:** Creates centralized notification configuration for SendGrid (Email) and Twilio (WhatsApp)

**Tables Added:**
1. `notification_config` - Centralized settings for email and WhatsApp notifications

**Features:**
- Email notifications via SendGrid
- WhatsApp notifications via Twilio
- Test mode for safe development (console logging only)
- Production mode for real notifications
- Enable/disable channels independently

**Default Configuration:**
- Test mode: Enabled (safe for testing)
- Email: Enabled
- WhatsApp: Enabled
- Sender: qa@kinto.com / KINTO QA

**Environment Variables Required (Production):**
- `SENDGRID_API_KEY` - For email notifications
- `TWILIO_ACCOUNT_SID` - For WhatsApp
- `TWILIO_AUTH_TOKEN` - For WhatsApp

**Why Important:**
- Required for Machine Startup Reminders
- Required for Missed Checklist Notifications
- Without this table: Notification features will fail

### 20251107_invoicing_and_payments.sql
**Date:** November 7, 2025  
**Purpose:** Adds GST-compliant invoicing, payment tracking, bank management, and checklist assignments

**Tables Added:**
1. `invoices` - GST-compliant sales invoices with comprehensive tax details
2. `invoice_items` - Invoice line items with detailed tax breakup (CGST, SGST, IGST, Cess)
3. `invoice_payments` - Payment tracking with FIFO allocation for partial payments
4. `banks` - Bank account master for managing multiple company accounts
5. `checklist_assignments` - Manager assigns checklists to operators

**Features:**
- GST-compliant invoice generation with tax breakup
- Payment tracking with multiple methods (Cash, Cheque, NEFT, UPI)
- FIFO payment allocation across invoices
- Pending payments dashboard
- Bank account management with default selection
- Manager-to-operator checklist assignment workflow
- Printable invoice formats (Vyapaar-style)
- Sales analytics support

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

### 20251107_040000_add_mobile_number.sql
**Date:** November 7, 2025  
**Purpose:** Adds mandatory mobile number field to users table

**Changes:**
- Adds `mobile_number` column to `users` table
- Updates existing users with placeholder numbers
- Sets column to NOT NULL

**Features:**
- Mobile number validation (10 digits)
- Support for WhatsApp and SMS notifications
- User contact management

### 20251107_machine_startup_reminders.sql
**Date:** November 7, 2025  
**Purpose:** Machine startup reminder system with WhatsApp/Email notifications

**Tables Added:**
1. `machine_startup_tasks` - Tracks machine startup assignments and reminders

**Features:**
- Managers assign machine startup tasks to operators
- Configurable warmup times per machine
- WhatsApp and Email reminders before scheduled production
- Bulk assignment support
- Task status tracking (pending → notified → completed → cancelled)
- Automated multi-channel notifications via Twilio/SendGrid

**Dependencies:**
- Requires `notification_config` table (run 20251107_020000_notification_config.sql first)

### 20251107_missed_checklist_notifications.sql
**Date:** November 7, 2025  
**Purpose:** Automatic notifications when checklists pass due date

**Changes to Existing Tables:**
1. Adds columns to `checklist_assignments`:
   - `due_date_time` - Deadline for checklist completion
   - `missed_notification_sent` - Flag to prevent duplicate notifications
   - `missed_notification_sent_at` - Timestamp of notification

**Features:**
- Automatic detection of missed checklists (runs every 5 minutes)
- Multi-recipient notifications (operator, reviewer, manager, all admins)
- WhatsApp alerts via Twilio
- Test mode for safe development
- Manual trigger endpoint for testing: `/api/cron/missed-checklists`

**Dependencies:**
- Requires `notification_config` table (run 20251107_020000_notification_config.sql first)
- Requires `checklist_assignments` table from invoicing script

### 20251106_163500_production_management.sql
**Date:** November 6, 2025  
**Purpose:** Raw material issuance and gatepass management (legacy - superseded by 20251107_vendor_and_transactions.sql)

**Note:** This is an older version. Use `20251107_vendor_and_transactions.sql` instead for the latest schema.

## How to Apply Migrations

### For Existing Databases

⚠️ **CRITICAL:** Apply migrations in this EXACT order:

```bash
# Step 1: Fix schema issues (REQUIRED FIRST)
psql $DATABASE_URL -f updated_dbscripts/20251107_fix_schema_issues.sql

# Step 2: Seed critical master data (REQUIRED SECOND)
psql $DATABASE_URL -f updated_dbscripts/20251107_critical_seed_data.sql

# Step 3: Add notification configuration (REQUIRED BEFORE STEPS 6 & 7)
psql $DATABASE_URL -f updated_dbscripts/20251107_020000_notification_config.sql

# Step 4: Add transaction tables
psql $DATABASE_URL -f updated_dbscripts/20251107_vendor_and_transactions.sql

# Step 5: Add invoicing and payment tables
psql $DATABASE_URL -f updated_dbscripts/20251107_invoicing_and_payments.sql

# Step 6: Add machine startup reminders (optional - requires Step 3)
psql $DATABASE_URL -f updated_dbscripts/20251107_machine_startup_reminders.sql

# Step 7: Add missed checklist notifications (optional - requires Steps 3 & 5)
psql $DATABASE_URL -f updated_dbscripts/20251107_missed_checklist_notifications.sql

# Step 8: Enable base64 image support across all tables (recommended - if using image uploads)
psql $DATABASE_URL -f updated_dbscripts/20251108_093500_image_columns_to_text.sql

# Step 9: Add missing tables for complete schema sync (IMPORTANT - adds 9 missing tables)
psql $DATABASE_URL -f updated_dbscripts/20251108_094000_complete_schema_sync.sql
```

**Or with explicit connection:**
```bash
psql -U postgres -d kinto_qa -f updated_dbscripts/20251107_fix_schema_issues.sql
psql -U postgres -d kinto_qa -f updated_dbscripts/20251107_critical_seed_data.sql
psql -U postgres -d kinto_qa -f updated_dbscripts/20251107_020000_notification_config.sql
psql -U postgres -d kinto_qa -f updated_dbscripts/20251107_vendor_and_transactions.sql
psql -U postgres -d kinto_qa -f updated_dbscripts/20251107_invoicing_and_payments.sql
psql -U postgres -d kinto_qa -f updated_dbscripts/20251107_machine_startup_reminders.sql
psql -U postgres -d kinto_qa -f updated_dbscripts/20251107_missed_checklist_notifications.sql
psql -U postgres -d kinto_qa -f updated_dbscripts/20251108_093500_image_columns_to_text.sql
psql -U postgres -d kinto_qa -f updated_dbscripts/20251108_094000_complete_schema_sync.sql
```

**⚠️ IMPORTANT:** 
- Apply in chronological order to ensure dependencies are met
- Steps 1, 2, and 3 are CRITICAL for core functionality
- Steps 4 & 5 required for inventory, invoicing, and payment features
- Steps 6 & 7 are OPTIONAL - only needed if using notification features
- After Step 2, edit the bank details in the script before running if needed

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

After applying all migrations, verify all tables were created:

```sql
-- Check if all core tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'vendors', 
    'raw_material_issuance', 
    'raw_material_issuance_items', 
    'gatepasses', 
    'gatepass_items',
    'invoices',
    'invoice_items',
    'invoice_payments',
    'banks',
    'checklist_assignments',
    'notification_config',
    'machine_startup_tasks'
  )
ORDER BY table_name;

-- Should return 12 rows

-- Count total tables in the database
SELECT COUNT(*) as total_tables
FROM information_schema.tables 
WHERE table_schema = 'public';

-- Should return 39 tables for complete KINTO QA system (with all optional features)
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
