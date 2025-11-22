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
```bash
DATABASE_URL=postgresql://user:password@host:port/database
SESSION_SECRET=your-secure-random-secret
COLLOKI_FLOW_API_KEY=your-colloki-api-key (if using WhatsApp features)
WHATSAPP_ACCESS_TOKEN=your-whatsapp-token (optional)
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id (optional)
WHATSAPP_VERIFY_TOKEN=your-verify-token (optional)
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

### 3. Create Additional Users

Navigate to `/users` in the admin panel and create users for your team:
- **Managers** - Inventory, reporting, approvals
- **Operators** - Production, checklists, PM execution
- **Reviewers** - Quality review and approval

### 4. Configure Master Data

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

## NPM Scripts (Manual Addition Required)

Add these scripts to `package.json` for easier database management:

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

Then you can use:
```bash
npm run db:setup    # Complete database initialization
npm run db:seed     # Re-run seed data only
npm run db:migrate  # Run migrations only
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

## Support

For issues or questions:
- Check existing database scripts in `database_scripts/`
- Review seed script source: `scripts/db/seed.ts`
- Examine Drizzle schema: `shared/schema.ts`
- Check migration files: `migrations/`

---

**Last Updated:** November 22, 2025  
**Version:** 1.0.0
