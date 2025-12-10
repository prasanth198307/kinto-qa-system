#!/bin/bash
# PostgreSQL Backup Script for KINTO Operations
# Run via cron: 0 2 * * * /path/to/backup-database.sh

# Configuration
BACKUP_DIR="/var/backups/kinto-postgres"
DATE=$(date +%Y-%m-%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/kinto_backup_${DATE}.sql"
RETENTION_DAYS=30

# Create backup directory if it doesn't exist
mkdir -p ${BACKUP_DIR}

# Create backup using pg_dump
# Uses environment variables: PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE
pg_dump --no-owner --no-acl > ${BACKUP_FILE}

# Compress backup
gzip ${BACKUP_FILE}

# Remove backups older than retention period
find ${BACKUP_DIR} -name "kinto_backup_*.sql.gz" -mtime +${RETENTION_DAYS} -delete

echo "Backup completed: ${BACKUP_FILE}.gz"
echo "Removed backups older than ${RETENTION_DAYS} days"
