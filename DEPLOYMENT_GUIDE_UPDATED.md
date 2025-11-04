# KINTO QA Management System
## Complete Deployment Guide for On-Premise Installation

**Version:** 2.0.0  
**Date:** November 2025  
**Document Type:** Technical Deployment Guide

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Prerequisites](#prerequisites)
3. [Database Setup](#database-setup)
4. [Application Deployment](#application-deployment)
5. [Configuration](#configuration)
6. [Mobile App Deployment](#mobile-app-deployment)
7. [Security](#security)
8. [Maintenance](#maintenance)
9. [Troubleshooting](#troubleshooting)
10. [Support](#support)

---

## System Overview

KINTO QA Management System is a comprehensive quality assurance and preventive maintenance platform designed for manufacturing environments. The system supports:

- **Quality Checklist Management** - Daily operational checklists with multi-level approvals
- **Preventive Maintenance** - Scheduled maintenance tracking and execution
- **Spare Parts Inventory** - Parts catalog and stock management
- **Purchase Order Management** - Automated PO generation and tracking
- **Inventory Management** - Raw materials and finished goods tracking
- **Role-Based Access Control** - Dynamic role and permission management
- **Mobile Support** - Progressive Web App (PWA) and native mobile apps

### Technology Stack

- **Frontend:** React 18, TypeScript, TailwindCSS, shadcn/ui
- **Backend:** Node.js, Express.js, TypeScript
- **Database:** PostgreSQL 13+
- **Authentication:** Email/Password with session management
- **Mobile:** PWA + Capacitor (iOS/Android)

---

## Prerequisites

### Hardware Requirements

#### Minimum Requirements
- **CPU:** 2 cores
- **RAM:** 4 GB
- **Storage:** 20 GB SSD
- **Network:** 100 Mbps

#### Recommended Requirements
- **CPU:** 4+ cores
- **RAM:** 8+ GB
- **Storage:** 50+ GB SSD
- **Network:** 1 Gbps
- **Backup Storage:** Additional storage for database backups

### Software Requirements

#### Server Operating System
- Ubuntu 20.04 LTS or higher
- CentOS 8+ / RHEL 8+
- Debian 11+
- Windows Server 2019+ (with WSL2)

#### Required Software
- **PostgreSQL:** 13.0 or higher
- **Node.js:** 18.0 or higher
- **npm:** 9.0 or higher
- **Git:** 2.30 or higher

#### Optional Software
- **Nginx:** For reverse proxy
- **PM2:** For process management
- **Docker:** For containerized deployment

---

## Database Setup

### Step 1: Install PostgreSQL

#### Ubuntu/Debian
```bash
# Add PostgreSQL repository
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -

# Install PostgreSQL
sudo apt-get update
sudo apt-get install -y postgresql-15 postgresql-contrib-15

# Start service
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### CentOS/RHEL
```bash
# Install PostgreSQL repository
sudo dnf install -y https://download.postgresql.org/pub/repos/yum/reporpms/EL-8-x86_64/pgdg-redhat-repo-latest.noarch.rpm

# Install PostgreSQL
sudo dnf install -y postgresql15-server postgresql15-contrib

# Initialize database
sudo /usr/pgsql-15/bin/postgresql-15-setup initdb

# Start service
sudo systemctl start postgresql-15
sudo systemctl enable postgresql-15
```

### Step 2: Configure PostgreSQL

#### Create Database and User

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database
CREATE DATABASE kinto_qa;

# Create user with password
CREATE USER kinto_admin WITH PASSWORD 'SecurePassword123!';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE kinto_qa TO kinto_admin;

# Exit psql
\q
```

#### Configure Authentication

Edit `pg_hba.conf`:

```bash
# Find config file
sudo -u postgres psql -c "SHOW hba_file"

# Edit file (usually /var/lib/pgsql/15/data/pg_hba.conf or /etc/postgresql/15/main/pg_hba.conf)
sudo nano /etc/postgresql/15/main/pg_hba.conf
```

Add or modify:
```
# TYPE  DATABASE        USER            ADDRESS                 METHOD
local   kinto_qa        kinto_admin                             md5
host    kinto_qa        kinto_admin     127.0.0.1/32            md5
host    kinto_qa        kinto_admin     ::1/128                 md5
host    kinto_qa        kinto_admin     0.0.0.0/0               md5  # For remote access
```

Edit `postgresql.conf` for remote access:
```bash
sudo nano /etc/postgresql/15/main/postgresql.conf
```

Modify:
```
listen_addresses = '*'  # or specific IP address
port = 5432
max_connections = 100
```

Restart PostgreSQL:
```bash
sudo systemctl restart postgresql
```

### Step 3: Run Database Scripts

#### Option A: Using Provided SQL Scripts

Navigate to the `database_scripts` folder:

```bash
cd database_scripts

# Run schema creation
psql -U kinto_admin -d kinto_qa -f 01_schema.sql

# Insert seed data
psql -U kinto_admin -d kinto_qa -f 02_seed_data.sql

# Create indexes (optional but recommended)
psql -U kinto_admin -d kinto_qa -f 03_indexes.sql
```

#### Option B: Using Drizzle ORM (From Source)

```bash
# Navigate to application directory
cd kinto-qa

# Install dependencies
npm install

# Set database URL
export DATABASE_URL="postgresql://kinto_admin:SecurePassword123!@localhost:5432/kinto_qa"

# Push schema to database
npm run db:push
```

### Step 4: Verify Database Setup

```bash
# Connect to database
psql -U kinto_admin -d kinto_qa

# Check tables
\dt

# Verify default admin user
SELECT username, email, role_id FROM users WHERE username = 'admin';

# Check roles
SELECT * FROM roles WHERE record_status = 1;

# Exit
\q
```

### Default Admin Credentials

After database setup, login with:
- **Username:** admin
- **Password:** Admin@123
- **Email:** admin@kinto.com

⚠️ **IMPORTANT:** Change the default password immediately after first login!

---

## Application Deployment

### Step 1: Install Node.js

#### Ubuntu/Debian
```bash
# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should show v18.x.x
npm --version   # Should show 9.x.x
```

#### CentOS/RHEL
```bash
# Install Node.js 18.x
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Verify installation
node --version
npm --version
```

### Step 2: Clone/Extract Application

#### From Git Repository
```bash
# Clone repository
git clone https://github.com/your-company/kinto-qa.git
cd kinto-qa
```

#### From ZIP Archive
```bash
# Extract ZIP file
unzip kinto-qa-v1.0.0.zip
cd kinto-qa
```

### Step 3: Install Dependencies

```bash
# Install Node.js dependencies
npm install

# This may take 5-10 minutes
```

### Step 4: Configure Environment

Create `.env` file in project root:

```bash
nano .env
```

Add configuration:

```env
# Database Configuration
DATABASE_URL=postgresql://kinto_admin:SecurePassword123!@localhost:5432/kinto_qa
PGHOST=localhost
PGPORT=5432
PGDATABASE=kinto_qa
PGUSER=kinto_admin
PGPASSWORD=SecurePassword123!

# Session Configuration
SESSION_SECRET=change-this-to-random-string-min-32-chars
NODE_ENV=production

# Application Configuration
PORT=5000
HOST=0.0.0.0

# Optional: Email Configuration (for password reset)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@company.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@company.com
```

Generate secure SESSION_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 5: Build Application

```bash
# Build frontend and backend
npm run build

# This creates:
# - dist/public/ (frontend assets)
# - dist/index.js (backend server)
```

### Step 6: Run Application

#### Development Mode (for testing)
```bash
npm run dev
```

#### Production Mode

**Option A: Direct Start**
```bash
npm start
```

**Option B: Using PM2 (Recommended)**

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start application
pm2 start npm --name "kinto-qa" -- start

# Save PM2 configuration
pm2 save

# Set PM2 to start on boot
pm2 startup
# Follow the command shown

# Monitor application
pm2 list
pm2 logs kinto-qa
pm2 monit
```

**Option C: Using systemd**

Create service file:
```bash
sudo nano /etc/systemd/system/kinto-qa.service
```

Add content:
```ini
[Unit]
Description=KINTO QA Management System
After=network.target postgresql.service

[Service]
Type=simple
User=kintoqa
WorkingDirectory=/opt/kinto-qa
Environment="NODE_ENV=production"
EnvironmentFile=/opt/kinto-qa/.env
ExecStart=/usr/bin/node /opt/kinto-qa/dist/index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable kinto-qa
sudo systemctl start kinto-qa
sudo systemctl status kinto-qa
```

### Step 7: Configure Reverse Proxy (Nginx)

Install Nginx:
```bash
sudo apt-get install -y nginx  # Ubuntu/Debian
sudo dnf install -y nginx      # CentOS/RHEL
```

Create Nginx configuration:
```bash
sudo nano /etc/nginx/sites-available/kinto-qa
```

Add content:
```nginx
server {
    listen 80;
    server_name kinto-qa.your-company.com;

    client_max_body_size 100M;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/kinto-qa /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### SSL/TLS Configuration (Recommended)

Install Certbot:
```bash
sudo apt-get install -y certbot python3-certbot-nginx
```

Get SSL certificate:
```bash
sudo certbot --nginx -d kinto-qa.your-company.com
```

Certbot will automatically configure HTTPS and set up auto-renewal.

---

## Configuration

### Application Settings

Edit configuration in `server/config.ts` or via environment variables:

```typescript
export const config = {
  port: process.env.PORT || 5000,
  database: {
    url: process.env.DATABASE_URL
  },
  session: {
    secret: process.env.SESSION_SECRET,
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  },
  upload: {
    maxSize: 10 * 1024 * 1024 // 10MB
  }
};
```

### Firewall Configuration

```bash
# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow PostgreSQL (if remote access needed)
sudo ufw allow 5432/tcp

# Enable firewall
sudo ufw enable
```

---

## Mobile App Deployment

### Progressive Web App (PWA)

The application is automatically available as PWA when accessed via HTTPS.

Users can install by:
1. **Android:** Chrome menu → "Add to Home screen"
2. **iOS:** Safari → Share → "Add to Home Screen"

### Native Mobile Apps

For detailed mobile deployment instructions, see:
- `database_scripts/MOBILE_APK_DEPLOYMENT.md` - Android deployment
- `database_scripts/MOBILE_IPA_DEPLOYMENT.md` - iOS deployment

Quick summary:
- **Android APK:** Use Capacitor to build native Android app
- **iOS IPA:** Use Capacitor + Xcode to build native iOS app
- **Distribution:** Ad-hoc, Enterprise, or App Store

---

## Security

### Best Practices

1. **Change Default Credentials**
   - Change admin password immediately
   - Use strong passwords (min 12 characters)

2. **Use HTTPS**
   - Always use SSL/TLS in production
   - Redirect HTTP to HTTPS

3. **Database Security**
   - Use strong database passwords
   - Restrict database network access
   - Enable SSL for database connections
   - Regular backups

4. **Session Security**
   - Use secure session secret (32+ characters)
   - Set secure cookie flags
   - Implement session timeout

5. **Network Security**
   - Use firewall rules
   - Limit SSH access
   - Use VPN for remote access
   - Regular security updates

### Database Backups

#### Automated Backup Script

Create backup script:
```bash
sudo nano /usr/local/bin/backup-kinto-qa.sh
```

Add content:
```bash
#!/bin/bash
BACKUP_DIR="/backups/kinto-qa"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_NAME="kinto_qa"
DB_USER="kinto_admin"

mkdir -p $BACKUP_DIR
pg_dump -U $DB_USER $DB_NAME | gzip > "$BACKUP_DIR/kinto_qa_$TIMESTAMP.sql.gz"

# Keep only last 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete
```

Make executable:
```bash
sudo chmod +x /usr/local/bin/backup-kinto-qa.sh
```

Add to crontab (daily at 2 AM):
```bash
sudo crontab -e
```

Add line:
```
0 2 * * * /usr/local/bin/backup-kinto-qa.sh
```

#### Manual Backup

```bash
# Backup database
pg_dump -U kinto_admin kinto_qa > kinto_qa_backup.sql

# Backup with compression
pg_dump -U kinto_admin kinto_qa | gzip > kinto_qa_backup.sql.gz

# Restore database
psql -U kinto_admin kinto_qa < kinto_qa_backup.sql

# Or from compressed
gunzip -c kinto_qa_backup.sql.gz | psql -U kinto_admin kinto_qa
```

---

## Maintenance

### Application Updates

```bash
# Stop application
pm2 stop kinto-qa  # or sudo systemctl stop kinto-qa

# Backup database
pg_dump -U kinto_admin kinto_qa > backup_before_update.sql

# Pull latest code
git pull origin main

# Install dependencies
npm install

# Build application
npm run build

# Run migrations (if any)
npm run db:push

# Start application
pm2 start kinto-qa  # or sudo systemctl start kinto-qa
```

### Monitoring

#### PM2 Monitoring
```bash
pm2 list
pm2 logs kinto-qa
pm2 monit
```

#### System Logs
```bash
# Application logs
sudo journalctl -u kinto-qa -f

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-15-main.log
```

### Performance Tuning

#### PostgreSQL
Edit `postgresql.conf`:
```
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 64MB
maintenance_work_mem = 128MB
max_connections = 100
```

#### Node.js
```bash
# Increase memory limit if needed
NODE_OPTIONS="--max-old-space-size=4096" npm start
```

---

## Troubleshooting

### Application Won't Start

**Check logs:**
```bash
pm2 logs kinto-qa
# or
sudo journalctl -u kinto-qa -n 100
```

**Common issues:**
- Port 5000 already in use: Change PORT in .env
- Database connection failed: Check DATABASE_URL
- Missing dependencies: Run `npm install`

### Database Connection Errors

**Test connection:**
```bash
psql -U kinto_admin -d kinto_qa -h localhost
```

**Check PostgreSQL status:**
```bash
sudo systemctl status postgresql
```

**Check logs:**
```bash
sudo tail -f /var/log/postgresql/postgresql-15-main.log
```

### Nginx Errors

**Test configuration:**
```bash
sudo nginx -t
```

**Check logs:**
```bash
sudo tail -f /var/log/nginx/error.log
```

**Restart Nginx:**
```bash
sudo systemctl restart nginx
```

### Performance Issues

**Check system resources:**
```bash
htop
df -h
free -h
```

**Check database performance:**
```sql
-- Slow queries
SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;

-- Database size
SELECT pg_size_pretty(pg_database_size('kinto_qa'));

-- Table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables WHERE schemaname = 'public' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## Support

### Documentation

- User Manual: `docs/User_Manual.pdf`
- API Documentation: `docs/API_Documentation.pdf`
- Mobile App Guide: `public/KINTO_QA_Mobile_App_Guide.pdf`
- Database Scripts: `database_scripts/`

### Technical Support

For technical support:
- Email: support@your-company.com
- Phone: +1-XXX-XXX-XXXX
- Hours: Monday-Friday, 9 AM - 5 PM

### Version Information

- **Application Version:** 2.0.0
- **Database Schema Version:** 1.0.0
- **Last Updated:** November 2025

---

## Appendix

### A. Port Reference

| Service | Port | Protocol |
|---------|------|----------|
| Application | 5000 | HTTP |
| PostgreSQL | 5432 | TCP |
| Nginx (HTTP) | 80 | HTTP |
| Nginx (HTTPS) | 443 | HTTPS |

### B. Directory Structure

```
kinto-qa/
├── client/              # Frontend source code
├── server/              # Backend source code
├── shared/              # Shared types and schemas
├── database_scripts/    # Database SQL scripts
├── public/              # Static files and guides
├── dist/                # Build output
├── .env                 # Environment configuration
└── package.json         # Dependencies
```

### C. Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| DATABASE_URL | PostgreSQL connection string | postgresql://user:pass@host:5432/db |
| SESSION_SECRET | Session encryption key | random-32-char-string |
| PORT | Application port | 5000 |
| NODE_ENV | Environment mode | production |
| SMTP_HOST | Email server | smtp.gmail.com |

---

**End of Deployment Guide**

© 2025 Your Company Name. All rights reserved.
