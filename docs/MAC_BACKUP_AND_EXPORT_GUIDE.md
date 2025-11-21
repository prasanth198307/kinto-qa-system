# Mac Backup & Database Export Guide for KINTO Smart Ops

## Overview
This guide covers backing up your KINTO Smart Ops application and exporting the PostgreSQL database from your development environment on Mac to import into Oracle Linux 9 production.

---

## Table of Contents
1. [Application Backup (Mac)](#application-backup-mac)
2. [Database Export (Mac)](#database-export-mac)
3. [Database Import (Oracle Linux 9)](#database-import-oracle-linux-9)
4. [Transfer Backups to Linux Server](#transfer-backups-to-linux-server)
5. [Verify Data Integrity](#verify-data-integrity)

---

## Application Backup (Mac)

### 1. Backup Application Files

```bash
# Navigate to your application directory
cd /path/to/kinto-smart-ops

# Create backup directory
mkdir -p ~/kinto-backups

# Backup entire application (including node_modules)
tar -czf ~/kinto-backups/kinto-app-full-$(date +%Y%m%d_%H%M%S).tar.gz \
  --exclude=node_modules \
  --exclude=.git \
  --exclude=.env \
  /path/to/kinto-smart-ops

# Backup without node_modules (faster, smaller)
tar -czf ~/kinto-backups/kinto-app-src-only-$(date +%Y%m%d_%H%M%S).tar.gz \
  --exclude=node_modules \
  --exclude=.git \
  --exclude=.env \
  /path/to/kinto-smart-ops
```

### 2. Backup Configuration Files

```bash
# Create separate backup for .env (IMPORTANT!)
tar -czf ~/kinto-backups/kinto-env-$(date +%Y%m%d_%H%M%S).tar.gz \
  -C /path/to/kinto-smart-ops .env

# Or backup just the .env file
cp /path/to/kinto-smart-ops/.env ~/kinto-backups/.env.backup

# Set secure permissions
chmod 600 ~/kinto-backups/.env.backup
chmod 600 ~/kinto-backups/*.tar.gz
```

### 3. List Backups

```bash
ls -lh ~/kinto-backups/
```

---

## Database Export (Mac)

### 1. Install PostgreSQL Client (if needed)

```bash
# Using Homebrew
brew install postgresql@15

# Verify installation
psql --version

# Add to PATH if needed
echo 'export PATH="/usr/local/opt/postgresql@15/bin:$PATH"' >> ~/.bash_profile
source ~/.bash_profile
```

### 2. Export Database from Replit or Local PostgreSQL

#### Option A: From Replit (Remote Database)

If your dev database is on Replit:

```bash
# 1. Get DATABASE_URL from Replit .env
grep DATABASE_URL /path/to/kinto-smart-ops/.env

# Expected format: postgresql://user:password@host:port/database

# 2. Extract connection details
# postgresql://kinto_user:password123@pg-xxxxx.neon.tech:5432/kinto_ops

# 3. Export database
pg_dump -h pg-xxxxx.neon.tech \
  -U kinto_user \
  -d kinto_ops \
  -W \
  > ~/kinto-backups/kinto_db_replit_$(date +%Y%m%d_%H%M%S).sql

# (Enter password when prompted)

# Or compressed dump
pg_dump -h pg-xxxxx.neon.tech \
  -U kinto_user \
  -d kinto_ops \
  -W \
  | gzip > ~/kinto-backups/kinto_db_replit_$(date +%Y%m%d_%H%M%S).sql.gz
```

#### Option B: Full Dump Format (Recommended for Restore)

```bash
# Custom format (more efficient, allows selective restore)
pg_dump -h pg-xxxxx.neon.tech \
  -U kinto_user \
  -d kinto_ops \
  -Fc \
  -W \
  > ~/kinto-backups/kinto_db_replit_$(date +%Y%m%d_%H%M%S).dump

# Verify dump file
file ~/kinto-backups/kinto_db_replit_*.dump
```

#### Option C: From Local PostgreSQL (if running locally)

```bash
# If PostgreSQL runs on localhost:5432
pg_dump -U postgres -d kinto_ops > ~/kinto-backups/kinto_db_local_$(date +%Y%m%d_%H%M%S).sql

# Or compressed
pg_dump -U postgres -d kinto_ops | gzip > ~/kinto-backups/kinto_db_local_$(date +%Y%m%d_%H%M%S).sql.gz

# Or custom format
pg_dump -U postgres -d kinto_ops -Fc > ~/kinto-backups/kinto_db_local_$(date +%Y%m%d_%H%M%S).dump
```

### 3. Export with Additional Options

```bash
# Verbose export with detailed information
pg_dump -h host \
  -U username \
  -d kinto_ops \
  -Fc \
  -v \
  -W \
  > ~/kinto-backups/kinto_db_verbose_$(date +%Y%m%d_%H%M%S).dump

# Export with data only (no schema)
pg_dump -h host \
  -U username \
  -d kinto_ops \
  -a \
  > ~/kinto-backups/kinto_db_data_only_$(date +%Y%m%d_%H%M%S).sql

# Export schema only (no data)
pg_dump -h host \
  -U username \
  -d kinto_ops \
  -s \
  > ~/kinto-backups/kinto_db_schema_only_$(date +%Y%m%d_%H%M%S).sql
```

### 4. Verify Export Size

```bash
ls -lh ~/kinto-backups/
du -sh ~/kinto-backups/
```

---

## Database Import (Oracle Linux 9)

### 1. Prepare Oracle Linux Server

```bash
# SSH into your Oracle Linux 9 server
ssh user@your-oracle-linux-server

# Create backup directory
sudo mkdir -p /var/backups/kinto
sudo chown kinto:kinto /var/backups/kinto

# Verify PostgreSQL is running
sudo systemctl status postgresql-15
```

### 2. Transfer Backup Files from Mac

```bash
# From your Mac terminal
cd ~/kinto-backups

# Copy database dump to server
scp kinto_db_replit_20240115_120000.dump user@your-oracle-linux-server:/home/user/

# Copy application backup (optional)
scp kinto-app-src-only-20240115_120000.tar.gz user@your-oracle-linux-server:/home/user/

# Or using rsync (faster for large files)
rsync -avz --progress ~/kinto-backups/ user@your-oracle-linux-server:/home/user/kinto-backups/
```

### 3. Import Database on Oracle Linux

#### Option A: Using Custom Dump Format (.dump)

```bash
# SSH into server
ssh user@your-oracle-linux-server

# Restore database (as root or with sudo)
sudo su - postgres

# Method 1: Restore to existing database (DROP first)
dropdb kinto_ops
createdb kinto_ops
pg_restore -d kinto_ops /home/user/kinto_db_replit_20240115_120000.dump

# Method 2: Restore with verbose output
pg_restore -d kinto_ops -v /home/user/kinto_db_replit_20240115_120000.dump

# Method 3: List contents of dump before restore
pg_restore -l /home/user/kinto_db_replit_20240115_120000.dump | head -20

exit  # Exit postgres user
```

#### Option B: Using SQL Dump (.sql)

```bash
# As postgres user
sudo su - postgres

# Restore from SQL dump
psql -d kinto_ops -f /home/user/kinto_db_replit_20240115_120000.sql

# Or compressed SQL
gunzip -c /home/user/kinto_db_replit_20240115_120000.sql.gz | psql -d kinto_ops

exit
```

### 4. Verify Import

```bash
# Connect as postgres user
sudo su - postgres
psql -d kinto_ops

# Check tables imported
\dt

# Count records in main tables
SELECT 
  'whatsapp_conversation_sessions' as table_name,
  COUNT(*) as row_count 
FROM whatsapp_conversation_sessions

UNION ALL

SELECT 
  'users' as table_name,
  COUNT(*) as row_count 
FROM users;

# Check database size
SELECT pg_size_pretty(pg_database_size('kinto_ops'));

# List all tables
\d

exit  # Exit psql
exit  # Exit postgres user
```

### 5. Restore User Privileges

```bash
# As postgres user
sudo su - postgres
psql

# Grant privileges to application user
GRANT ALL PRIVILEGES ON DATABASE kinto_ops TO kinto_user;
GRANT ALL ON SCHEMA public TO kinto_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO kinto_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO kinto_user;

# Verify
\l  # List databases and owners

exit
exit
```

---

## Transfer Backups to Linux Server

### Method 1: Using SCP (Simple Copy)

```bash
# From Mac
scp ~/kinto-backups/*.dump user@oracle-linux-server:/tmp/

# From Mac, multiple files
scp ~/kinto-backups/kinto_db_*.dump user@oracle-linux-server:/tmp/
scp ~/kinto-backups/kinto-app-*.tar.gz user@oracle-linux-server:/tmp/
```

### Method 2: Using Rsync (Faster for Multiple Files)

```bash
# From Mac
rsync -avz \
  --progress \
  --partial \
  ~/kinto-backups/ \
  user@oracle-linux-server:/tmp/kinto-backups/
```

### Method 3: Using SSH Tunnel with Compression

```bash
# From Mac - single command to export and transfer
pg_dump -h pg-xxxxx.neon.tech \
  -U kinto_user \
  -d kinto_ops \
  -W \
  | gzip \
  | ssh user@oracle-linux-server 'cat > /tmp/kinto_db.sql.gz'
```

### Method 4: Remote Direct Export (No Local Backup)

```bash
# Direct from Replit to Oracle Linux
ssh user@oracle-linux-server 'pg_dump -h pg-xxxxx.neon.tech -U kinto_user -d kinto_ops -W | gunzip > /tmp/kinto_db.sql'
```

---

## Verify Data Integrity

### On Mac (After Export)

```bash
# Check dump file is valid
file ~/kinto-backups/kinto_db_*.dump

# Get file size
du -h ~/kinto-backups/kinto_db_*

# Test restore on local machine (optional)
createdb kinto_test
pg_restore -d kinto_test ~/kinto-backups/kinto_db_*.dump
# If successful, drop test database
dropdb kinto_test
```

### On Oracle Linux (After Import)

```bash
# Connect to imported database
sudo su - postgres
psql -d kinto_ops

# Check row counts match original
SELECT 
  'whatsapp_conversation_sessions' as table_name,
  COUNT(*) as row_count 
FROM whatsapp_conversation_sessions

UNION ALL

SELECT 
  'checklist_templates' as table_name,
  COUNT(*) as row_count 
FROM checklist_templates

UNION ALL

SELECT 
  'machines' as table_name,
  COUNT(*) as row_count 
FROM machines;

# Verify all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

exit
exit
```

### Compare Data

```bash
# Export row counts from both databases for comparison
# From Mac:
pg_dump -h pg-xxxxx.neon.tech -U kinto_user -d kinto_ops --data-only > ~/kinto-backups/data_comparison.sql

# Count specific tables
psql -h pg-xxxxx.neon.tech -U kinto_user -d kinto_ops -c "
SELECT 
  table_name,
  COUNT(*) as row_count
FROM information_schema.tables
WHERE table_schema = 'public'
GROUP BY table_name
ORDER BY table_name;" > ~/kinto-backups/table_counts_mac.txt
```

---

## Complete Backup Workflow Example

### Single Command for Full Backup

```bash
#!/bin/bash
# Save as ~/backup-kinto.sh

BACKUP_DIR="$HOME/kinto-backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

echo "Starting KINTO backup at $TIMESTAMP..."

# Backup application
echo "Backing up application..."
tar -czf $BACKUP_DIR/kinto-app-$TIMESTAMP.tar.gz \
  --exclude=node_modules \
  --exclude=.git \
  --exclude=.env \
  /path/to/kinto-smart-ops

# Backup environment
echo "Backing up environment..."
cp /path/to/kinto-smart-ops/.env $BACKUP_DIR/.env.$TIMESTAMP
chmod 600 $BACKUP_DIR/.env.$TIMESTAMP

# Backup database
echo "Backing up database..."
pg_dump -h pg-xxxxx.neon.tech \
  -U kinto_user \
  -d kinto_ops \
  -Fc \
  -W \
  > $BACKUP_DIR/kinto_db_$TIMESTAMP.dump

echo "✅ Backup complete!"
ls -lh $BACKUP_DIR/

# Calculate total backup size
du -sh $BACKUP_DIR/
```

Usage:
```bash
chmod +x ~/backup-kinto.sh
./backup-kinto.sh
```

---

## Automated Daily Backups (Mac)

### Using Cron

```bash
# Edit crontab
crontab -e

# Add line (daily at 2 AM)
0 2 * * * ~/backup-kinto.sh >> ~/kinto-backups/backup.log 2>&1

# Keep only last 7 days of backups
0 3 * * * find ~/kinto-backups -name "*.dump" -mtime +7 -delete
0 3 * * * find ~/kinto-backups -name "kinto-app-*.tar.gz" -mtime +7 -delete
```

### Using launchd (macOS Native)

```bash
# Create plist file
cat > ~/Library/LaunchAgents/com.kinto.backup.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.kinto.backup</string>
    <key>ProgramArguments</key>
    <array>
        <string>/Users/your-username/backup-kinto.sh</string>
    </array>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>2</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>
</dict>
</plist>
EOF

# Load the job
launchctl load ~/Library/LaunchAgents/com.kinto.backup.plist

# Verify
launchctl list | grep kinto

# Unload if needed
# launchctl unload ~/Library/LaunchAgents/com.kinto.backup.plist
```

---

## Troubleshooting

### PostgreSQL Client Not Found on Mac

```bash
# Install via Homebrew
brew install postgresql@15

# Or add to PATH
export PATH="/usr/local/opt/postgresql@15/bin:$PATH"
echo 'export PATH="/usr/local/opt/postgresql@15/bin:$PATH"' >> ~/.bash_profile
```

### Connection Refused

```bash
# Verify Replit/local PostgreSQL is accessible
telnet pg-xxxxx.neon.tech 5432

# Check firewall
sudo lsof -i :5432

# Verify credentials in DATABASE_URL
grep DATABASE_URL /path/to/kinto-smart-ops/.env
```

### Export Takes Too Long

```bash
# Use custom format (faster)
pg_dump -h host -U user -d db -Fc > backup.dump

# Or export with compression on the fly
pg_dump -h host -U user -d db | gzip > backup.sql.gz

# Export in background with nohup
nohup pg_dump -h host -U user -d db -Fc > backup.dump &
```

### Restore Fails with Permission Error on Linux

```bash
# Make sure user owns the file
sudo chown postgres:postgres /tmp/kinto_db_*.dump

# Verify database exists
sudo su - postgres
psql -l | grep kinto_ops

# Ensure kinto_user has privileges
GRANT ALL PRIVILEGES ON DATABASE kinto_ops TO kinto_user;
```

---

## Security Best Practices

### Protect Backup Files

```bash
# Set secure permissions
chmod 600 ~/kinto-backups/.env.backup
chmod 600 ~/kinto-backups/*.dump
chmod 600 ~/kinto-backups/*.sql

# Encrypt sensitive backups
openssl enc -aes-256-cbc -in backup.dump -out backup.dump.enc

# Store in secure location (encrypted drive)
# Example: ~/Encrypted/kinto-backups/
```

### Store Backups Offsite

```bash
# Upload to cloud storage (AWS S3, Google Drive, etc.)
aws s3 cp ~/kinto-backups/kinto_db_*.dump s3://your-backup-bucket/kinto/

# Or using rsync to another Mac
rsync -avz ~/kinto-backups/ user@backup-server:/backups/kinto/
```

### Backup Retention Policy

```bash
# Keep:
# - Daily backups: 7 days
# - Weekly backups: 4 weeks
# - Monthly backups: 12 months

# Automated cleanup
find ~/kinto-backups -name "*.dump" -mtime +7 -delete
find ~/kinto-backups -name "*.sql.gz" -mtime +7 -delete
```

---

## Summary Checklist

### Before Migration
- [ ] Install PostgreSQL client on Mac (`brew install postgresql@15`)
- [ ] Export database from Replit/local (dump format preferred)
- [ ] Verify dump file size and integrity
- [ ] Backup application source code
- [ ] Backup .env file securely
- [ ] Test restore on local copy (optional)

### Transfer to Oracle Linux
- [ ] Prepare Oracle Linux server (PostgreSQL running)
- [ ] Create database: `createdb kinto_ops`
- [ ] Transfer dump file via scp/rsync
- [ ] Transfer application files (optional)

### After Import
- [ ] Verify all tables exist
- [ ] Compare row counts (Mac vs Linux)
- [ ] Restore user privileges
- [ ] Test application connection to database
- [ ] Run application tests
- [ ] Verify no errors in logs

### Archive & Cleanup
- [ ] Encrypt and store backups securely
- [ ] Document backup locations and access
- [ ] Cleanup temporary files on server
- [ ] Remove .env from recovery media

---

**Document Version:** 1.0  
**Last Updated:** November 2024  
**Platform:** macOS & Oracle Linux 9
