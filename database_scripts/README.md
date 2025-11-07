# KINTO QA Database Scripts

This folder contains all necessary SQL scripts for on-premise deployment of the KINTO QA Management System.

## Prerequisites

- PostgreSQL 13 or higher
- Database user with CREATE, INSERT, UPDATE, DELETE privileges
- Network access to the PostgreSQL server

## Installation Order

Execute the scripts in the following order:

1. **01_schema.sql** - Creates all database tables and schema (includes vendor master, raw material issuance, and gatepasses)
2. **02_seed_data.sql** - Inserts default roles and admin user
3. **03_indexes.sql** - Creates performance indexes (optional but recommended)

## Latest Updates (v1.1.0 - Nov 2025)

The schema now includes:
- **Vendor Master** - Complete vendor/customer management with address, GST, Aadhaar, mobile
- **Raw Material Issuance** - Multi-item transaction system (header-detail pattern)
- **Gatepasses** - Finished goods dispatch with vendor integration (header-detail pattern)

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

## Default Admin Credentials

After running the seed data script, you can log in with:

- **Username:** admin
- **Password:** Admin@123
- **Email:** admin@kinto.com
- **Role:** Administrator

**IMPORTANT:** Change the default admin password immediately after first login!

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
