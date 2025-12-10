#!/bin/bash
# PostgreSQL Backup Script for KINTO Operations
# Run via cron: 0 */6 * * * /path/to/backup-database.sh >> /var/log/kinto-backup.log 2>&1

# Configuration
DB_NAME="kinto_qa_db"
DB_USER="kinto_user"
DB_HOST="localhost"
DB_PORT="5432"
BACKUP_DIR="/var/backup/postgres"
DATE=$(date +%Y-%m-%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/kinto_backup_${DATE}.sql"
RETENTION_DAYS=30

# Create backup directory if it doesn't exist
mkdir -p ${BACKUP_DIR}

echo "[$(date)] Starting backup..."

# Create backup using pg_dump
# Uses ~/.pgpass for password authentication
pg_dump -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} --no-owner --no-acl > ${BACKUP_FILE}

if [ $? -ne 0 ]; then
  echo "[$(date)] ERROR: pg_dump failed"
  exit 1
fi

# Compress backup
gzip ${BACKUP_FILE}

# Remove backups older than retention period
find ${BACKUP_DIR} -name "kinto_backup_*.sql.gz" -mtime +${RETENTION_DAYS} -delete

echo "[$(date)] Backup completed: ${BACKUP_FILE}.gz"
echo "[$(date)] Removed backups older than ${RETENTION_DAYS} days"
