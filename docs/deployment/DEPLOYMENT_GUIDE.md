# KINTO QA Management System - Deployment Guide

## Table of Contents
1. [System Requirements](#system-requirements)
2. [Pre-Installation Checklist](#pre-installation-checklist)
3. [Database Setup](#database-setup)
4. [Application Installation](#application-installation)
5. [Environment Configuration](#environment-configuration)
6. [Building for Production](#building-for-production)
7. [Deployment Options](#deployment-options)
8. [Post-Deployment Configuration](#post-deployment-configuration)
9. [Security Hardening](#security-hardening)
10. [Troubleshooting](#troubleshooting)

---

## System Requirements

### Minimum Hardware Requirements
- **CPU**: 2 cores (4 cores recommended)
- **RAM**: 4 GB (8 GB recommended)
- **Storage**: 20 GB available space (SSD recommended)
- **Network**: 100 Mbps connection

### Software Requirements
- **Operating System**: Linux (Ubuntu 20.04+ / CentOS 8+ / RHEL 8+), Windows Server 2019+, or macOS 10.15+
- **Node.js**: Version 20.x or later
- **PostgreSQL**: Version 14.x or later
- **npm**: Version 10.x or later
- **Git**: Latest version

### Browser Requirements (Client Side)
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers: Chrome Mobile, Safari Mobile

---

## Pre-Installation Checklist

Before starting the installation, ensure you have:

- [ ] Root or sudo access to the server
- [ ] PostgreSQL database server installed and running
- [ ] Node.js and npm installed
- [ ] SSL certificate (for HTTPS - recommended for production)
- [ ] Static IP address or domain name configured
- [ ] Firewall rules configured (ports 80/443 for web, 5432 for PostgreSQL)
- [ ] Backup system in place

---

## Database Setup

### 1. Install PostgreSQL

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### CentOS/RHEL
```bash
sudo dnf install postgresql-server postgresql-contrib
sudo postgresql-setup --initdb
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 2. Create Database and User

```bash
# Switch to postgres user
sudo -u postgres psql

# In PostgreSQL prompt:
CREATE DATABASE kinto_qa;
CREATE USER kinto_admin WITH ENCRYPTED PASSWORD 'YourSecurePassword123!';
GRANT ALL PRIVILEGES ON DATABASE kinto_qa TO kinto_admin;
ALTER DATABASE kinto_qa OWNER TO kinto_admin;
\q
```

### 3. Configure PostgreSQL for Remote Access (if needed)

Edit PostgreSQL configuration:
```bash
sudo nano /etc/postgresql/14/main/postgresql.conf
```

Add/modify:
```
listen_addresses = '*'  # or specific IP
```

Edit pg_hba.conf:
```bash
sudo nano /etc/postgresql/14/main/pg_hba.conf
```

Add:
```
# IPv4 local connections:
host    kinto_qa    kinto_admin    0.0.0.0/0    scram-sha-256
```

Restart PostgreSQL:
```bash
sudo systemctl restart postgresql
```

### 4. Import Database Schema

```bash
# Download the schema file
wget https://your-server.com/database_schema.sql

# Import schema
psql -U kinto_admin -d kinto_qa -f database_schema.sql
```

Or use the provided SQL file directly:
```bash
psql -U kinto_admin -d kinto_qa < database_schema.sql
```

---

## Application Installation

### 1. Clone or Copy Application Files

```bash
# Create application directory
sudo mkdir -p /opt/kinto-qa
cd /opt/kinto-qa

# If using Git:
git clone https://github.com/your-org/kinto-qa.git .

# Or copy files manually
# scp -r ./kinto-qa/* user@server:/opt/kinto-qa/
```

### 2. Install Dependencies

```bash
cd /opt/kinto-qa
npm install
```

### 3. Create System User (Linux/Production)

```bash
# Create dedicated user for running the application
sudo useradd -r -s /bin/false kinto
sudo chown -R kinto:kinto /opt/kinto-qa
```

---

## Environment Configuration

### 1. Create Environment File

```bash
cd /opt/kinto-qa
cp .env.example .env
nano .env
```

### 2. Configure Environment Variables

```env
# Database Configuration
DATABASE_URL=postgresql://kinto_admin:YourSecurePassword123!@localhost:5432/kinto_qa
PGDATABASE=kinto_qa
PGHOST=localhost
PGPORT=5432
PGUSER=kinto_admin
PGPASSWORD=YourSecurePassword123!

# Session Configuration
SESSION_SECRET=generate-a-very-long-random-string-here-min-32-chars
NODE_ENV=production

# Server Configuration
PORT=5000
HOST=0.0.0.0

# Optional: Email Configuration (for password reset)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@example.com
# SMTP_PASSWORD=your-email-password
# SMTP_FROM=noreply@kinto.com
```

### 3. Generate Secure SESSION_SECRET

```bash
# Generate random 64-character string
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and use it as SESSION_SECRET in .env file.

---

## Building for Production

### 1. Build the Application

```bash
cd /opt/kinto-qa
npm run build
```

This will:
- Bundle the frontend assets to `dist/public`
- Bundle the backend code to `dist/index.js`
- Optimize all code for production

### 2. Verify Build

```bash
ls -la dist/
# Should show: index.js and public/ directory
```

---

## Deployment Options

### Option 1: Using PM2 Process Manager (Recommended)

#### 1. Install PM2
```bash
sudo npm install -g pm2
```

#### 2. Create PM2 Ecosystem File

```bash
nano ecosystem.config.js
```

Add:
```javascript
module.exports = {
  apps: [{
    name: 'kinto-qa',
    script: 'dist/index.js',
    instances: 2,  // or 'max' for all CPU cores
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true
  }]
};
```

#### 3. Start Application with PM2

```bash
# Create logs directory
mkdir -p logs

# Start application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup
# Follow the instructions displayed
```

#### 4. PM2 Management Commands

```bash
# View status
pm2 status

# View logs
pm2 logs kinto-qa

# Restart application
pm2 restart kinto-qa

# Stop application
pm2 stop kinto-qa

# Monitor
pm2 monit
```

### Option 2: Using Systemd Service (Linux)

#### 1. Create Service File

```bash
sudo nano /etc/systemd/system/kinto-qa.service
```

Add:
```ini
[Unit]
Description=KINTO QA Management System
After=network.target postgresql.service

[Service]
Type=simple
User=kinto
WorkingDirectory=/opt/kinto-qa
Environment=NODE_ENV=production
EnvironmentFile=/opt/kinto-qa/.env
ExecStart=/usr/bin/node /opt/kinto-qa/dist/index.js
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=kinto-qa

[Install]
WantedBy=multi-user.target
```

#### 2. Start and Enable Service

```bash
# Reload systemd
sudo systemctl daemon-reload

# Start service
sudo systemctl start kinto-qa

# Enable on boot
sudo systemctl enable kinto-qa

# Check status
sudo systemctl status kinto-qa

# View logs
sudo journalctl -u kinto-qa -f
```

### Option 3: Using Nginx Reverse Proxy (Recommended for Production)

#### 1. Install Nginx

```bash
# Ubuntu/Debian
sudo apt install nginx

# CentOS/RHEL
sudo dnf install nginx
```

#### 2. Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/kinto-qa
```

Add:
```nginx
upstream kinto_backend {
    server 127.0.0.1:5000;
    keepalive 64;
}

server {
    listen 80;
    server_name kinto.yourcompany.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name kinto.yourcompany.com;

    # SSL Configuration
    ssl_certificate /etc/ssl/certs/kinto.crt;
    ssl_certificate_key /etc/ssl/private/kinto.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Logging
    access_log /var/log/nginx/kinto-qa-access.log;
    error_log /var/log/nginx/kinto-qa-error.log;

    # Max upload size
    client_max_body_size 50M;

    # Proxy settings
    location / {
        proxy_pass http://kinto_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
```

#### 3. Enable Site and Restart Nginx

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/kinto-qa /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### Option 4: Using Docker (Optional)

#### 1. Create Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 5000

CMD ["node", "dist/index.js"]
```

#### 2. Create docker-compose.yml

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_DB: kinto_qa
      POSTGRES_USER: kinto_admin
      POSTGRES_PASSWORD: YourSecurePassword123!
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database_schema.sql:/docker-entrypoint-initdb.d/schema.sql
    ports:
      - "5432:5432"

  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://kinto_admin:YourSecurePassword123!@postgres:5432/kinto_qa
      SESSION_SECRET: your-session-secret-here
    depends_on:
      - postgres
    restart: unless-stopped

volumes:
  postgres_data:
```

#### 3. Deploy with Docker

```bash
docker-compose up -d
```

---

## Post-Deployment Configuration

### 1. First-Time Setup

1. **Access the Application**
   - Navigate to: `https://kinto.yourcompany.com`
   - Or: `http://your-server-ip:5000`

2. **Login with Default Admin**
   - Username: `admin`
   - Password: `Admin@123`

3. **Change Admin Password**
   - Go to Profile → Change Password
   - Use a strong password (min 12 characters, mixed case, numbers, symbols)

4. **Create Users**
   - Navigate to Admin → Users
   - Create users for each role (operators, reviewers, managers)

5. **Configure Machines**
   - Navigate to Admin → Machines
   - Add your production machines

6. **Setup Checklist Templates**
   - Navigate to Admin → Checklist Templates
   - Create templates for each machine type

### 2. Verify Installation

```bash
# Check if application is running
curl http://localhost:5000

# Check database connection
psql -U kinto_admin -d kinto_qa -c "SELECT COUNT(*) FROM users;"

# Check logs
pm2 logs kinto-qa
# or
sudo journalctl -u kinto-qa -f
```

---

## Security Hardening

### 1. Database Security

```bash
# Create read-only backup user
sudo -u postgres psql -d kinto_qa
CREATE USER kinto_readonly WITH PASSWORD 'BackupPassword123!';
GRANT CONNECT ON DATABASE kinto_qa TO kinto_readonly;
GRANT USAGE ON SCHEMA public TO kinto_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO kinto_readonly;
```

### 2. Firewall Configuration

```bash
# Ubuntu/Debian (UFW)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp  # SSH
sudo ufw enable

# CentOS/RHEL (firewalld)
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --reload
```

### 3. SSL/TLS Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d kinto.yourcompany.com

# Auto-renewal is configured automatically
# Test renewal:
sudo certbot renew --dry-run
```

### 4. Regular Security Updates

```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y

# CentOS/RHEL
sudo dnf update -y
```

### 5. Backup Configuration

Create backup script:
```bash
sudo nano /opt/backup-kinto.sh
```

Add:
```bash
#!/bin/bash
BACKUP_DIR="/opt/backups/kinto"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup database
pg_dump -U kinto_admin kinto_qa | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Backup application files
tar -czf $BACKUP_DIR/app_$DATE.tar.gz -C /opt/kinto-qa .

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
```

Make executable and schedule:
```bash
sudo chmod +x /opt/backup-kinto.sh

# Add to crontab (daily at 2 AM)
sudo crontab -e
# Add line:
0 2 * * * /opt/backup-kinto.sh >> /var/log/kinto-backup.log 2>&1
```

---

## Troubleshooting

### Common Issues

#### 1. Application Won't Start

```bash
# Check logs
pm2 logs kinto-qa
# or
sudo journalctl -u kinto-qa -f

# Check if port is already in use
sudo lsof -i :5000

# Check database connection
psql -U kinto_admin -d kinto_qa -c "SELECT 1;"
```

#### 2. Database Connection Errors

```bash
# Verify PostgreSQL is running
sudo systemctl status postgresql

# Check connection string in .env
cat /opt/kinto-qa/.env | grep DATABASE_URL

# Test connection
psql -U kinto_admin -h localhost -d kinto_qa
```

#### 3. Permission Errors

```bash
# Fix file ownership
sudo chown -R kinto:kinto /opt/kinto-qa

# Fix permissions
sudo chmod -R 755 /opt/kinto-qa
sudo chmod 600 /opt/kinto-qa/.env
```

#### 4. Out of Memory

```bash
# Check memory usage
free -h

# If using PM2, reduce instances
pm2 scale kinto-qa 1

# Or increase server memory
```

#### 5. Nginx 502 Bad Gateway

```bash
# Check if backend is running
curl http://localhost:5000

# Check Nginx logs
sudo tail -f /var/log/nginx/kinto-qa-error.log

# Restart services
sudo systemctl restart kinto-qa
sudo systemctl restart nginx
```

### Support Contacts

- **Technical Support**: support@kinto.com
- **Emergency Hotline**: +1-XXX-XXX-XXXX
- **Documentation**: https://docs.kinto.com

---

## Appendix

### A. Port Reference
- `5000` - Application server (internal)
- `80` - HTTP (redirects to HTTPS)
- `443` - HTTPS (public access)
- `5432` - PostgreSQL (internal only)

### B. File Locations
- Application: `/opt/kinto-qa`
- Logs: `/opt/kinto-qa/logs` or `/var/log/kinto-qa`
- Database: `/var/lib/postgresql/14/main`
- Backups: `/opt/backups/kinto`

### C. Useful Commands

```bash
# View active connections
sudo ss -tulpn | grep :5000

# Monitor resource usage
htop

# Database size
psql -U kinto_admin -d kinto_qa -c "SELECT pg_size_pretty(pg_database_size('kinto_qa'));"

# Application version
cd /opt/kinto-qa && git describe --tags
```

---

**Document Version**: 1.0  
**Last Updated**: November 4, 2025  
**For**: KINTO QA Management System v1.0
