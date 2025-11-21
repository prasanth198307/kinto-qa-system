# KINTO Smart Ops - Oracle Linux 9 Deployment Guide

## Overview
This guide provides comprehensive instructions for deploying KINTO Smart Ops on Oracle Linux 9. The application is a full-stack Node.js + PostgreSQL manufacturing operations platform with WhatsApp integration.

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [System Preparation](#system-preparation)
3. [Node.js & npm Installation](#nodejs--npm-installation)
4. [PostgreSQL Database Setup](#postgresql-database-setup)
5. [Application Deployment](#application-deployment)
6. [Environment Configuration](#environment-configuration)
7. [SSL/TLS Setup](#ssltls-setup)
8. [Firewall Configuration](#firewall-configuration)
9. [Systemd Service Setup](#systemd-service-setup)
10. [WhatsApp Webhook Configuration](#whatsapp-webhook-configuration)
11. [Monitoring & Logging](#monitoring--logging)
12. [Troubleshooting](#troubleshooting)
13. [Backup & Recovery](#backup--recovery)

---

## Prerequisites

### Hardware Requirements
- **CPU:** 2+ cores minimum (4+ recommended)
- **RAM:** 4GB minimum (8GB recommended)
- **Storage:** 50GB+ SSD for application and database
- **Network:** Stable internet connection with fixed IP or domain

### Software Requirements
- Oracle Linux 9 (UEK or RHEL-compatible kernel)
- sudo privileges for system configuration
- Git for repository cloning
- Domain name pointing to your server (for SSL)

### Accounts & Credentials Required
- PostgreSQL admin credentials
- WhatsApp Business API credentials
- Colloki Flow API key
- SendGrid API key (optional, for email)
- Domain registrar access (for DNS)

---

## System Preparation

### 1. Update System Packages
```bash
sudo dnf update -y
sudo dnf install -y wget curl git vim nano
```

### 2. Disable SELinux (Optional - for simplified deployment)
For production, configure SELinux properly instead:
```bash
# View current status
getenforce

# Temporarily disable (until reboot)
sudo setenforce 0

# Permanently disable (edit config)
sudo sed -i 's/^SELINUX=.*/SELINUX=disabled/' /etc/selinux/config
sudo reboot
```

### 3. Set Timezone
```bash
sudo timedatectl set-timezone UTC
# Or your preferred timezone
# timedatectl list-timezones | grep "Asia/Kolkata"
# sudo timedatectl set-timezone Asia/Kolkata
```

### 4. Create Application User
```bash
# Create dedicated user for the application
sudo useradd -m -s /bin/bash kinto
sudo usermod -aG wheel kinto  # Add to sudoers group

# Switch to new user
sudo su - kinto
```

---

## Node.js & npm Installation

### 1. Install Node.js 20 LTS (Recommended)

Using NodeSource repository:
```bash
# As root or with sudo
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs

# Verify installation
node --version
npm --version
```

**Alternative: Using nvm (Node Version Manager)**
```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc

# Install Node.js 20
nvm install 20
nvm use 20

# Set as default
nvm alias default 20
```

### 2. Verify Installation
```bash
node -v  # Should show v20.x.x
npm -v   # Should show 10.x.x
```

---

## PostgreSQL Database Setup

### 1. Install PostgreSQL 15

```bash
# Add PostgreSQL repository
sudo dnf install -y https://download.postgresql.org/pub/repos/yum/reporpms/EL-9-x86_64/pgdg-redhat-repo-latest.noarch.rpm

# Install PostgreSQL
sudo dnf install -y postgresql15-server postgresql15-contrib

# Initialize database
sudo /usr/pgsql-15/bin/postgresql-15-setup initdb

# Enable and start service
sudo systemctl enable postgresql-15
sudo systemctl start postgresql-15

# Verify
sudo systemctl status postgresql-15
```

### 2. Configure PostgreSQL Access

```bash
# Switch to postgres user
sudo su - postgres

# Connect to PostgreSQL
psql

# Create database and user
CREATE DATABASE kinto_ops;
CREATE USER kinto_user WITH PASSWORD 'strong_password_here';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE kinto_ops TO kinto_user;

# Connect to database and grant schema privileges
\c kinto_ops
GRANT ALL ON SCHEMA public TO kinto_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO kinto_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO kinto_user;

# Exit psql
\q
exit
```

### 3. Configure PostgreSQL for Remote Access (if needed)

```bash
# Edit postgresql.conf
sudo vi /var/lib/pgsql/15/data/postgresql.conf

# Find and change:
# listen_addresses = 'localhost'
# To:
# listen_addresses = '*'

# Edit pg_hba.conf to allow remote connections
sudo vi /var/lib/pgsql/15/data/pg_hba.conf

# Add line (at the end, before local):
# host    all             all             0.0.0.0/0               md5

# Restart PostgreSQL
sudo systemctl restart postgresql-15
```

### 4. Database Connection String
```
postgresql://kinto_user:strong_password_here@localhost:5432/kinto_ops
```

---

## Application Deployment

### 1. Clone Repository

```bash
# As kinto user
cd /home/kinto

# Clone the repository
git clone https://github.com/your-org/kinto-smart-ops.git
cd kinto-smart-ops

# Or extract from release archive
# tar -xzf kinto-smart-ops-v1.0.0.tar.gz
```

### 2. Install Dependencies

```bash
npm install

# Verify build
npm run build
# (if build script exists)
```

### 3. Run Database Migrations

```bash
# Using Drizzle ORM
npm run db:push

# For production, use force flag if needed:
npm run db:push -- --force
```

---

## Environment Configuration

### 1. Create .env File

```bash
# As kinto user
cd /home/kinto/kinto-smart-ops

# Create .env file
cat > .env << 'EOF'
# Application
NODE_ENV=production
PORT=5000

# Database
DATABASE_URL=postgresql://kinto_user:strong_password_here@localhost:5432/kinto_ops

# Session
SESSION_SECRET=your-secure-random-session-secret-here-min-32-chars

# WhatsApp Configuration
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_ACCESS_TOKEN=your_whatsapp_access_token
WHATSAPP_VERIFY_TOKEN=your_webhook_verification_token

# Colloki Flow
COLLOKI_FLOW_API_KEY=sk-your-colloki-api-key-here

# Optional: Email notifications (SendGrid)
SENDGRID_API_KEY=SG.your-sendgrid-key

# Server Configuration
REPLIT_DEPLOYMENT=false
VITE_API_URL=https://yourdomain.com

# Redis (optional, for caching)
REDIS_URL=redis://localhost:6379
EOF

# Secure the .env file
chmod 600 .env
```

### 2. Generate Secure Session Secret

```bash
# Generate a random 32+ character string
openssl rand -base64 32
# Copy and paste into .env as SESSION_SECRET
```

### 3. Set Environment Variables for SystemD

```bash
# Copy .env to system location
sudo cp /home/kinto/kinto-smart-ops/.env /etc/kinto/

# Secure file permissions
sudo chown root:kinto /etc/kinto/.env
sudo chmod 640 /etc/kinto/.env

# Create /etc/kinto directory if needed
sudo mkdir -p /etc/kinto
```

---

## SSL/TLS Setup

### Option 1: Using Let's Encrypt (Recommended for Public Deployments)

#### 1. Install Certbot

```bash
sudo dnf install -y certbot python3-certbot-nginx
# Or for Apache:
# sudo dnf install -y certbot python3-certbot-apache
```

#### 2. Request Certificate

```bash
# For single domain
sudo certbot certonly --standalone -d yourdomain.com

# For multiple domains
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Interactive mode
sudo certbot certonly --standalone
```

#### 3. Certificate Location
```
/etc/letsencrypt/live/yourdomain.com/
├── cert.pem          (Server certificate)
├── chain.pem         (Chain certificate)
├── fullchain.pem     (Cert + Chain)
└── privkey.pem       (Private key)
```

#### 4. Auto-Renewal

```bash
# Enable certbot auto-renewal
sudo systemctl enable certbot-renew.timer
sudo systemctl start certbot-renew.timer

# Test renewal
sudo certbot renew --dry-run
```

### Option 2: Self-Signed Certificate (Development Only)

```bash
# Create self-signed certificate
sudo openssl req -x509 -newkey rsa:4096 -keyout /etc/ssl/private/kinto.key \
  -out /etc/ssl/certs/kinto.crt -days 365 -nodes \
  -subj "/C=IN/ST=State/L=City/O=KINTO/CN=yourdomain.com"
```

### 3. Configure Application for HTTPS

Update application code or use reverse proxy (Nginx recommended):

```bash
# Install Nginx
sudo dnf install -y nginx

# Create Nginx configuration
sudo tee /etc/nginx/conf.d/kinto.conf > /dev/null << 'EOF'
upstream kinto_app {
    server 127.0.0.1:5000;
}

server {
    listen 80;
    server_name yourdomain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # SSL Security Headers
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Security Headers
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Proxy Configuration
    location / {
        proxy_pass http://kinto_app;
        proxy_http_version 1.1;
        
        # Headers
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Buffering
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
    }
}
EOF

# Test Nginx configuration
sudo nginx -t

# Enable and start Nginx
sudo systemctl enable nginx
sudo systemctl start nginx
sudo systemctl status nginx
```

---

## Firewall Configuration

### Using firewalld (Default on Oracle Linux)

```bash
# Enable firewalld
sudo systemctl enable firewalld
sudo systemctl start firewalld

# Allow SSH (port 22)
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-port=22/tcp

# Allow HTTP (port 80)
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-port=80/tcp

# Allow HTTPS (port 443)
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --add-port=443/tcp

# Allow application port (if accessing directly)
sudo firewall-cmd --permanent --add-port=5000/tcp

# Allow PostgreSQL (only if remote)
# sudo firewall-cmd --permanent --add-port=5432/tcp --source=your-ip/32

# Reload firewall
sudo firewall-cmd --reload

# Verify rules
sudo firewall-cmd --list-all
```

### Using iptables (Alternative)

```bash
# Allow SSH
sudo iptables -A INPUT -p tcp --dport 22 -j ACCEPT

# Allow HTTP
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT

# Allow HTTPS
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT

# Allow application port
sudo iptables -A INPUT -p tcp --dport 5000 -j ACCEPT

# Allow loopback
sudo iptables -A INPUT -i lo -j ACCEPT

# Save rules
sudo iptables-save | sudo tee /etc/sysconfig/iptables

# Enable on boot
sudo systemctl enable iptables
```

---

## Systemd Service Setup

### 1. Create Systemd Service File

```bash
# Create service file
sudo tee /etc/systemd/system/kinto.service > /dev/null << 'EOF'
[Unit]
Description=KINTO Smart Ops Application
After=network.target postgresql-15.service

[Service]
Type=simple
User=kinto
WorkingDirectory=/home/kinto/kinto-smart-ops

# Environment variables
EnvironmentFile=/etc/kinto/.env

# Start command
ExecStart=/usr/bin/npm run prod
# Or if using tsx:
# ExecStart=/usr/bin/npx tsx server/index.ts

# Restart policy
Restart=on-failure
RestartSec=10s
StandardOutput=journal
StandardError=journal
SyslogIdentifier=kinto

# Security
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd
sudo systemctl daemon-reload
```

### 2. Verify Service Configuration

```bash
# Check service file
sudo systemctl cat kinto

# Test service
sudo systemctl start kinto

# Check status
sudo systemctl status kinto

# View logs
sudo journalctl -u kinto -n 50
# Follow logs
sudo journalctl -u kinto -f
```

### 3. Enable Auto-Start

```bash
# Enable service to start on boot
sudo systemctl enable kinto

# Verify
sudo systemctl is-enabled kinto
```

### 4. Service Management Commands

```bash
# Start service
sudo systemctl start kinto

# Stop service
sudo systemctl stop kinto

# Restart service
sudo systemctl restart kinto

# Check status
sudo systemctl status kinto

# View recent logs
sudo journalctl -u kinto --no-pager -n 100

# Follow logs in real-time
sudo journalctl -u kinto -f
```

---

## WhatsApp Webhook Configuration

### 1. Webhook Endpoint Configuration

The application provides webhook endpoints at:
- **Incoming Messages:** `/api/whatsapp/webhook`
- **Colloki Callback:** `/api/colloki/callback`

### 2. Configure in Meta Dashboard

#### Step 1: WhatsApp Business API Webhook

1. Go to **Meta App Dashboard** → Your App
2. Navigate to **WhatsApp** → **Configuration**
3. Under **Webhook URL**, enter:
   ```
   https://yourdomain.com/api/whatsapp/webhook
   ```
4. Under **Verify Token**, enter the value of `WHATSAPP_VERIFY_TOKEN` from `.env`
5. Click **Verify and Save**
6. Subscribe to the `messages` field

#### Step 2: Colloki Flow Webhook Configuration

1. Contact Colloki team or log into Colloki Flow dashboard
2. Configure webhook:
   - **URL:** `https://yourdomain.com/api/colloki/callback`
   - **Authorization Header:** `Bearer KINTO_COLLOKI_WEBHOOK_SECRET_2025`
3. Test webhook connectivity

### 3. Test Webhook

```bash
# Test WhatsApp webhook verification
curl -X GET "https://yourdomain.com/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=your_token&hub.challenge=test_challenge"

# Test message callback (requires proper phone number format)
curl -X POST https://yourdomain.com/api/colloki/callback \
  -H "Authorization: Bearer KINTO_COLLOKI_WEBHOOK_SECRET_2025" \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "919000151199",
    "outputs": [{"outputs": [{"results": {"message": {"text": "{\"status\":\"OK\",\"remarks\":null,\"confidence\":95}"}}}]}]
  }'
```

### 4. Phone Number Format for Colloki

**IMPORTANT:** Colloki Flow requires phone numbers WITHOUT "+":
- ✅ Correct: `919000151199`
- ❌ Wrong: `+919000151199`

Database stores with "+", conversion happens automatically in code.

---

## Monitoring & Logging

### 1. Application Logging

```bash
# View live logs
sudo journalctl -u kinto -f

# View last 100 lines
sudo journalctl -u kinto -n 100

# View with timestamps
sudo journalctl -u kinto -o short-iso

# Filter by priority
sudo journalctl -u kinto -p err
sudo journalctl -u kinto -p warning
```

### 2. Database Logging

```bash
# PostgreSQL logs location
sudo tail -f /var/lib/pgsql/15/data/log/*.log

# Enable query logging (in postgresql.conf)
sudo vi /var/lib/pgsql/15/data/postgresql.conf
# Uncomment: log_statement = 'all'
# log_min_duration_statement = 1000  (log queries > 1000ms)

sudo systemctl restart postgresql-15
```

### 3. System Resource Monitoring

```bash
# CPU and Memory
top
# Or
htop  # (install with: sudo dnf install -y htop)

# Disk usage
df -h

# Network connections
netstat -tlnp
ss -tlnp

# Check application port
sudo ss -tlnp | grep 5000
sudo ss -tlnp | grep 443
```

### 4. Setup Log Rotation

```bash
# Create logrotate config for application logs
sudo tee /etc/logrotate.d/kinto > /dev/null << 'EOF'
/var/log/kinto.log {
    daily
    rotate 7
    compress
    delaycompress
    notifempty
    create 0640 kinto kinto
    sharedscripts
    postrotate
        systemctl reload kinto > /dev/null 2>&1 || true
    endscript
}
EOF
```

### 5. Process Monitoring with Systemd Watchdog

```bash
# Edit service file
sudo systemctl edit kinto

# Add watchdog:
[Service]
WatchdogSec=30
WatchdogSignal=SIGKILL

# Application should periodically call:
# systemd-notify WATCHDOG=1
```

---

## Troubleshooting

### 1. Application Won't Start

```bash
# Check logs
sudo journalctl -u kinto -n 50

# Verify .env file exists and has correct permissions
ls -la /etc/kinto/.env
cat /etc/kinto/.env  # (check without passwords visible)

# Test database connection
PGPASSWORD=password psql -h localhost -U kinto_user -d kinto_ops -c "SELECT version();"

# Check Node.js and npm
node --version
npm --version

# Try running application manually (as kinto user)
sudo su - kinto
cd /home/kinto/kinto-smart-ops
npm run dev
```

### 2. Database Connection Issues

```bash
# Test PostgreSQL is running
sudo systemctl status postgresql-15

# Check if listening on correct port
sudo ss -tlnp | grep postgres

# Test connection locally
sudo su - postgres
psql -d kinto_ops

# From application user
psql -h localhost -U kinto_user -d kinto_ops

# Check database exists
sudo su - postgres
psql -l | grep kinto_ops
```

### 3. WhatsApp Webhook Not Receiving Messages

```bash
# Check webhook is accessible
curl -v https://yourdomain.com/api/whatsapp/webhook

# Verify SSL certificate
openssl s_client -connect yourdomain.com:443

# Check firewall rules
sudo firewall-cmd --list-all

# Check Nginx is proxying correctly
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Test webhook manually
curl -X POST https://yourdomain.com/api/whatsapp/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'

# Check application is listening
sudo ss -tlnp | grep node
```

### 4. High Memory Usage

```bash
# Check process memory
ps aux | grep node

# Monitor memory over time
watch -n 1 'ps aux | grep node'

# Check for memory leaks in logs
sudo journalctl -u kinto | grep -i "memory\|heap"

# Restart application
sudo systemctl restart kinto
```

### 5. Disk Space Issues

```bash
# Check disk usage
df -h

# Find large files
find /home/kinto -type f -size +100M

# Check database size
sudo su - postgres
psql -d kinto_ops -c "SELECT pg_database.datname, pg_size_pretty(pg_database_size(pg_database.datname)) FROM pg_database ORDER BY pg_database_size(pg_database.datname) DESC;"

# Check logs size
du -sh /var/log/*
```

### 6. Connection Timeouts

```bash
# Check network connectivity
ping -c 4 google.com

# Test DNS resolution
nslookup yourdomain.com
dig yourdomain.com

# Check network interfaces
ip addr show

# Test specific service connectivity
telnet yourdomain.com 443
curl -v https://yourdomain.com
```

---

## Backup & Recovery

### 1. Database Backup

```bash
# Full backup
sudo su - postgres
pg_dump -Fc kinto_ops > /backup/kinto_ops_$(date +%Y%m%d_%H%M%S).dump

# Or compressed SQL dump
pg_dump kinto_ops | gzip > /backup/kinto_ops_$(date +%Y%m%d_%H%M%S).sql.gz

# Automated daily backup
sudo tee /usr/local/bin/backup-kinto-db.sh > /dev/null << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/kinto"
mkdir -p $BACKUP_DIR
sudo su - postgres -c "pg_dump -Fc kinto_ops > $BACKUP_DIR/kinto_ops_$(date +\%Y\%m\%d_\%H\%M\%S).dump"
# Keep only last 7 days
find $BACKUP_DIR -name "*.dump" -mtime +7 -delete
EOF

sudo chmod +x /usr/local/bin/backup-kinto-db.sh

# Add to crontab
sudo crontab -e
# Add: 0 2 * * * /usr/local/bin/backup-kinto-db.sh
```

### 2. Application File Backup

```bash
# Backup application files
tar -czf /backup/kinto-app-$(date +%Y%m%d).tar.gz \
  /home/kinto/kinto-smart-ops \
  /etc/kinto/.env

# Backup Nginx configuration
tar -czf /backup/kinto-nginx-$(date +%Y%m%d).tar.gz \
  /etc/nginx/conf.d/kinto.conf
```

### 3. Database Recovery

```bash
# Restore from dump file
sudo su - postgres
pg_restore -d kinto_ops /backup/kinto_ops_20240115_023000.dump

# Or from SQL dump
psql kinto_ops < /backup/kinto_ops_20240115_023000.sql

# Verify recovery
psql -d kinto_ops -c "SELECT COUNT(*) FROM whatsapp_conversation_sessions;"
```

### 4. Restore Application

```bash
# Stop application
sudo systemctl stop kinto

# Restore files
cd /home/kinto
tar -xzf /backup/kinto-app-20240115.tar.gz

# Restore environment file
cp /backup/.env /etc/kinto/.env

# Rebuild dependencies
npm install

# Restart
sudo systemctl start kinto
```

---

## Production Deployment Checklist

- [ ] Oracle Linux 9 system updated (`dnf update`)
- [ ] Node.js 20 LTS installed and verified
- [ ] PostgreSQL 15 installed and running
- [ ] Database created with secure credentials
- [ ] Application cloned and dependencies installed
- [ ] `.env` file created with all required variables
- [ ] Database migrations applied successfully
- [ ] SSL certificate obtained (Let's Encrypt)
- [ ] Nginx configured as reverse proxy
- [ ] Firewall rules configured for HTTP/HTTPS
- [ ] Systemd service created and enabled
- [ ] Service starts automatically on reboot
- [ ] WhatsApp webhook configured in Meta Dashboard
- [ ] Colloki Flow webhook configured
- [ ] Webhooks tested successfully
- [ ] Application logs verified
- [ ] Database backups configured
- [ ] Monitoring setup complete
- [ ] SSL certificate auto-renewal enabled
- [ ] Documentation reviewed with team

---

## Performance Tuning

### 1. PostgreSQL Optimization

```bash
# Edit postgresql.conf
sudo vi /var/lib/pgsql/15/data/postgresql.conf

# Key settings (for 8GB RAM server):
shared_buffers = 2GB
effective_cache_size = 6GB
maintenance_work_mem = 512MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
max_worker_processes = 4
max_parallel_workers_per_gather = 2

sudo systemctl restart postgresql-15
```

### 2. Node.js Optimization

```bash
# In .env
NODE_ENV=production

# In package.json scripts, use --max-old-space-size if needed
"start": "node --max-old-space-size=4096 server/index.js"
```

### 3. Nginx Optimization

```nginx
# In /etc/nginx/nginx.conf
worker_processes auto;
worker_rlimit_nofile 65535;

http {
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 20M;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
}
```

---

## Additional Resources

- **Oracle Linux Documentation:** https://docs.oracle.com/en/operating-systems/oracle-linux/
- **Node.js Production Best Practices:** https://nodejs.org/en/docs/guides/nodejs-docker-webapp/
- **PostgreSQL on Linux:** https://www.postgresql.org/download/linux/
- **Nginx Documentation:** https://nginx.org/en/docs/
- **Let's Encrypt:** https://letsencrypt.org/getting-started/
- **WhatsApp Cloud API:** https://developers.facebook.com/docs/whatsapp/cloud-api/

---

## Support & Maintenance

### Update Schedule
- Security patches: Apply immediately
- Minor updates: Within 1 week
- Major updates: Plan during maintenance window

### Regular Maintenance Tasks
- Database VACUUM and ANALYZE (weekly)
- Log rotation (automated)
- Backup verification (weekly)
- SSL certificate expiration monitoring
- System resource monitoring

### Contact Information
For deployment issues, contact your DevOps/Infrastructure team with:
- Error messages from logs
- System resource usage (top, df)
- Network connectivity status
- WhatsApp webhook test results

---

**Document Version:** 1.0  
**Last Updated:** November 2024  
**Maintained By:** DevOps Team
