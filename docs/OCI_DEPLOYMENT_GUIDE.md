# KINTO Smart Ops - OCI (Oracle Cloud Infrastructure) Deployment Guide

## Overview
Complete guide for deploying KINTO Smart Ops on Oracle Cloud Infrastructure using a single OCI Compute instance with built-in PostgreSQL database, networking, and security configuration.

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [OCI Account Setup](#oci-account-setup)
3. [Create OCI Compute Instance](#create-oci-compute-instance)
4. [Network & Security Configuration](#network--security-configuration)
5. [SSH Access Setup](#ssh-access-setup)
6. [System Preparation](#system-preparation)
7. [Node.js Installation](#nodejs-installation)
8. [PostgreSQL Database Setup](#postgresql-database-setup)
9. [Application Deployment](#application-deployment)
10. [Environment Configuration](#environment-configuration)
11. [SSL/TLS Setup](#ssltls-setup)
12. [Nginx Reverse Proxy](#nginx-reverse-proxy)
13. [Systemd Service](#systemd-service)
14. [WhatsApp Integration](#whatsapp-integration)
15. [Monitoring & Backup](#monitoring--backup)
16. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### OCI Account Requirements
- Active OCI account (Oracle Cloud Free Tier or paid)
- Credit card for account verification
- Sufficient quota in your tenancy (1 VM, 1 VCN)
- Access to OCI Console

### Local Requirements (Mac)
- SSH client (built-in on macOS)
- Terminal access
- ssh-keygen for key pairs
- SCP or rsync for file transfers

---

## OCI Account Setup

### 1. Create OCI Account
1. Go to https://www.oracle.com/cloud/free/
2. Click "Start for Free"
3. Complete registration with email and phone verification
4. Create Oracle Cloud account
5. Set up your tenancy and compartment

### 2. Set Default Compartment
```
OCI Console → Identity → Compartments
Select your root compartment or create "kinto-prod" compartment
Note down the OCID
```

### 3. Generate API Key (for automation, optional)
```
OCI Console → Identity → Users → Your User
API Keys → Add API Key
Download private key (.pem file)
```

---

## Create OCI Compute Instance

### Step 1: Launch Compute Instance

1. **Navigate to Compute:**
   ```
   OCI Console → Compute → Instances
   ```

2. **Click "Create Instance"**

3. **Basic Configuration:**
   - **Name:** `kinto-prod-server` (or your choice)
   - **Placement:** 
     - Region: Select closest to your location (e.g., US-Ashburn-1)
     - Availability Domain: Choose default
     - Fault Domain: Choose default
   
4. **Image Selection:**
   - Click "Change Image"
   - Select: **Oracle Linux 9** (Always Free eligible)
   - Version: Latest available
   - Click "Select Image"

5. **Instance Shape:**
   - Click "Change Shape"
   - **Always Free Eligible Instances:**
     - `VM.Standard.E4.Flex` - 2 OCPU, 12GB RAM
     - `VM.Standard.A1.Flex` - 4 OCPU ARM, 24GB RAM
   - Select "Always Free" filter
   - Choose `VM.Standard.E4.Flex` (Recommended)
   - OCPU Count: 2 (minimum)
   - RAM: 12GB (auto-adjusted)
   - Click "Select Shape"

6. **Networking:**
   - **Create New VCN:** ✓ (Check this)
   - **VCN Name:** `kinto-prod-vcn`
   - **Subnet Name:** `kinto-prod-subnet`
   - **Assign a Public IP Address:** ✓ (Check this)
   - Leave other settings as default

7. **SSH Key Pair:**
   ```
   CRITICAL: You have two options:
   
   Option A: Generate new key pair in OCI
   - Click "Generate Keypair"
   - Save the private key (.key file) to your Mac:
     ~/.ssh/kinto-instance.key
     chmod 600 ~/.ssh/kinto-instance.key
   
   Option B: Use existing SSH key
   - Click "Paste public key"
   - Paste content of ~/.ssh/id_rsa.pub from your Mac
   - Keep your private key locally (~/.ssh/id_rsa)
   ```

8. **Storage Configuration:**
   - Boot Volume: Default (50GB)
   - Leave other options as default

9. **Click "Create"**

### Step 2: Wait for Instance Creation
- Status changes to "Running" (takes 1-2 minutes)
- Note down the **Public IP Address**
- Example: `152.70.123.45`

### Step 3: Verify Instance Access
```bash
# From your Mac terminal
# Test SSH connectivity (replace with your actual IP)
ssh -i ~/.ssh/kinto-instance.key opc@152.70.123.45

# You should see:
# The authenticity of host '152.70.123.45' can't be established.
# Type 'yes' to accept
# Then you're in!

exit  # Exit SSH session
```

---

## Network & Security Configuration

### Step 1: Create Network Security Group

1. **Navigate to Security Lists:**
   ```
   OCI Console → Networking → Virtual Cloud Networks
   → kinto-prod-vcn → Security Lists
   ```

2. **Click "Create Security List":**
   - **Name:** `kinto-prod-sg`
   - **Compartment:** Your compartment

3. **Add Ingress Rules:**

   | Protocol | Source | Destination Port | Purpose |
   |----------|--------|-----------------|---------|
   | TCP | 0.0.0.0/0 | 22 | SSH |
   | TCP | 0.0.0.0/0 | 80 | HTTP |
   | TCP | 0.0.0.0/0 | 443 | HTTPS |
   | TCP | 0.0.0.0/0 | 5000 | App (if needed) |

4. **Add Egress Rules:**
   - **Destination:** 0.0.0.0/0
   - **Protocol:** All Protocols
   - **Port:** All

5. **Click "Create"**

### Step 2: Associate Security List with Subnet

1. **Navigate to:**
   ```
   OCI Console → Networking → Virtual Cloud Networks
   → kinto-prod-vcn → Subnets → kinto-prod-subnet
   ```

2. **Click "Edit"**

3. **Under "Security Lists":**
   - Remove "Default Security List" if present
   - Add: `kinto-prod-sg`
   - Click "Save"

### Step 3: Configure Firewall on Instance (firewalld)

This will be done after SSH access in the system preparation section.

---

## SSH Access Setup

### From macOS Terminal

```bash
# 1. Get your instance's Public IP from OCI Console
# Go to: Compute → Instances → kinto-prod-server
# Copy the "Public IP Address" (e.g., 152.70.123.45)

# 2. Create SSH config entry (optional, for easy access)
cat >> ~/.ssh/config << 'EOF'
Host kinto-prod
    HostName 152.70.123.45
    User opc
    IdentityFile ~/.ssh/kinto-instance.key
    StrictHostKeyChecking accept-new
EOF

# 3. Connect to instance
ssh -i ~/.ssh/kinto-instance.key opc@152.70.123.45

# Or if you added to config:
ssh kinto-prod

# 4. Verify you're in (you should see):
[opc@kinto-prod-server ~]$
```

### Create Non-Root User

```bash
# As opc user (default admin)
sudo useradd -m -s /bin/bash kinto
sudo usermod -aG wheel kinto

# Set password (optional)
sudo passwd kinto

# Switch to kinto user
sudo su - kinto

# Verify
whoami  # Should output: kinto
```

---

## System Preparation

### 1. Update System Packages

```bash
# As kinto user
sudo dnf update -y
sudo dnf install -y wget curl git vim nano htop
```

### 2. Configure Firewall (firewalld)

```bash
# Enable firewall
sudo systemctl enable firewalld
sudo systemctl start firewalld

# Allow SSH
sudo firewall-cmd --permanent --add-service=ssh

# Allow HTTP
sudo firewall-cmd --permanent --add-service=http

# Allow HTTPS
sudo firewall-cmd --permanent --add-service=https

# Allow app port (optional, if accessing directly)
sudo firewall-cmd --permanent --add-port=5000/tcp

# Reload firewall
sudo firewall-cmd --reload

# Verify
sudo firewall-cmd --list-all
```

### 3. Set Timezone

```bash
sudo timedatectl set-timezone UTC
# Or your preferred timezone
# sudo timedatectl set-timezone Asia/Kolkata

# Verify
timedatectl
```

---

## Node.js Installation

```bash
# Install Node.js 20 LTS from NodeSource
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs

# Verify
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x
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

### 2. Create Database and User

```bash
# Switch to postgres user
sudo su - postgres

# Connect to PostgreSQL
psql

# Create database and user
CREATE DATABASE kinto_ops;
CREATE USER kinto_user WITH PASSWORD 'your_strong_password_here_min_16_chars';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE kinto_ops TO kinto_user;

# Connect to database and grant schema privileges
\c kinto_ops
GRANT ALL ON SCHEMA public TO kinto_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO kinto_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO kinto_user;

# Exit psql
\q

# Exit postgres user
exit
```

### 3. Database Connection String

```
postgresql://kinto_user:your_strong_password_here_min_16_chars@localhost:5432/kinto_ops
```

---

## Application Deployment

### 1. Clone Repository

```bash
# As kinto user
cd /home/kinto

# Clone from your repository
git clone https://github.com/your-org/kinto-smart-ops.git
cd kinto-smart-ops

# Or extract from release archive
# tar -xzf kinto-smart-ops-v1.0.0.tar.gz
```

### 2. Install Dependencies

```bash
npm install

# Verify build works
npm run build  # (if build script exists)
```

### 3. Run Database Migrations

```bash
npm run db:push

# If conflicts, use force:
npm run db:push -- --force
```

---

## Environment Configuration

### 1. Create .env File

```bash
cat > /home/kinto/kinto-smart-ops/.env << 'EOF'
# Application
NODE_ENV=production
PORT=5000

# Database
DATABASE_URL=postgresql://kinto_user:your_strong_password_here_min_16_chars@localhost:5432/kinto_ops

# Session
SESSION_SECRET=your-secure-random-session-secret-here-min-32-chars

# WhatsApp Configuration
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_ACCESS_TOKEN=your_whatsapp_access_token
WHATSAPP_VERIFY_TOKEN=your_webhook_verification_token

# Colloki Flow
COLLOKI_FLOW_API_KEY=sk-your-colloki-api-key-here

# Server Configuration
REPLIT_DEPLOYMENT=false
VITE_API_URL=https://yourdomain.com
EOF

chmod 600 /home/kinto/kinto-smart-ops/.env
```

### 2. Generate Secure Session Secret

```bash
# Generate random string
openssl rand -base64 32
# Copy output to SESSION_SECRET in .env
```

---

## SSL/TLS Setup

### Option 1: Let's Encrypt (Recommended)

```bash
# Install Certbot
sudo dnf install -y certbot python3-certbot-nginx

# Point domain to your OCI instance public IP
# Update DNS A record:
# yourdomain.com → 152.70.123.45

# Request certificate
sudo certbot certonly --standalone -d yourdomain.com

# Or for multiple domains
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Certificate location
/etc/letsencrypt/live/yourdomain.com/

# Enable auto-renewal
sudo systemctl enable certbot-renew.timer
sudo systemctl start certbot-renew.timer
```

### Option 2: Self-Signed (Development)

```bash
sudo openssl req -x509 -newkey rsa:4096 -keyout /etc/ssl/private/kinto.key \
  -out /etc/ssl/certs/kinto.crt -days 365 -nodes \
  -subj "/C=IN/ST=State/L=City/O=KINTO/CN=yourdomain.com"
```

---

## Nginx Reverse Proxy

### 1. Install Nginx

```bash
sudo dnf install -y nginx
```

### 2. Configure Nginx

```bash
sudo tee /etc/nginx/conf.d/kinto.conf > /dev/null << 'EOF'
upstream kinto_app {
    server 127.0.0.1:5000;
}

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    
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

# Test configuration
sudo nginx -t

# Enable and start
sudo systemctl enable nginx
sudo systemctl start nginx
```

---

## Systemd Service

### 1. Create Service File

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

# Reload systemd
sudo systemctl daemon-reload
```

### 2. Enable and Start Service

```bash
sudo systemctl enable kinto
sudo systemctl start kinto
sudo systemctl status kinto

# View logs
sudo journalctl -u kinto -f
```

---

## WhatsApp Integration

### Configure Meta Dashboard Webhooks

#### 1. WhatsApp Business API Webhook

1. Go to **Meta App Dashboard** → Your App → **WhatsApp** → **Configuration**
2. **Callback URL:**
   ```
   https://yourdomain.com/api/whatsapp/webhook
   ```
3. **Verify Token:** (from WHATSAPP_VERIFY_TOKEN in .env)
4. Click **Verify and Save**
5. **Subscribe to:** `messages` field

#### 2. Colloki Flow Webhook

1. Contact Colloki or access Colloki Dashboard
2. Configure webhook:
   - **URL:** `https://yourdomain.com/api/colloki/callback`
   - **Authorization:** `Bearer KINTO_COLLOKI_WEBHOOK_SECRET_2025`

#### 3. Test Webhooks

```bash
# Test WhatsApp webhook
curl -v https://yourdomain.com/api/whatsapp/webhook

# Test with actual phone number response
curl -X POST https://yourdomain.com/api/colloki/callback \
  -H "Authorization: Bearer KINTO_COLLOKI_WEBHOOK_SECRET_2025" \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "919000151199",
    "outputs": [{"outputs": [{"results": {"message": {"text": "{\"status\":\"OK\",\"remarks\":null,\"confidence\":95}"}}}]}]
  }'
```

---

## Monitoring & Backup

### 1. View Application Logs

```bash
# Real-time logs
sudo journalctl -u kinto -f

# Last 50 lines
sudo journalctl -u kinto -n 50

# With timestamps
sudo journalctl -u kinto -o short-iso
```

### 2. Database Backup

```bash
# Create backup directory
sudo mkdir -p /var/backups/kinto
sudo chown postgres:postgres /var/backups/kinto

# Manual backup
sudo su - postgres
pg_dump -Fc kinto_ops > /var/backups/kinto/kinto_ops_$(date +%Y%m%d_%H%M%S).dump

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

### 3. Database Recovery

```bash
sudo su - postgres
pg_restore -d kinto_ops /var/backups/kinto/kinto_ops_20240115_120000.dump
```

### 4. Export Backup to Mac

```bash
# From your Mac terminal
scp -i ~/.ssh/kinto-instance.key \
  opc@152.70.123.45:/var/backups/kinto/kinto_ops_*.dump \
  ~/kinto-backups/
```

---

## Troubleshooting

### Instance Won't Start Application

```bash
# Check service status
sudo systemctl status kinto

# View detailed logs
sudo journalctl -u kinto -n 100

# Test manually
cd /home/kinto/kinto-smart-ops
npm run dev  # Should see errors if any
```

### Database Connection Issues

```bash
# Test PostgreSQL connection
psql -h localhost -U kinto_user -d kinto_ops -c "SELECT version();"

# Check PostgreSQL is running
sudo systemctl status postgresql-15

# Check database exists
sudo su - postgres
psql -l | grep kinto_ops
```

### Webhook Not Receiving Messages

```bash
# Test endpoint accessibility
curl -v https://yourdomain.com/api/whatsapp/webhook

# Check SSL certificate
openssl s_client -connect yourdomain.com:443

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# Check firewall
sudo firewall-cmd --list-all
```

### High Memory Usage

```bash
# Check process memory
ps aux | grep node

# Monitor in real-time
top

# Restart application
sudo systemctl restart kinto
```

### Disk Space Issues

```bash
# Check disk usage
df -h

# Find large files
find /home/kinto -type f -size +100M

# Check database size
sudo su - postgres
psql -d kinto_ops -c "SELECT pg_size_pretty(pg_database_size('kinto_ops'));"
```

---

## Production Deployment Checklist

- [ ] OCI account created and verified
- [ ] Compute instance launched (Oracle Linux 9)
- [ ] Public IP assigned to instance
- [ ] SSH key pair configured
- [ ] Security list created with proper rules
- [ ] Firewall configured on instance
- [ ] SSH access verified from Mac
- [ ] Non-root user (kinto) created
- [ ] System packages updated
- [ ] Node.js 20 LTS installed
- [ ] PostgreSQL 15 installed and running
- [ ] Database and user created
- [ ] Application cloned
- [ ] Dependencies installed
- [ ] Database migrations completed
- [ ] .env file configured with all secrets
- [ ] Let's Encrypt certificate obtained
- [ ] Nginx installed and configured
- [ ] Nginx SSL configuration verified
- [ ] Systemd service created and enabled
- [ ] Application starts successfully
- [ ] WhatsApp webhook configured in Meta Dashboard
- [ ] Colloki Flow webhook configured
- [ ] Database backup script created
- [ ] Application logs verified
- [ ] Monitoring setup complete

---

## Performance Tuning

### PostgreSQL

```bash
# Edit postgresql.conf
sudo vi /var/lib/pgsql/15/data/postgresql.conf

# For 12GB RAM instance:
shared_buffers = 3GB
effective_cache_size = 9GB
maintenance_work_mem = 512MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
max_worker_processes = 2
max_parallel_workers_per_gather = 1

# Restart
sudo systemctl restart postgresql-15
```

### Nginx

```bash
# Edit /etc/nginx/nginx.conf
sudo vi /etc/nginx/nginx.conf

# Set worker processes
worker_processes auto;
worker_rlimit_nofile 65535;

# In http block:
sendfile on;
tcp_nopush on;
tcp_nodelay on;
keepalive_timeout 65;

# Gzip compression
gzip on;
gzip_comp_level 6;
gzip_types text/plain text/css application/json application/javascript;
```

---

## Support & Maintenance

### Update Schedule
- Security patches: Apply within 24 hours
- Minor updates: Within 1 week
- Major updates: Plan during maintenance window

### Regular Tasks
- Database VACUUM and ANALYZE (weekly)
- Check disk space (weekly)
- Review backup logs (weekly)
- SSL certificate renewal check (monthly)
- System log review (monthly)

### OCI Specific Monitoring
```bash
# In OCI Console:
Compute → Instances → Metrics
Monitor:
- CPU Utilization
- Memory Usage
- Network throughput
- Disk I/O
```

---

## Cost Optimization (Always Free Tier)

### Free Resources
- 2x 2-OCPU compute instances (VM.Standard.E4.Flex)
- 4x ARM compute instances (VM.Standard.A1.Flex)
- 200 GB combined storage for compute boot volumes
- 1 TB object storage
- Always Free databases (limited)

### Cost Monitoring
```
OCI Console → Billing & Cost Management
Monitor:
- Costs to date
- Forecasted costs
- Usage by service
- Set budget alerts
```

---

**Document Version:** 1.0  
**Last Updated:** November 2024  
**Platform:** OCI Compute + PostgreSQL (Single Instance)
