# KINTO Smart Ops - Production Deployment Guide

Complete guide for deploying KINTO Smart Ops to production with database setup.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Database Setup](#database-setup)
3. [Environment Configuration](#environment-configuration)
4. [Deployment Steps](#deployment-steps)
5. [Post-Deployment](#post-deployment)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software
- **Node.js** 18.x or higher
- **PostgreSQL** 13 or higher (Neon Serverless recommended)
- **npm** or **yarn** package manager

### Required Environment Variables

**IMPORTANT:** Export `DATABASE_URL` to your shell before running database commands:

```bash
# Export for current session
export DATABASE_URL="postgresql://user:password@host:port/database"

# Verify it's set
echo $DATABASE_URL
```

**Complete Environment Variables:**
```bash
# Database Configuration (REQUIRED)
DATABASE_URL=postgresql://user:password@host:port/database

# Session Security (REQUIRED)
SESSION_SECRET=your-secure-random-secret

# WhatsApp Integration (Optional - for checklist notifications)
COLLOKI_FLOW_API_KEY=your-colloki-api-key
WHATSAPP_ACCESS_TOKEN=your-whatsapp-token
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
WHATSAPP_VERIFY_TOKEN=your-verify-token
```

---

## Database Setup

### Method 1: Using Drizzle Migrations + TypeScript Seed Script (Recommended)

This is the modern, maintainable approach using Drizzle ORM.

#### Step 1: Run Migrations

```bash
# Generate migrations from schema (if needed)
npx drizzle-kit generate

# Apply migrations to database
npx drizzle-kit migrate
```

#### Step 2: Seed Reference Data

```bash
# Run TypeScript seed script
npx tsx scripts/db/seed.ts
```

The seed script will create:
- ✅ 4 Roles (Admin, Manager, Operator, Reviewer)
- ✅ Default Admin User (admin / Admin@123)
- ✅ 60+ Role Permissions (Screen-level access control)
- ✅ 8 Units of Measurement (PCS, KG, LTR, MTR, BOX, SET, ROLL, BAG)
- ✅ 5 Machine Types (CNC, Injection Molding, Assembly Line, etc.)
- ✅ 3 Vendor Types (Kinto, HPPani, Purejal)
- ✅ 4 Product Categories (Bottles, Caps, Labels, Packaging)
- ✅ 5 Product Types (500ML, 1LTR, 2LTR, 5LTR, 20LTR)

**Benefits:**
- Idempotent (safe to run multiple times)
- Uses Drizzle ORM (type-safe, maintainable)
- Version controlled (TypeScript code in Git)
- Easy to modify and extend

---

### Method 2: Using SQL Scripts (Legacy/Manual)

If you prefer raw SQL or need to customize the schema:

```bash
# Navigate to database scripts folder
cd database_scripts

# Run scripts in order
psql $DATABASE_URL -f 01_schema.sql
psql $DATABASE_URL -f 02_seed_data.sql
psql $DATABASE_URL -f 03_indexes.sql  # Optional but recommended
```

**Files:**
- `01_schema.sql` - Creates all 27 tables
- `02_seed_data.sql` - Inserts default roles, admin user, and reference data
- `03_indexes.sql` - Creates performance indexes (40+ indexes)

---

## Environment Configuration

### Create .env File

```bash
# Create production environment file
cat > .env.production << EOF
NODE_ENV=production

# Database Configuration
DATABASE_URL=postgresql://user:password@host:port/database

# Session Configuration
SESSION_SECRET=$(openssl rand -base64 32)

# WhatsApp Integration (Optional)
COLLOKI_FLOW_API_KEY=your-api-key
WHATSAPP_ACCESS_TOKEN=your-token
WHATSAPP_PHONE_NUMBER_ID=your-phone-id
WHATSAPP_VERIFY_TOKEN=your-verify-token

# Application Configuration
PORT=5000
EOF
```

### Verify Environment Variables

```bash
# Test database connection
npx tsx -e "import { db } from './server/db.js'; db.select().from({}).limit(1).then(() => console.log('✓ Database connected')).catch(err => console.error('✗ Database error:', err))"
```

---

## Deployment Steps

### 1. Install Dependencies

```bash
npm install --production
```

### 2. Build Application

```bash
npm run build
```

This will:
- Build frontend with Vite → `dist/public`
- Bundle backend with esbuild → `dist/index.js`

### 3. Run Database Setup

**Option A: Drizzle + TypeScript (Recommended)**
```bash
# Run migrations
npx drizzle-kit migrate

# Seed reference data
npx tsx scripts/db/seed.ts
```

**Option B: Raw SQL**
```bash
psql $DATABASE_URL -f database_scripts/01_schema.sql
psql $DATABASE_URL -f database_scripts/02_seed_data.sql
psql $DATABASE_URL -f database_scripts/03_indexes.sql
```

### 4. Start Application

```bash
# Start production server
npm start

# Or with PM2 for process management
pm2 start dist/index.js --name kinto-smart-ops
```

The application will be available at `http://localhost:5000`

---

## Post-Deployment

### 1. Verify Installation

```bash
# Check application is running
curl http://localhost:5000/api/health

# Verify database tables
psql $DATABASE_URL -c "\dt"
```

### 2. Login and Change Admin Password

1. Navigate to `https://your-domain.com/auth`
2. Login with default credentials:
   - Username: `admin`
   - Password: `Admin@123`
3. **IMMEDIATELY change the password** in User Settings

### 3. Remove Test Users (If Legacy SQL Was Used)

⚠️ **CRITICAL FOR PRODUCTION:** If you used the legacy SQL scripts (`database_scripts/03_test_users.sql`), remove test users:

```bash
# Remove all test users
psql $DATABASE_URL -c "DELETE FROM users WHERE username LIKE '%_test';"

# Verify removal
psql $DATABASE_URL -c "SELECT username, email FROM users WHERE record_status = 1;"
```

Test users should NEVER exist in production for security reasons.

### 4. Create Additional Users

Navigate to `/users` in the admin panel and create users for your team:
- **Managers** - Inventory, reporting, approvals
- **Operators** - Production, checklists, PM execution
- **Reviewers** - Quality review and approval

### 5. Configure Master Data

Set up your specific business data:
- **Vendors** - Add your suppliers and customers
- **Products** - Define your product catalog
- **Raw Materials** - Configure material types
- **Machines** - Register your equipment

---

## Troubleshooting

### Database Connection Issues

```bash
# Test connection string
psql $DATABASE_URL -c "SELECT version();"

# Check network connectivity
nc -zv <database-host> <database-port>
```

### Migration Errors

```bash
# Check migration status
npx drizzle-kit studio

# Force push schema (⚠️ Use with caution in production)
npx drizzle-kit push --force
```

### Seed Script Errors

```bash
# Run seed script with verbose logging
DEBUG=* npx tsx scripts/db/seed.ts

# Check if data already exists
psql $DATABASE_URL -c "SELECT * FROM roles;"
psql $DATABASE_URL -c "SELECT * FROM users WHERE username='admin';"
```

### Application Won't Start

```bash
# Check logs
pm2 logs kinto-smart-ops

# Verify build output
ls -la dist/
ls -la dist/public/

# Test backend directly
node dist/index.js
```

---

## Database Backup & Restore

### Backup Production Database

```bash
# Full backup
pg_dump $DATABASE_URL > kinto_backup_$(date +%Y%m%d).sql

# Schema only
pg_dump --schema-only $DATABASE_URL > kinto_schema.sql

# Data only
pg_dump --data-only $DATABASE_URL > kinto_data.sql
```

### Restore Database

```bash
# Restore full backup
psql $DATABASE_URL < kinto_backup_20251122.sql

# Restore to new database
createdb kinto_new
psql postgresql://user:pass@host:port/kinto_new < kinto_backup.sql
```

---

## NPM Scripts Setup

### Recommended NPM Scripts

For easier database management, you can add these scripts to `package.json`:

```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:seed": "tsx scripts/db/seed.ts",
    "db:setup": "npm run db:migrate && npm run db:seed"
  }
}
```

### How to Add Scripts Safely

**Option 1: Using Replit Workflows (Recommended)**
If deploying on Replit:
1. Use the workflow configuration tool to add custom commands
2. Or manually run commands using `npx` (see below)

**Option 2: Direct Commands (No package.json Edit)**
You can always run these commands directly without modifying package.json:

```bash
# Complete database setup
npx drizzle-kit migrate && npx tsx scripts/db/seed.ts

# Re-run seed data only
npx tsx scripts/db/seed.ts

# Run migrations only
npx drizzle-kit migrate

# Generate new migration
npx drizzle-kit generate
```

**Option 3: Create Shell Aliases**
Add to your `~/.bashrc` or `~/.zshrc`:

```bash
alias db:setup='npx drizzle-kit migrate && npx tsx scripts/db/seed.ts'
alias db:seed='npx tsx scripts/db/seed.ts'
alias db:migrate='npx drizzle-kit migrate'
```

Then use:
```bash
db:setup    # Complete database initialization
db:seed     # Re-run seed data only
db:migrate  # Run migrations only
```

---

## Security Checklist

Before going live:

- [ ] Change default admin password
- [ ] Set strong `SESSION_SECRET` (32+ random characters)
- [ ] Enable HTTPS/TLS for production
- [ ] Configure firewall rules (allow only port 443/80)
- [ ] Set up database connection pooling
- [ ] Enable database backups (daily recommended)
- [ ] Configure CORS for your domain
- [ ] Remove test users (if `03_test_users.sql` was run)
- [ ] Set up monitoring and logging
- [ ] Configure rate limiting

---

## Production Data Fixes

### 🎯 Complete Production Fix (RECOMMENDED)

**File:** `production-complete-fix.sql`  
**Purpose:** Fix ALL data integrity issues in one comprehensive script  
**Impact:** Ensures Sales Dashboard = Vendor Analytics = ₹1,13,59,999.78 (perfect match)

```bash
# For OCI production database
ssh user@your-oci-instance
cd /path/to/kinto-smart-ops
git pull  # Get latest code including SQL scripts
psql $DATABASE_URL -f production-complete-fix.sql
```

```bash
# For Mac production database (localhost:5050)
psql your_production_database_url -f production-complete-fix.sql
```

#### What This Script Fixes:

**1. Buyer Name Mismatches (₹3L discrepancy)**
- Updates 8 invoices to match vendor master records exactly
- **Result:** Sales Dashboard and Vendor Analytics show matching totals

**2. Primary Vendor Type Assignments (₹8L double-counting bug)**
- Sets `is_primary = 1` for each vendor's first vendor type
- **Result:** Vendor type breakdown no longer double-counts revenue
- **Before:** Breakdown sum = ₹1,21,35,385 (inflated)
- **After:** Breakdown sum = ₹1,13,59,999 (accurate)

**3. Missing Vendor Type Assignment (₹3L uncategorized revenue)**
- Assigns "Kinto" type to "Sri Kanthamma Talli Agencies"
- **Result:** All revenue included in vendor type breakdown

**4. Duplicate Prevention (unique constraint)**
- Removes existing duplicate vendor type assignments
- Adds unique constraint to prevent future duplicates
- **Result:** No more "Kinto Kinto" badge issues

#### Expected Results After Running Script:

✅ **Sales Dashboard Total:** ₹1,13,59,999.78  
✅ **Vendor Analytics Total:** ₹1,13,59,999.78  
✅ **Vendor Type Breakdown Sum:** ₹1,13,59,999.78  
✅ **Difference:** ₹0.00 (perfect match!)

**Breakdown by Type:**
- Kinto: ₹95,50,265.78
- HPPani: ₹10,17,929.80
- Purejal: ₹7,91,804.20
- **Total:** ₹1,13,59,999.78 ✅

#### Safety Features:

- ✅ Uses transaction (BEGIN...COMMIT) - auto-rollback on errors
- ✅ Idempotent - safe to run multiple times
- ✅ Includes verification queries
- ✅ Checks for existing constraints before adding

---

### 🔧 Individual Fix Scripts (Legacy)

If you prefer to run fixes separately, these individual scripts are also available:

#### 1. Buyer Name Fix Only
**File:** `production-buyer-name-fix.sql`  
```bash
psql $DATABASE_URL -f production-buyer-name-fix.sql
```

#### 2. Unique Constraint Fix Only
**File:** `mac-production-fix.sql`  
```bash
psql $DATABASE_URL -f mac-production-fix.sql
```

**Note:** The comprehensive script (`production-complete-fix.sql`) is recommended as it includes all fixes plus additional improvements.

---

### Verification Queries

After running the complete fix script, verify all fixes worked:

```sql
-- 1. Verify buyer name fix (should show 339 invoices matched)
SELECT 
  COUNT(*) as matched_invoices,
  SUM(total_amount)/100 as total_sales
FROM invoices i
INNER JOIN vendors v ON i.buyer_name = v.vendor_name
WHERE i.record_status = 1 AND v.record_status = 1;
-- Expected: 339 invoices, ₹1,13,59,999.78

-- 2. Verify vendor type breakdown matches total revenue
WITH vendor_revenue AS (
  SELECT 
    v.id,
    COALESCE(SUM(i.total_amount), 0) as total_revenue
  FROM vendors v
  LEFT JOIN invoices i ON i.buyer_name = v.vendor_name AND i.record_status = 1
  WHERE v.record_status = 1
  GROUP BY v.id
),
type_breakdown AS (
  SELECT 
    vt.name as vendor_type,
    SUM(vr.total_revenue) as type_revenue
  FROM vendor_revenue vr
  INNER JOIN vendor_vendor_types vvt ON vr.id = vvt.vendor_id
  INNER JOIN vendor_types vt ON vvt.vendor_type_id = vt.id
  WHERE vvt.is_primary = 1 AND vvt.record_status = 1
  GROUP BY vt.name
)
SELECT vendor_type, type_revenue / 100.0 as revenue_rupees
FROM type_breakdown
UNION ALL
SELECT 'TOTAL', SUM(type_revenue) / 100.0
FROM type_breakdown;
-- Expected: Total = ₹1,13,59,999.78

-- 3. Verify no uncategorized vendors with revenue
SELECT COUNT(*) as uncategorized_vendors
FROM (
  SELECT v.id, COALESCE(SUM(i.total_amount), 0) as total_revenue
  FROM vendors v
  LEFT JOIN invoices i ON i.buyer_name = v.vendor_name AND i.record_status = 1
  WHERE v.record_status = 1
  GROUP BY v.id
) vr
LEFT JOIN vendor_vendor_types vvt ON vr.id = vvt.vendor_id AND vvt.record_status = 1
WHERE vvt.vendor_id IS NULL AND vr.total_revenue > 0;
-- Expected: 0
```

---

### Replit Production Database Notes

When published to Replit, database **schema** changes are automatically applied. However, **data fixes** (like buyer name updates) must be applied manually:

1. Navigate to Database pane in Replit
2. Select "Production Database"
3. Select "My data"
4. Toggle "Edit" mode
5. Copy and run the SQL from `production-complete-fix.sql` manually (in sections if needed)

**Important:** Agent cannot modify production databases directly for safety reasons.

---

## Support

For issues or questions:
- Check existing database scripts in `database_scripts/`
- Review seed script source: `scripts/db/seed.ts`
- Examine Drizzle schema: `shared/schema.ts`
- Check migration files: `migrations/`
- Review production fix scripts: `production-buyer-name-fix.sql`, `mac-production-fix.sql`

---

**Last Updated:** November 24, 2025  
**Version:** 1.1.0
