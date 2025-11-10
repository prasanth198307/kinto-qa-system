# On-Premises Deployment Checklist
## KINTO Operations & QA Management System

**Version:** 1.0.0  
**Date:** November 10, 2025  
**Status:** ✅ READY FOR PRODUCTION DEPLOYMENT

---

## Pre-Deployment Checklist

### ✅ Code Quality
- [x] All TypeScript/LSP errors resolved
- [x] Production build successful (`npm run build`)
- [x] No compilation errors
- [x] All bug fixes implemented (Bug #7, #8, self-deletion prevention)

### ✅ Build Artifacts
- [x] Frontend built: `dist/public/` (1.05 MB)
- [x] Backend built: `dist/index.js` (236.4 KB)
- [x] Build command: `npm run build`
- [x] Start command: `npm start`

### ⚠️ Security (Complete Before Deployment)
- [ ] Change default admin password from `Admin@123`
- [ ] Delete or disable test accounts:
  - `manager_test` / `Test@123`
  - `operator_test` / `Test@123`
  - `reviewer_test` / `Test@123`
- [ ] Generate new `SESSION_SECRET` (32+ characters)
- [ ] Review and set production `DATABASE_URL`
- [ ] Configure firewall rules
- [ ] Enable HTTPS/SSL

---

## Required Environment Variables

Create a `.env` file in production with these variables:

```bash
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/kinto_production

# Session Configuration
SESSION_SECRET=your-secure-random-secret-min-32-chars

# Optional: Email Notifications (if using SendGrid)
# SENDGRID_API_KEY=your-sendgrid-api-key
# FROM_EMAIL=noreply@yourcompany.com

# Optional: WhatsApp Notifications (if using Twilio)
# TWILIO_ACCOUNT_SID=your-twilio-account-sid
# TWILIO_AUTH_TOKEN=your-twilio-auth-token
# TWILIO_PHONE_NUMBER=+1234567890
```

---

## Deployment Steps

### 1. Server Setup
```bash
# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL 13+
sudo apt-get install -y postgresql postgresql-contrib

# Install PM2 for process management
sudo npm install -g pm2
```

### 2. Database Setup
```bash
# Create database
sudo -u postgres psql
CREATE DATABASE kinto_production;
CREATE USER kinto_user WITH PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE kinto_production TO kinto_user;
\q

# Set DATABASE_URL in .env
echo "DATABASE_URL=postgresql://kinto_user:your-secure-password@localhost:5432/kinto_production" > .env
```

### 3. Application Deployment
```bash
# Clone/copy application files
cd /opt
git clone <your-repo> kinto-app
cd kinto-app

# Install dependencies
npm install --production

# Build application
npm run build

# Push database schema
npm run db:push

# Create admin user (if needed)
# Use the application UI or run migration script
```

### 4. Production Environment Setup
```bash
# Add environment variables
nano .env

# Required:
DATABASE_URL=postgresql://kinto_user:your-password@localhost:5432/kinto_production
SESSION_SECRET=generate-a-long-random-string-here

# Test the application
npm start

# Should see:
# ✅ Server running on port 5000
# ✅ Connected to local PostgreSQL successfully
```

### 5. Process Management with PM2
```bash
# Start application with PM2
pm2 start npm --name "kinto-app" -- start

# Enable startup on boot
pm2 startup
pm2 save

# Monitor application
pm2 status
pm2 logs kinto-app
```

### 6. Nginx Reverse Proxy (Optional but Recommended)
```bash
# Install Nginx
sudo apt-get install -y nginx

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/kinto-app

# Add configuration:
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}

# Enable site
sudo ln -s /etc/nginx/sites-available/kinto-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 7. SSL/HTTPS Setup (Recommended)
```bash
# Install Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal is configured automatically
```

---

## Post-Deployment Verification

### 1. Application Health Check
```bash
# Check if application is running
pm2 status

# Check logs for errors
pm2 logs kinto-app --lines 50

# Test HTTP endpoint
curl http://localhost:5000/api/user
# Should return: 401 Unauthorized (expected when not logged in)
```

### 2. Database Connection
```bash
# Connect to database
psql -U kinto_user -d kinto_production -h localhost

# Check tables exist
\dt

# Should see tables:
# - users
# - roles
# - machines
# - checklists
# - etc.
```

### 3. Login Test
- Open browser: `http://your-server-ip` or `https://your-domain.com`
- Login with admin credentials
- Verify dashboard loads
- Test key features:
  - User management
  - Machine configuration
  - Checklist creation
  - Reviewer dashboard

### 4. Security Verification
- [ ] Admin password changed from default
- [ ] Test accounts deleted/disabled
- [ ] HTTPS enabled (if using domain)
- [ ] Firewall configured (only allow ports 80, 443, 22)
- [ ] Database not accessible from outside

---

## Production Security Checklist

### Mandatory Steps
```bash
# 1. Change admin password
# Login as admin → Settings → Change Password

# 2. Delete test accounts
# Login as admin → Users → Delete:
#   - manager_test
#   - operator_test
#   - reviewer_test

# 3. Configure firewall
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# 4. Secure PostgreSQL
sudo nano /etc/postgresql/*/main/pg_hba.conf
# Change "trust" to "md5" for local connections
sudo systemctl restart postgresql
```

---

## Backup & Maintenance

### Database Backup
```bash
# Create backup script
nano /opt/kinto-app/backup-db.sh

#!/bin/bash
BACKUP_DIR="/opt/backups/kinto"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

pg_dump -U kinto_user -h localhost kinto_production | gzip > $BACKUP_DIR/kinto_backup_$DATE.sql.gz

# Keep only last 7 days
find $BACKUP_DIR -name "kinto_backup_*.sql.gz" -mtime +7 -delete

# Make executable
chmod +x /opt/kinto-app/backup-db.sh

# Add to cron (daily at 2 AM)
crontab -e
0 2 * * * /opt/kinto-app/backup-db.sh
```

### Application Updates
```bash
# Pull latest code
cd /opt/kinto-app
git pull

# Install dependencies
npm install --production

# Build
npm run build

# Push database changes
npm run db:push

# Restart application
pm2 restart kinto-app

# Verify
pm2 logs kinto-app --lines 50
```

---

## Troubleshooting

### Application Won't Start
```bash
# Check logs
pm2 logs kinto-app --lines 100

# Common issues:
# 1. Database connection failed
#    - Verify DATABASE_URL in .env
#    - Check PostgreSQL is running: sudo systemctl status postgresql

# 2. Port 5000 already in use
#    - Find process: sudo lsof -i :5000
#    - Kill process or change port

# 3. Missing dependencies
#    - Run: npm install
```

### Database Connection Issues
```bash
# Test connection
psql -U kinto_user -d kinto_production -h localhost

# If fails:
# 1. Check password
# 2. Check pg_hba.conf authentication
# 3. Restart PostgreSQL: sudo systemctl restart postgresql
```

### Performance Issues
```bash
# Check system resources
htop

# Check application memory
pm2 monit

# Check database performance
psql -U kinto_user -d kinto_production
SELECT * FROM pg_stat_activity;

# Optimize database
VACUUM ANALYZE;
```

---

## Support & Documentation

### Documentation Files
- `DEPLOYMENT_GUIDE_UPDATED.md` - Complete deployment guide
- `TEST_CREDENTIALS.md` - Test credentials reference
- `TEST_STATUS_SUMMARY.md` - Test results
- `replit.md` - System architecture

### Key Features
- Delete UX: Standardized AlertDialog confirmations
- Reviewer Dashboard: Complete approval workflow
- Self-Deletion Prevention: Users cannot delete their own accounts
- Role-Based Access: Dynamic permissions system

### Build Information
- **Frontend:** React 18 + TypeScript + Vite
- **Backend:** Node.js + Express + TypeScript
- **Database:** PostgreSQL 13+
- **Build Size:** ~1.3 MB total
- **Node Version:** 18+

---

## ✅ DEPLOYMENT STATUS

**Code:** ✅ Ready  
**Build:** ✅ Successful  
**Tests:** ⚠️ Test infrastructure ready (manual testing recommended)  
**Security:** ⚠️ Requires production setup (change passwords, remove test accounts)  
**Documentation:** ✅ Complete  

**READY FOR ON-PREMISES DEPLOYMENT** ✅

Follow the steps above to deploy to your production server.
