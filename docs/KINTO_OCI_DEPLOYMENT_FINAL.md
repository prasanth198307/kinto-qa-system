# KINTO Smart Ops - OCI Complete Deployment Guide

**Domain:** ops.kintowwater.com  
**Port:** 5050  
**Instance:** OCI Standard E2.1 (1 OCPU + 8GB RAM)  
**Users:** 5  
**Cost:** $0/month (Always Free)

---

## Table of Contents
1. [Pre-Deployment Setup](#pre-deployment-setup)
2. [SSH Access](#ssh-access)
3. [System Installation](#system-installation)
4. [PostgreSQL Database](#postgresql-database)
5. [Application Deployment](#application-deployment)
6. [Environment Configuration](#environment-configuration)
7. [SSL Certificate](#ssl-certificate)
8. [Nginx Reverse Proxy](#nginx-reverse-proxy)
9. [Systemd Service](#systemd-service)
10. [WhatsApp Webhooks](#whatsapp-webhooks)
11. [Verification & Testing](#verification--testing)
12. [Database Backup](#database-backup)
13. [Troubleshooting](#troubleshooting)

---

## Pre-Deployment Setup

### 1. DNS Configuration

Point your domain to OCI instance:

```
Domain Registrar (GoDaddy, Namecheap, etc.)
→ DNS A Record
→ ops.kintowwater.com → YOUR_OCI_PUBLIC_IP
→ Wait 5-10 minutes for propagation
```

### 2. Get OCI Instance Public IP

```
OCI Console → Compute → Instances → Your Instance
Copy: Public IP Address (e.g., 152.70.xxx.xxx)
```

---

## SSH Access

### Connect from Mac

```bash
# Set permissions
chmod 600 ~/.ssh/kinto-instance.key

# SSH into instance
ssh -i ~/.ssh/kinto-instance.key opc@YOUR_PUBLIC_IP

# Verify (should see command prompt)
[opc@kinto ~]$
```

### Create Kinto User

```bash
sudo useradd -m -s /bin/bash kinto
sudo usermod -aG wheel kinto
sudo su - kinto

# Verify
whoami  # Should output: kinto
```

---

## System Installation

### Update & Install Base Packages

```bash
sudo dnf update -y
sudo dnf install -y curl git wget vim nano htop nginx
```

### Install Node.js 20 LTS

```bash
# Add NodeSource repository
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -

# Install Node.js
sudo dnf install -y nodejs

# Verify
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x
```

### Install PostgreSQL 15

```bash
# Add PostgreSQL repository
sudo dnf install -y https://download.postgresql.org/pub/repos/yum/reporpms/EL-9-x86_64/pgdg-redhat-repo-latest.noarch.rpm

# Install PostgreSQL
sudo dnf install -y postgresql15-server postgresql15-contrib

# Initialize database
sudo /usr/pgsql-15/bin/postgresql-15-setup initdb

# Enable and start
sudo systemctl enable postgresql-15
sudo systemctl start postgresql-15

# Verify
sudo systemctl status postgresql-15
```

---

## PostgreSQL Database

### Create Database & User

```bash
# Switch to postgres user
sudo su - postgres

# Connect to PostgreSQL
psql

# Create database
CREATE DATABASE kinto_ops;

# Create user with strong password
CREATE USER kinto_user WITH PASSWORD 'your_strong_password_here_min_16_chars';

# Grant all privileges
GRANT ALL PRIVILEGES ON DATABASE kinto_ops TO kinto_user;

# Connect to database and grant schema privileges
\c kinto_ops
GRANT ALL ON SCHEMA public TO kinto_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO kinto_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO kinto_user;

# Exit
\q
exit  # Exit postgres user
exit  # Back to kinto user
```

### Database Connection String

```
postgresql://kinto_user:your_strong_password_here_min_16_chars@localhost:5432/kinto_ops
```

---

## Application Deployment

### Clone Repository

```bash
cd /home/kinto
git clone https://github.com/your-org/kinto-smart-ops.git
cd kinto-smart-ops
```

### Install Dependencies

```bash
npm install
```

### Run Database Migrations

```bash
npm run db:push

# If conflicts occur, use:
npm run db:push -- --force
```

---

## Environment Configuration

### Create .env File

```bash
cat > /home/kinto/kinto-smart-ops/.env << 'EOF'
NODE_ENV=production
PORT=5050

DATABASE_URL=postgresql://kinto_user:your_strong_password_here_min_16_chars@localhost:5432/kinto_ops

SESSION_SECRET=your-secure-random-session-secret-here-min-32-chars

WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_ACCESS_TOKEN=your_whatsapp_access_token
WHATSAPP_VERIFY_TOKEN=your_webhook_verification_token

COLLOKI_FLOW_API_KEY=sk-your-colloki-api-key-here

REPLIT_DEPLOYMENT=false
VITE_API_URL=https://ops.kintowwater.com
EOF

chmod 600 /home/kinto/kinto-smart-ops/.env
```

### Generate Secure Session Secret

```bash
openssl rand -base64 32
# Copy output to SESSION_SECRET in .env
```

---

## SSL Certificate

### Install Certbot

```bash
sudo dnf install -y certbot python3-certbot-nginx
```

### Request Certificate from Let's Encrypt

```bash
sudo certbot certonly --standalone -d ops.kintowwater.com
```

### Enable Auto-Renewal

```bash
sudo systemctl enable certbot-renew.timer
sudo systemctl start certbot-renew.timer

# Test renewal
sudo certbot renew --dry-run
```

### Certificate Location

```
/etc/letsencrypt/live/ops.kintowwater.com/fullchain.pem
/etc/letsencrypt/live/ops.kintowwater.com/privkey.pem
```

---

## Nginx Reverse Proxy

### Create Nginx Configuration

```bash
sudo tee /etc/nginx/conf.d/kinto.conf > /dev/null << 'EOF'
upstream kinto_app {
    server 127.0.0.1:5050;
}

server {
    listen 80;
    server_name ops.kintowwater.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ops.kintowwater.com;
    
    ssl_certificate /etc/letsencrypt/live/ops.kintowwater.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ops.kintowwater.com/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    location / {
        proxy_pass http://kinto_app;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
EOF
```

### Test & Enable Nginx

```bash
# Test configuration
sudo nginx -t

# Enable on boot
sudo systemctl enable nginx

# Start service
sudo systemctl start nginx

# Verify
sudo systemctl status nginx
```

---

## Systemd Service

### Create Service File

```bash
sudo tee /etc/systemd/system/kinto.service > /dev/null << 'EOF'
[Unit]
Description=KINTO Smart Ops Application
After=network.target postgresql-15.service

[Service]
Type=simple
User=kinto
WorkingDirectory=/home/kinto/kinto-smart-ops
EnvironmentFile=/home/kinto/kinto-smart-ops/.env
ExecStart=/usr/bin/npm run prod
Restart=on-failure
RestartSec=10s
StandardOutput=journal
StandardError=journal
SyslogIdentifier=kinto
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF
```

### Enable & Start Service

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable on boot
sudo systemctl enable kinto

# Start service
sudo systemctl start kinto

# Check status
sudo systemctl status kinto

# View logs in real-time
sudo journalctl -u kinto -f
```

---

## WhatsApp Webhooks

### Configure Meta Dashboard

#### 1. WhatsApp Business API Webhook

```
OCI Console & Meta App Dashboard:

1. Go to: Meta App Dashboard → WhatsApp → Configuration
2. Callback URL: https://ops.kintowwater.com/api/whatsapp/webhook
3. Verify Token: (from .env WHATSAPP_VERIFY_TOKEN)
4. Subscribe to: messages field
5. Click: Verify and Save
```

#### 2. Colloki Flow Webhook

```
Contact Colloki or access Colloki Dashboard:

1. Configure webhook:
   - URL: https://ops.kintowwater.com/api/colloki/callback
   - Authorization: Bearer KINTO_COLLOKI_WEBHOOK_SECRET_2025
2. Test connectivity
```

---

## Verification & Testing

### Check Services

```bash
# Nginx
sudo systemctl status nginx

# Kinto app
sudo systemctl status kinto

# PostgreSQL
sudo systemctl status postgresql-15
```

### View Logs

```bash
# Real-time application logs
sudo journalctl -u kinto -f

# Last 50 lines
sudo journalctl -u kinto -n 50

# Nginx errors
sudo tail -f /var/log/nginx/error.log

# Nginx access
sudo tail -f /var/log/nginx/access.log
```

### Test HTTPS Endpoint

```bash
# Test from Mac
curl https://ops.kintowwater.com

# Should return your application response
```

### Test Firewall Access

```bash
# From your Mac
telnet ops.kintowwater.com 443

# Or with curl verbose
curl -v https://ops.kintowwater.com
```

---

## Database Backup

### Create Manual Backup

```bash
# Create backup directory
sudo mkdir -p /var/backups/kinto
sudo chown postgres:postgres /var/backups/kinto

# Backup database
sudo su - postgres
pg_dump -Fc kinto_ops > /var/backups/kinto/kinto_ops_$(date +%Y%m%d_%H%M%S).dump
exit
```

### Download Backup to Mac

```bash
# From your Mac terminal
scp -i ~/.ssh/kinto-instance.key \
  opc@YOUR_PUBLIC_IP:/var/backups/kinto/kinto_ops_*.dump \
  ~/kinto-backups/
```

### Automated Daily Backup

```bash
# Create backup script
sudo tee /usr/local/bin/backup-kinto-db.sh > /dev/null << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/kinto"
mkdir -p $BACKUP_DIR
sudo su - postgres -c "pg_dump -Fc kinto_ops > $BACKUP_DIR/kinto_ops_$(date +\%Y\%m\%d_\%H\%M\%S).dump"
find $BACKUP_DIR -name "*.dump" -mtime +7 -delete
EOF

sudo chmod +x /usr/local/bin/backup-kinto-db.sh

# Add to crontab (daily at 2 AM)
sudo crontab -e
# Add line: 0 2 * * * /usr/local/bin/backup-kinto-db.sh
```

### Restore from Backup

```bash
sudo su - postgres
pg_restore -d kinto_ops /var/backups/kinto/kinto_ops_20240115_120000.dump
exit
```

---

## Troubleshooting

### SSH Connection Refused

```bash
# Check security list rules in OCI
# Verify port 22 (SSH) is allowed
# Verify public IP is correct
# Verify key permissions: chmod 600 ~/.ssh/key
```

### Application Won't Start

```bash
# Check detailed logs
sudo journalctl -u kinto -n 100

# Test manually
cd /home/kinto/kinto-smart-ops
npm run dev

# Check if port 5050 is listening
sudo ss -tlnp | grep 5050
```

### Database Connection Error

```bash
# Verify PostgreSQL is running
sudo systemctl status postgresql-15

# Test database connection
psql -h localhost -U kinto_user -d kinto_ops -c "SELECT version();"

# Check database exists
sudo su - postgres
psql -l | grep kinto_ops
```

### Nginx 502 Bad Gateway

```bash
# Application not responding on port 5050
sudo ss -tlnp | grep 5050

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log

# Check application logs
sudo journalctl -u kinto -n 50
```

### SSL Certificate Error

```bash
# Verify domain DNS points to public IP
nslookup ops.kintowwater.com

# Check certificate is valid
sudo certbot certificates

# Renew manually
sudo certbot renew --force-renewal
```

### Webhook Not Receiving Messages

```bash
# Test endpoint accessibility
curl -v https://ops.kintowwater.com/api/whatsapp/webhook

# Check firewall
sudo firewall-cmd --list-all

# Verify Meta Dashboard webhook configuration
# Test with curl to verify URL structure
```

### High Memory Usage

```bash
# Check process memory
ps aux | grep node

# Monitor in real-time
top

# Restart application
sudo systemctl restart kinto

# Check logs for memory issues
sudo journalctl -u kinto | grep -i memory
```

---

## Complete Deployment Checklist

### Pre-Deployment
- [ ] OCI E2.1 instance created (1 OCPU + 8GB)
- [ ] Public IP assigned
- [ ] Security list configured (ports 22, 80, 443)
- [ ] SSH access tested
- [ ] Domain DNS A record updated (ops.kintowwater.com → Public IP)

### System Setup
- [ ] System packages updated
- [ ] Node.js 20 LTS installed
- [ ] PostgreSQL 15 installed
- [ ] Nginx installed
- [ ] Certbot installed

### Database
- [ ] PostgreSQL started and enabled
- [ ] Database kinto_ops created
- [ ] User kinto_user created
- [ ] Privileges granted
- [ ] Connection string verified

### Application
- [ ] Git repository cloned
- [ ] npm install completed
- [ ] .env file created with all secrets
- [ ] Database migrations applied (npm run db:push)
- [ ] Port 5050 configured in .env

### SSL/TLS
- [ ] Let's Encrypt certificate obtained
- [ ] Certificate path verified
- [ ] Auto-renewal enabled

### Nginx
- [ ] Configuration created (/etc/nginx/conf.d/kinto.conf)
- [ ] nginx -t test passed
- [ ] Service enabled and started
- [ ] Port 80 → 443 redirect working

### Systemd Service
- [ ] Service file created (/etc/systemd/system/kinto.service)
- [ ] Service enabled
- [ ] Service started
- [ ] Auto-restart working
- [ ] Logs visible via journalctl

### WhatsApp Integration
- [ ] Meta Dashboard webhook configured
- [ ] Colloki Flow webhook configured
- [ ] Verify tokens set correctly
- [ ] Webhooks tested

### Testing
- [ ] HTTPS endpoint working: https://ops.kintowwater.com
- [ ] Application responding
- [ ] Database connection working
- [ ] Logs showing no errors
- [ ] WhatsApp messages being received (if configured)

### Backup & Maintenance
- [ ] Database backup script created
- [ ] Backup tested
- [ ] Automated daily backup configured
- [ ] Monitoring setup complete

---

## Quick Command Reference

```bash
# Start/Stop/Status
sudo systemctl start kinto
sudo systemctl stop kinto
sudo systemctl restart kinto
sudo systemctl status kinto

# View Logs
sudo journalctl -u kinto -f
sudo journalctl -u kinto -n 50

# Database Connection
sudo su - postgres
psql -d kinto_ops

# Nginx
sudo nginx -t
sudo systemctl restart nginx

# Check Listening Ports
sudo ss -tlnp | grep -E "5050|443|80"

# Certificate Status
sudo certbot certificates
sudo certbot renew --dry-run

# Application Health
curl https://ops.kintowwater.com

# System Resources
top
df -h
free -h
```

---

## Key Configuration Details

| Parameter | Value |
|-----------|-------|
| **Domain** | ops.kintowwater.com |
| **Application Port** | 5050 |
| **Nginx HTTP Port** | 80 |
| **Nginx HTTPS Port** | 443 |
| **Database** | PostgreSQL 15 |
| **Database Port** | 5432 |
| **Database Name** | kinto_ops |
| **Database User** | kinto_user |
| **Node.js Version** | 20 LTS |
| **SSL Provider** | Let's Encrypt |
| **Instance Type** | OCI E2.1 (1 OCPU + 8GB) |
| **Cost** | $0/month (Always Free) |
| **Max Users** | 5 |

---

## Deployment Complete! 🎉

Your KINTO Smart Ops application is now:
- ✅ Running on ops.kintowwater.com
- ✅ Using HTTPS/SSL
- ✅ Connected to PostgreSQL database
- ✅ Configured for 5 users
- ✅ Auto-restarting on failure
- ✅ Backing up daily
- ✅ Cost: $0/month

**Application URL:** https://ops.kintowwater.com

---

**Document Version:** 1.0  
**Last Updated:** November 2024  
**Domain:** ops.kintowwater.com  
**Port:** 5050
