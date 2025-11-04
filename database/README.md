# KINTO QA Database Initialization Scripts

This folder contains SQL scripts to initialize your PostgreSQL database for the KINTO QA Management System.

## Prerequisites

- PostgreSQL 14 or higher
- Database created (e.g., `kinto_qa`)
- Database user with full privileges

## Setup Instructions

### 1. Create Database and User

```bash
sudo -u postgres psql
```

```sql
CREATE DATABASE kinto_qa;
CREATE USER kinto_admin WITH ENCRYPTED PASSWORD 'YourStrongPassword123!';
GRANT ALL PRIVILEGES ON DATABASE kinto_qa TO kinto_admin;
\q
```

### 2. Run Initialization Scripts

Execute the scripts in order:

```bash
# Navigate to the database folder
cd database

# Run all scripts in order
psql -h localhost -U kinto_admin -d kinto_qa -f 01_init_schema.sql
psql -h localhost -U kinto_admin -d kinto_qa -f 02_seed_roles.sql
psql -h localhost -U kinto_admin -d kinto_qa -f 03_seed_admin_user.sql

# Optional: Load sample data
psql -h localhost -U kinto_admin -d kinto_qa -f 04_seed_sample_data.sql
```

### 3. Verify Installation

```bash
psql -h localhost -U kinto_admin -d kinto_qa
```

```sql
-- Check tables
\dt

-- Check roles
SELECT * FROM roles;

-- Check admin user
SELECT u.username, u.email, r.name as role 
FROM users u 
LEFT JOIN roles r ON u.role_id = r.id 
WHERE u.username = 'admin';

\q
```

## Script Details

### 01_init_schema.sql
- Creates all database tables
- Sets up relationships and foreign keys
- Creates performance indexes
- **Safe to run multiple times** (uses IF NOT EXISTS)

### 02_seed_roles.sql
- Inserts 4 default roles:
  - `admin`: Full system access
  - `operator`: Execute checklists and PM tasks
  - `reviewer`: Review and approve checklists
  - `manager`: View reports and approve actions
- **Safe to run multiple times** (uses ON CONFLICT DO NOTHING)

### 03_seed_admin_user.sql
- Creates default admin user:
  - **Username**: `admin`
  - **Password**: `Admin@123`
  - **Email**: `admin@kinto.com`
- ⚠️ **IMPORTANT**: Change the password after first login!

### 04_seed_sample_data.sql
- Optional sample data for testing
- Uncomment sections to insert:
  - Machine types
  - Sample machines
  - Spare parts
  - PM templates
  - Test users

## Default Admin Credentials

```
Username: admin
Password: Admin@123
```

**Security Note**: Change this password immediately after first login!

## Password Hashing

User passwords are hashed using the **scrypt algorithm** with the following format:
```
{hashed_password}.{salt}
```

To create new users, use the admin interface in the application. The system will automatically hash passwords.

## Database Connection String

For your application `.env` file:

```bash
DATABASE_URL=postgresql://kinto_admin:YourStrongPassword123!@localhost:5432/kinto_qa
PGHOST=localhost
PGPORT=5432
PGDATABASE=kinto_qa
PGUSER=kinto_admin
PGPASSWORD=YourStrongPassword123!
```

## Backup and Restore

### Backup

```bash
# Backup entire database
pg_dump -h localhost -U kinto_admin kinto_qa > backup_$(date +%Y%m%d).sql

# Backup with compression
pg_dump -h localhost -U kinto_admin kinto_qa | gzip > backup_$(date +%Y%m%d).sql.gz
```

### Restore

```bash
# Restore from backup
psql -h localhost -U kinto_admin -d kinto_qa < backup_20240101.sql

# Restore from compressed backup
gunzip -c backup_20240101.sql.gz | psql -h localhost -U kinto_admin -d kinto_qa
```

## Troubleshooting

### Permission Denied

```bash
# Grant privileges if needed
sudo -u postgres psql
GRANT ALL PRIVILEGES ON DATABASE kinto_qa TO kinto_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO kinto_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO kinto_admin;
```

### Connection Issues

```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check connection
psql -h localhost -U kinto_admin -d kinto_qa -c "SELECT version();"
```

### Reset Database

```bash
# Drop and recreate (⚠️ destroys all data!)
sudo -u postgres psql
DROP DATABASE IF EXISTS kinto_qa;
CREATE DATABASE kinto_qa;
GRANT ALL PRIVILEGES ON DATABASE kinto_qa TO kinto_admin;
\q

# Then re-run initialization scripts
```

## Production Deployment

1. **Change default passwords** - Update admin password immediately
2. **Use strong database password** - Replace example password
3. **Limit database access** - Configure `pg_hba.conf` appropriately
4. **Enable SSL** - Use encrypted connections in production
5. **Set up backups** - Automate regular database backups
6. **Monitor performance** - Use PostgreSQL monitoring tools

## Support

For issues or questions about the database setup, refer to:
- Project documentation in `/replit.md`
- PostgreSQL documentation: https://www.postgresql.org/docs/
