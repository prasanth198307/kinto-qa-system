#!/bin/bash
# PostgreSQL Backup Script for KINTO Operations - OCI Cluster
# Backs up to OCI Object Storage
# 
# Cron setup: crontab -e
# 0 2 * * * /home/opc/kinto/db_scripts/backup-database-oci.sh >> /var/log/kinto-backup.log 2>&1

# ========== Configuration ==========
DB_NAME="${PGDATABASE:-kinto_qa_db}"
DB_USER="${PGUSER:-kinto_admin}"
DB_HOST="${PGHOST:-localhost}"
DB_PORT="${PGPORT:-5432}"
BACKUP_DIR="/var/backup/postgres"
BUCKET_NAME="kinto-db-backups"  # Change to your OCI bucket name
COMPARTMENT_ID="<your-compartment-ocid>"  # Change to your compartment OCID
DATE=$(date +%Y-%m-%d_%H%M%S)
BACKUP_FILE="${DB_NAME}_${DATE}.sql"
RETENTION_DAYS=30

# ========== Create Directories ==========
mkdir -p ${BACKUP_DIR}
echo "[$(date)] Starting backup..."

# ========== Create Backup ==========
PGPASSWORD="${PGPASSWORD}" pg_dump \
  -h ${DB_HOST} \
  -p ${DB_PORT} \
  -U ${DB_USER} \
  -d ${DB_NAME} \
  --no-owner \
  --no-acl \
  > ${BACKUP_DIR}/${BACKUP_FILE}

if [ $? -ne 0 ]; then
  echo "[$(date)] ERROR: pg_dump failed"
  exit 1
fi

# ========== Compress Backup ==========
gzip ${BACKUP_DIR}/${BACKUP_FILE}
COMPRESSED_FILE="${BACKUP_FILE}.gz"
echo "[$(date)] Backup created: ${COMPRESSED_FILE}"

# ========== Upload to OCI Object Storage ==========
# Uses instance principal authentication (no API keys needed)
oci os object put \
  --bucket-name ${BUCKET_NAME} \
  --file ${BACKUP_DIR}/${COMPRESSED_FILE} \
  --name "backups/${COMPRESSED_FILE}" \
  --auth instance_principal

if [ $? -eq 0 ]; then
  echo "[$(date)] Uploaded to OCI Object Storage: ${BUCKET_NAME}/backups/${COMPRESSED_FILE}"
else
  echo "[$(date)] WARNING: Failed to upload to OCI Object Storage"
fi

# ========== Cleanup Local Backups ==========
find ${BACKUP_DIR} -name "*.sql.gz" -mtime +${RETENTION_DAYS} -delete
echo "[$(date)] Removed local backups older than ${RETENTION_DAYS} days"

# ========== Cleanup Old OCI Backups (optional) ==========
# Uncomment to auto-delete old cloud backups
# oci os object list \
#   --bucket-name ${BUCKET_NAME} \
#   --prefix "backups/" \
#   --auth instance_principal \
#   --query "data[?\"time-created\"<'$(date -d "-${RETENTION_DAYS} days" -Iseconds)'].name" \
#   --raw-output | \
#   xargs -I {} oci os object delete --bucket-name ${BUCKET_NAME} --object-name {} --force --auth instance_principal

echo "[$(date)] Backup completed successfully"
