import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 50, bottom: 50, left: 50, right: 50 }
});

const outputPath = path.join(process.cwd(), 'KINTO_Linux_Ubuntu_Deployment_Guide.pdf');
doc.pipe(fs.createWriteStream(outputPath));

// Helper functions
function addTitle(text: string) {
  doc.fontSize(20).fillColor('#1a1a1a').font('Helvetica-Bold').text(text, { align: 'center' });
  doc.moveDown(0.5);
}

function addSubtitle(text: string) {
  doc.fontSize(16).fillColor('#2563eb').font('Helvetica-Bold').text(text);
  doc.moveDown(0.3);
}

function addHeading(text: string) {
  doc.fontSize(14).fillColor('#1a1a1a').font('Helvetica-Bold').text(text);
  doc.moveDown(0.2);
}

function addSubheading(text: string) {
  doc.fontSize(12).fillColor('#4b5563').font('Helvetica-Bold').text(text);
  doc.moveDown(0.2);
}

function addText(text: string) {
  doc.fontSize(10).fillColor('#4a4a4a').font('Helvetica').text(text);
  doc.moveDown(0.3);
}

function addBullet(text: string) {
  doc.fontSize(10).fillColor('#4a4a4a').font('Helvetica').text('• ' + text, { indent: 20 });
  doc.moveDown(0.1);
}

function addCheckmark(text: string) {
  doc.fontSize(10).fillColor('#16a34a').font('Helvetica').text('✓ ' + text, { indent: 20 });
  doc.moveDown(0.1);
}

function addWarning(text: string) {
  doc.fontSize(10).fillColor('#dc2626').font('Helvetica-Bold').text('⚠ ' + text, { indent: 20 });
  doc.moveDown(0.2);
}

function addCode(text: string, options = {}) {
  doc.fontSize(9).fillColor('#1e293b').font('Courier').text(text, { indent: 20, ...options });
  doc.moveDown(0.15);
}

function addSeparator() {
  doc.moveDown(0.3);
  doc.strokeColor('#e5e7eb').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(0.5);
}

function addPageNumber() {
  const pageNumber = doc.bufferedPageRange().start + doc.bufferedPageRange().count;
  doc.fontSize(9).fillColor('#9ca3af').text(`Page ${pageNumber}`, 50, doc.page.height - 30, { align: 'center', width: 495 });
}

// Title Page
addTitle('KINTO Operations & QA');
addTitle('Linux/Ubuntu Deployment Guide');
doc.moveDown(1);
doc.fontSize(12).fillColor('#6b7280').text('Production Deployment with Multi-Application Support', { align: 'center' });
doc.moveDown(0.5);
doc.fontSize(10).fillColor('#6b7280').text('Last Updated: November 14, 2025', { align: 'center' });
doc.moveDown(0.3);
doc.fontSize(10).fillColor('#16a34a').text('Conflict-Free Setup • 53 Tables • Production Ready', { align: 'center' });

doc.addPage();

// Table of Contents
addSubtitle('Table of Contents');
doc.moveDown(0.5);

const sections = [
  '1. Overview & Prerequisites',
  '2. Server Preparation',
  '3. PostgreSQL Installation & Setup',
  '4. Database Creation & Migration',
  '5. Application Deployment',
  '6. Port Configuration (Avoiding Conflicts)',
  '7. Process Management (PM2 Setup)',
  '8. Nginx Reverse Proxy Configuration',
  '9. Environment Variables',
  '10. SSL/HTTPS Setup (Optional)',
  '11. Running Multiple Applications',
  '12. Monitoring & Logs',
  '13. Security Best Practices',
  '14. Troubleshooting',
  '15. Backup & Maintenance'
];

sections.forEach((section, index) => {
  doc.fontSize(11).fillColor('#4a4a4a').font('Helvetica').text(section, { indent: 20 });
  doc.moveDown(0.15);
});

doc.addPage();

// Section 1: Overview & Prerequisites
addSubtitle('1. Overview & Prerequisites');
doc.moveDown(0.3);

addHeading('System Overview');
addText('This guide covers deploying KINTO Operations & QA on a Linux/Ubuntu server that may already be running other applications. We will configure the application to run on a different port to avoid conflicts.');

doc.moveDown(0.3);
addHeading('Server Requirements');
addBullet('Ubuntu 20.04 LTS or later (18.04+ supported)');
addBullet('Node.js 18.x or 20.x');
addBullet('PostgreSQL 13+ (14 or 15 recommended)');
addBullet('Minimum 2GB RAM (4GB recommended)');
addBullet('Minimum 10GB disk space');
addBullet('Root or sudo access');

doc.moveDown(0.3);
addHeading('Assumed Current Setup');
addBullet('You have another application running on port 3000 or 5000');
addBullet('PostgreSQL may or may not be installed');
addBullet('Nginx may or may not be configured');

doc.moveDown(0.3);
addWarning('IMPORTANT: This guide assumes conflicts exist. We will use port 5001 for KINTO by default.');

doc.addPage();

// Section 2: Server Preparation
addSubtitle('2. Server Preparation');
doc.moveDown(0.3);

addHeading('Update System Packages');
addCode('sudo apt update');
addCode('sudo apt upgrade -y');

doc.moveDown(0.3);
addHeading('Install Essential Build Tools');
addCode('sudo apt install -y build-essential curl git');

doc.moveDown(0.3);
addHeading('Install Node.js (if not installed)');
addCode('# Using NodeSource repository for Node.js 20.x');
addCode('curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -');
addCode('sudo apt install -y nodejs');
doc.moveDown(0.2);
addCode('# Verify installation');
addCode('node --version  # Should show v20.x.x');
addCode('npm --version   # Should show 10.x.x');

doc.moveDown(0.3);
addHeading('Create Application User (Recommended)');
addCode('# Create dedicated user for KINTO');
addCode('sudo adduser --disabled-password --gecos "" kinto');
addCode('sudo usermod -aG sudo kinto');

doc.addPage();

// Section 3: PostgreSQL Installation
addSubtitle('3. PostgreSQL Installation & Setup');
doc.moveDown(0.3);

addHeading('Check if PostgreSQL is Already Installed');
addCode('psql --version');
addText('If PostgreSQL is already installed, skip to database creation.');

doc.moveDown(0.3);
addHeading('Install PostgreSQL 15');
addCode('# Add PostgreSQL APT repository');
addCode('sudo sh -c \'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list\'');
addCode('wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -');
doc.moveDown(0.2);
addCode('# Install PostgreSQL');
addCode('sudo apt update');
addCode('sudo apt install -y postgresql-15 postgresql-contrib-15');

doc.moveDown(0.3);
addHeading('Start and Enable PostgreSQL');
addCode('sudo systemctl start postgresql');
addCode('sudo systemctl enable postgresql');
addCode('sudo systemctl status postgresql');

doc.moveDown(0.3);
addHeading('Configure PostgreSQL Authentication');
addCode('# Edit pg_hba.conf to allow password authentication');
addCode('sudo nano /etc/postgresql/15/main/pg_hba.conf');
doc.moveDown(0.2);
addText('Change this line:');
addCode('local   all             all                                     peer');
addText('To:');
addCode('local   all             all                                     md5');
doc.moveDown(0.2);
addCode('# Restart PostgreSQL');
addCode('sudo systemctl restart postgresql');

doc.addPage();

// Section 4: Database Creation & Migration
addSubtitle('4. Database Creation & Migration');
doc.moveDown(0.3);

addHeading('Create Database and User');
addCode('# Switch to postgres user');
addCode('sudo -u postgres psql');
doc.moveDown(0.2);
addCode('-- Create database');
addCode('CREATE DATABASE kinto_qa;');
doc.moveDown(0.2);
addCode('-- Create user with strong password');
addCode('CREATE USER kinto_user WITH ENCRYPTED PASSWORD \'your_strong_password_here\';');
doc.moveDown(0.2);
addCode('-- Grant privileges');
addCode('GRANT ALL PRIVILEGES ON DATABASE kinto_qa TO kinto_user;');
doc.moveDown(0.2);
addCode('-- Exit psql');
addCode('\\q');

doc.moveDown(0.3);
addHeading('Test Database Connection');
addCode('psql -U kinto_user -d kinto_qa -h localhost');
addCode('# Enter password when prompted');
addCode('\\q  # Exit after successful connection');

doc.moveDown(0.3);
addHeading('Upload Application Files');
addCode('# Option 1: Using Git (recommended)');
addCode('cd /home/kinto');
addCode('git clone https://your-repo-url.git kinto-app');
addCode('cd kinto-app');
doc.moveDown(0.2);
addCode('# Option 2: Using SCP from local machine');
addCode('# On your local machine:');
addCode('scp -r /path/to/kinto-app user@server-ip:/home/kinto/');

doc.addPage();

addHeading('Execute Database Migration Scripts');
addCode('cd /home/kinto/kinto-app');
doc.moveDown(0.2);
addCode('# Execute baseline schema (31 tables)');
addCode('psql -U kinto_user -d kinto_qa -h localhost -f database_scripts/01_schema.sql');
doc.moveDown(0.2);
addCode('# Insert seed data');
addCode('psql -U kinto_user -d kinto_qa -h localhost -f database_scripts/02_seed_data.sql');
doc.moveDown(0.2);
addCode('# Create performance indexes');
addCode('psql -U kinto_user -d kinto_qa -h localhost -f database_scripts/03_indexes.sql');

doc.moveDown(0.3);
addHeading('Execute Incremental Migrations (22 Tables)');
addCode('# Legacy migrations');
addCode('psql -U kinto_user -d kinto_qa -h localhost -f updated_dbscripts/20251106_163500_production_management.sql');
addCode('psql -U kinto_user -d kinto_qa -h localhost -f updated_dbscripts/20251107_020000_notification_config.sql');
addCode('psql -U kinto_user -d kinto_qa -h localhost -f updated_dbscripts/20251110_incremental_whatsapp_checklist.sql');
addCode('psql -U kinto_user -d kinto_qa -h localhost -f updated_dbscripts/20251111_add_photo_spare_parts_columns.sql');
doc.moveDown(0.2);
addCode('# Complete schema migrations');
addCode('psql -U kinto_user -d kinto_qa -h localhost -f updated_dbscripts/20251112_140000_financial_invoicing.sql');
addCode('psql -U kinto_user -d kinto_qa -h localhost -f updated_dbscripts/20251112_140001_sales_returns_credit_notes.sql');
addCode('psql -U kinto_user -d kinto_qa -h localhost -f updated_dbscripts/20251112_140002_production_management.sql');
addCode('psql -U kinto_user -d kinto_qa -h localhost -f updated_dbscripts/20251112_140003_configuration_assignments.sql');
doc.moveDown(0.2);
addCode('# Recent patches');
addCode('psql -U kinto_user -d kinto_qa -h localhost -f updated_dbscripts/20251112_150000_add_credit_notes_approved_by.sql');
addCode('psql -U kinto_user -d kinto_qa -h localhost -f updated_dbscripts/20251113_060000_product_category_type_display_order.sql');

doc.addPage();

addHeading('Verify Database Setup');
addCode('# Count tables (should be 53)');
addCode('psql -U kinto_user -d kinto_qa -h localhost -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = \'public\';"');
doc.moveDown(0.2);
addCode('# Verify admin user');
addCode('psql -U kinto_user -d kinto_qa -h localhost -c "SELECT username, email FROM users WHERE username = \'admin\';"');

doc.moveDown(0.3);
addSubheading('Expected Results:');
addCheckmark('Table count: 53');
addCheckmark('Admin user exists: admin / admin@kinto.com');

doc.addPage();

// Section 5: Application Deployment
addSubtitle('5. Application Deployment');
doc.moveDown(0.3);

addHeading('Install Application Dependencies');
addCode('cd /home/kinto/kinto-app');
addCode('npm install --production');

doc.moveDown(0.3);
addHeading('Build Application');
addCode('# Build frontend');
addCode('npm run build');

doc.moveDown(0.3);
addWarning('NOTE: If build fails with memory issues on small servers:');
addCode('# Increase Node.js memory limit');
addCode('export NODE_OPTIONS="--max-old-space-size=2048"');
addCode('npm run build');

doc.addPage();

// Section 6: Port Configuration
addSubtitle('6. Port Configuration (Avoiding Conflicts)');
doc.moveDown(0.3);

addHeading('Understanding Port Usage');
addText('KINTO by default binds to port 5000. If you have another app on 5000, we will use 5001.');

doc.moveDown(0.3);
addHeading('Check Which Ports Are In Use');
addCode('# Check all listening ports');
addCode('sudo netstat -tulpn | grep LISTEN');
doc.moveDown(0.2);
addCode('# Or using ss command');
addCode('sudo ss -tulpn | grep LISTEN');

doc.moveDown(0.3);
addHeading('Common Port Assignments');
addBullet('Port 80: HTTP (Nginx)');
addBullet('Port 443: HTTPS (Nginx)');
addBullet('Port 3000: Common for other Node apps');
addBullet('Port 5000: Your existing application (assumed)');
addBullet('Port 5001: KINTO (recommended to avoid conflicts)');
addBullet('Port 5432: PostgreSQL');

doc.moveDown(0.3);
addHeading('Configure KINTO Port');
addText('Edit the application startup script or environment variable to use port 5001:');
doc.moveDown(0.2);
addCode('# In your .env file, set:');
addCode('PORT=5001');

doc.addPage();

// Section 7: Process Management (PM2)
addSubtitle('7. Process Management with PM2');
doc.moveDown(0.3);

addHeading('Install PM2 Globally');
addCode('sudo npm install -g pm2');

doc.moveDown(0.3);
addHeading('Create PM2 Ecosystem File');
addCode('# Create ecosystem.config.js');
addCode('nano ecosystem.config.js');
doc.moveDown(0.2);
addText('Add the following content:');

doc.fontSize(8).fillColor('#1e293b').font('Courier');
doc.text('module.exports = {', { indent: 20 });
doc.text('  apps: [{', { indent: 25 });
doc.text('    name: "kinto-app",', { indent: 30 });
doc.text('    script: "server/index.js",  // Or your entry point', { indent: 30 });
doc.text('    cwd: "/home/kinto/kinto-app",', { indent: 30 });
doc.text('    instances: 1,', { indent: 30 });
doc.text('    exec_mode: "fork",', { indent: 30 });
doc.text('    env: {', { indent: 30 });
doc.text('      NODE_ENV: "production",', { indent: 35 });
doc.text('      PORT: 5001,', { indent: 35 });
doc.text('    },', { indent: 30 });
doc.text('    error_file: "/home/kinto/logs/kinto-error.log",', { indent: 30 });
doc.text('    out_file: "/home/kinto/logs/kinto-out.log",', { indent: 30 });
doc.text('    log_date_format: "YYYY-MM-DD HH:mm:ss Z",', { indent: 30 });
doc.text('    merge_logs: true,', { indent: 30 });
doc.text('    autorestart: true,', { indent: 30 });
doc.text('    watch: false,', { indent: 30 });
doc.text('    max_memory_restart: "1G"', { indent: 30 });
doc.text('  }]', { indent: 25 });
doc.text('};', { indent: 20 });
doc.moveDown(0.3);

doc.fontSize(10).fillColor('#4a4a4a').font('Helvetica');
addHeading('Create Logs Directory');
addCode('mkdir -p /home/kinto/logs');

doc.addPage();

addHeading('Start Application with PM2');
addCode('cd /home/kinto/kinto-app');
addCode('pm2 start ecosystem.config.js');
doc.moveDown(0.2);
addCode('# Check status');
addCode('pm2 status');
doc.moveDown(0.2);
addCode('# View logs');
addCode('pm2 logs kinto-app');

doc.moveDown(0.3);
addHeading('Configure PM2 to Start on Boot');
addCode('# Save PM2 process list');
addCode('pm2 save');
doc.moveDown(0.2);
addCode('# Generate and configure startup script');
addCode('pm2 startup systemd');
addCode('# Follow the instructions shown (copy/paste the sudo command)');

doc.moveDown(0.3);
addHeading('Useful PM2 Commands');
addCode('pm2 list                 # List all processes');
addCode('pm2 restart kinto-app    # Restart application');
addCode('pm2 stop kinto-app       # Stop application');
addCode('pm2 delete kinto-app     # Remove from PM2');
addCode('pm2 logs kinto-app       # View logs');
addCode('pm2 monit                # Monitor CPU/Memory');

doc.addPage();

// Section 8: Nginx Configuration
addSubtitle('8. Nginx Reverse Proxy Configuration');
doc.moveDown(0.3);

addHeading('Install Nginx (if not installed)');
addCode('sudo apt install -y nginx');
addCode('sudo systemctl start nginx');
addCode('sudo systemctl enable nginx');

doc.moveDown(0.3);
addHeading('Create Nginx Configuration for KINTO');
addCode('sudo nano /etc/nginx/sites-available/kinto');
doc.moveDown(0.2);
addText('Add the following configuration:');

doc.fontSize(8).fillColor('#1e293b').font('Courier');
doc.text('server {', { indent: 20 });
doc.text('  listen 80;', { indent: 25 });
doc.text('  server_name kinto.yourdomain.com;  # Change to your domain', { indent: 25 });
doc.text('', { indent: 25 });
doc.text('  # Increase upload size for file uploads', { indent: 25 });
doc.text('  client_max_body_size 50M;', { indent: 25 });
doc.text('', { indent: 25 });
doc.text('  location / {', { indent: 25 });
doc.text('    proxy_pass http://localhost:5001;', { indent: 30 });
doc.text('    proxy_http_version 1.1;', { indent: 30 });
doc.text('    proxy_set_header Upgrade $http_upgrade;', { indent: 30 });
doc.text('    proxy_set_header Connection \'upgrade\';', { indent: 30 });
doc.text('    proxy_set_header Host $host;', { indent: 30 });
doc.text('    proxy_cache_bypass $http_upgrade;', { indent: 30 });
doc.text('    proxy_set_header X-Real-IP $remote_addr;', { indent: 30 });
doc.text('    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;', { indent: 30 });
doc.text('    proxy_set_header X-Forwarded-Proto $scheme;', { indent: 30 });
doc.text('  }', { indent: 25 });
doc.text('}', { indent: 20 });
doc.moveDown(0.3);

doc.fontSize(10).fillColor('#4a4a4a').font('Helvetica');
addHeading('Enable the Site');
addCode('# Create symbolic link');
addCode('sudo ln -s /etc/nginx/sites-available/kinto /etc/nginx/sites-enabled/');
doc.moveDown(0.2);
addCode('# Test configuration');
addCode('sudo nginx -t');
doc.moveDown(0.2);
addCode('# Reload Nginx');
addCode('sudo systemctl reload nginx');

doc.addPage();

addHeading('Configure Subdirectory Access (Alternative)');
addText('If you want KINTO at yourdomain.com/kinto instead of a subdomain:');
doc.moveDown(0.2);

doc.fontSize(8).fillColor('#1e293b').font('Courier');
doc.text('# Add to your existing Nginx config:', { indent: 20 });
doc.text('location /kinto/ {', { indent: 20 });
doc.text('  proxy_pass http://localhost:5001/;', { indent: 25 });
doc.text('  proxy_http_version 1.1;', { indent: 25 });
doc.text('  proxy_set_header Upgrade $http_upgrade;', { indent: 25 });
doc.text('  proxy_set_header Connection \'upgrade\';', { indent: 25 });
doc.text('  proxy_set_header Host $host;', { indent: 25 });
doc.text('  proxy_cache_bypass $http_upgrade;', { indent: 25 });
doc.text('}', { indent: 20 });
doc.moveDown(0.3);

doc.fontSize(10).fillColor('#4a4a4a').font('Helvetica');

doc.addPage();

// Section 9: Environment Variables
addSubtitle('9. Environment Variables Configuration');
doc.moveDown(0.3);

addHeading('Create .env File');
addCode('cd /home/kinto/kinto-app');
addCode('nano .env');
doc.moveDown(0.2);
addText('Add the following environment variables:');

doc.fontSize(9).fillColor('#1e293b').font('Courier');
doc.text('# Server Configuration', { indent: 20 });
doc.text('NODE_ENV=production', { indent: 20 });
doc.text('PORT=5001', { indent: 20 });
doc.text('', { indent: 20 });
doc.text('# Database Configuration', { indent: 20 });
doc.text('DATABASE_URL=postgresql://kinto_user:your_strong_password@localhost:5432/kinto_qa', { indent: 20 });
doc.text('PGHOST=localhost', { indent: 20 });
doc.text('PGPORT=5432', { indent: 20 });
doc.text('PGUSER=kinto_user', { indent: 20 });
doc.text('PGPASSWORD=your_strong_password', { indent: 20 });
doc.text('PGDATABASE=kinto_qa', { indent: 20 });
doc.text('', { indent: 20 });
doc.text('# Session Configuration', { indent: 20 });
doc.text('SESSION_SECRET=your-super-secure-random-string-min-32-characters-long', { indent: 20 });
doc.text('', { indent: 20 });
doc.text('# Optional: Email Configuration (SendGrid)', { indent: 20 });
doc.text('# SENDGRID_API_KEY=your_sendgrid_api_key', { indent: 20 });
doc.text('', { indent: 20 });
doc.text('# Optional: WhatsApp Configuration (Meta Business API)', { indent: 20 });
doc.text('# META_PHONE_NUMBER_ID=your_phone_number_id', { indent: 20 });
doc.text('# META_ACCESS_TOKEN=your_access_token', { indent: 20 });
doc.moveDown(0.3);

doc.fontSize(10).fillColor('#4a4a4a').font('Helvetica');
addHeading('Secure the .env File');
addCode('chmod 600 .env');
addCode('chown kinto:kinto .env');

doc.addPage();

// Section 10: SSL/HTTPS Setup
addSubtitle('10. SSL/HTTPS Setup with Let\'s Encrypt');
doc.moveDown(0.3);

addHeading('Install Certbot');
addCode('sudo apt install -y certbot python3-certbot-nginx');

doc.moveDown(0.3);
addHeading('Obtain SSL Certificate');
addCode('# Make sure your domain points to this server\'s IP');
addCode('sudo certbot --nginx -d kinto.yourdomain.com');
doc.moveDown(0.2);
addText('Follow the interactive prompts. Certbot will automatically configure Nginx.');

doc.moveDown(0.3);
addHeading('Auto-Renewal Setup');
addCode('# Test auto-renewal');
addCode('sudo certbot renew --dry-run');
doc.moveDown(0.2);
addText('Certbot creates a systemd timer for auto-renewal. Verify:');
addCode('sudo systemctl status certbot.timer');

doc.addPage();

// Section 11: Running Multiple Applications
addSubtitle('11. Running Multiple Applications on Same Server');
doc.moveDown(0.3);

addHeading('Port Allocation Strategy');
addText('Assign unique ports to each application:');
addBullet('Existing App 1: Port 3000');
addBullet('Existing App 2: Port 5000');
addBullet('KINTO: Port 5001');
addBullet('Future App: Port 5002, 5003, etc.');

doc.moveDown(0.3);
addHeading('Nginx Configuration for Multiple Apps');
addText('Example showing two applications:');

doc.fontSize(8).fillColor('#1e293b').font('Courier');
doc.text('# /etc/nginx/sites-available/apps', { indent: 20 });
doc.text('', { indent: 20 });
doc.text('# Existing App', { indent: 20 });
doc.text('server {', { indent: 20 });
doc.text('  listen 80;', { indent: 25 });
doc.text('  server_name app1.yourdomain.com;', { indent: 25 });
doc.text('  location / {', { indent: 25 });
doc.text('    proxy_pass http://localhost:5000;', { indent: 30 });
doc.text('  }', { indent: 25 });
doc.text('}', { indent: 20 });
doc.text('', { indent: 20 });
doc.text('# KINTO App', { indent: 20 });
doc.text('server {', { indent: 20 });
doc.text('  listen 80;', { indent: 25 });
doc.text('  server_name kinto.yourdomain.com;', { indent: 25 });
doc.text('  location / {', { indent: 25 });
doc.text('    proxy_pass http://localhost:5001;', { indent: 30 });
doc.text('  }', { indent: 25 });
doc.text('}', { indent: 20 });
doc.moveDown(0.3);

doc.fontSize(10).fillColor('#4a4a4a').font('Helvetica');

doc.moveDown(0.3);
addHeading('PM2 Process Management for Multiple Apps');
addCode('# List all PM2 processes');
addCode('pm2 list');
doc.moveDown(0.2);
addText('You should see:');
addCode('┌─────┬──────────────┬─────────┬─────────┬──────────┐');
addCode('│ id  │ name         │ mode    │ status  │ port     │');
addCode('├─────┼──────────────┼─────────┼─────────┼──────────┤');
addCode('│ 0   │ existing-app │ fork    │ online  │ 5000     │');
addCode('│ 1   │ kinto-app    │ fork    │ online  │ 5001     │');
addCode('└─────┴──────────────┴─────────┴─────────┴──────────┘');

doc.addPage();

// Section 12: Monitoring & Logs
addSubtitle('12. Monitoring & Logs');
doc.moveDown(0.3);

addHeading('Application Logs (PM2)');
addCode('# View all logs');
addCode('pm2 logs');
doc.moveDown(0.2);
addCode('# View specific app logs');
addCode('pm2 logs kinto-app');
doc.moveDown(0.2);
addCode('# View error logs only');
addCode('pm2 logs kinto-app --err');
doc.moveDown(0.2);
addCode('# Clear logs');
addCode('pm2 flush');

doc.moveDown(0.3);
addHeading('Nginx Logs');
addCode('# Access logs');
addCode('sudo tail -f /var/log/nginx/access.log');
doc.moveDown(0.2);
addCode('# Error logs');
addCode('sudo tail -f /var/log/nginx/error.log');

doc.moveDown(0.3);
addHeading('PostgreSQL Logs');
addCode('# View PostgreSQL logs');
addCode('sudo tail -f /var/log/postgresql/postgresql-15-main.log');

doc.moveDown(0.3);
addHeading('System Resource Monitoring');
addCode('# Real-time PM2 monitoring');
addCode('pm2 monit');
doc.moveDown(0.2);
addCode('# System resources');
addCode('htop        # Interactive process viewer');
addCode('df -h       # Disk usage');
addCode('free -h     # Memory usage');

doc.addPage();

// Section 13: Security Best Practices
addSubtitle('13. Security Best Practices');
doc.moveDown(0.3);

addHeading('Firewall Configuration (UFW)');
addCode('# Install UFW');
addCode('sudo apt install -y ufw');
doc.moveDown(0.2);
addCode('# Allow SSH (IMPORTANT: Do this first!)');
addCode('sudo ufw allow 22/tcp');
doc.moveDown(0.2);
addCode('# Allow HTTP and HTTPS');
addCode('sudo ufw allow 80/tcp');
addCode('sudo ufw allow 443/tcp');
doc.moveDown(0.2);
addCode('# Enable firewall');
addCode('sudo ufw enable');
doc.moveDown(0.2);
addCode('# Check status');
addCode('sudo ufw status');

doc.moveDown(0.3);
addWarning('DO NOT open ports 5001, 5432 to the internet. Only Nginx (80/443) should be public.');

doc.moveDown(0.3);
addHeading('Database Security');
addCheckmark('Use strong passwords for database users');
addCheckmark('Restrict PostgreSQL to localhost only');
addCheckmark('Regularly update PostgreSQL');
addCheckmark('Enable SSL for database connections (production)');

doc.moveDown(0.3);
addHeading('Application Security');
addCheckmark('Keep Node.js and npm packages updated');
addCheckmark('Use environment variables for secrets');
addCheckmark('Never commit .env files to version control');
addCheckmark('Enable HTTPS (SSL) in production');
addCheckmark('Change default admin password immediately');
addCheckmark('Delete test users before production');

doc.moveDown(0.3);
addHeading('Delete Test Users (Production)');
addCode('psql -U kinto_user -d kinto_qa -h localhost');
addCode('DELETE FROM users WHERE username IN (\'manager_test\', \'operator_test\', \'reviewer_test\');');
addCode('\\q');

doc.addPage();

// Section 14: Troubleshooting
addSubtitle('14. Troubleshooting Common Issues');
doc.moveDown(0.3);

addHeading('Issue: Port Already in Use');
addText('Error: EADDRINUSE: address already in use :::5001');
doc.moveDown(0.2);
addCode('# Find process using the port');
addCode('sudo lsof -i :5001');
doc.moveDown(0.2);
addCode('# Kill the process (if needed)');
addCode('sudo kill -9 <PID>');
doc.moveDown(0.2);
addText('Or change KINTO to use a different port in .env file.');

doc.moveDown(0.3);
addHeading('Issue: Database Connection Failed');
addCode('# Check PostgreSQL is running');
addCode('sudo systemctl status postgresql');
doc.moveDown(0.2);
addCode('# Check if you can connect manually');
addCode('psql -U kinto_user -d kinto_qa -h localhost');
doc.moveDown(0.2);
addCode('# Check pg_hba.conf authentication');
addCode('sudo nano /etc/postgresql/15/main/pg_hba.conf');
addText('Ensure md5 authentication is enabled for local connections.');

doc.moveDown(0.3);
addHeading('Issue: PM2 App Keeps Restarting');
addCode('# Check error logs');
addCode('pm2 logs kinto-app --err');
doc.moveDown(0.2);
addText('Common causes:');
addBullet('Missing environment variables in .env');
addBullet('Database connection issues');
addBullet('Port conflicts');
addBullet('Missing npm dependencies');

doc.moveDown(0.3);
addHeading('Issue: Nginx 502 Bad Gateway');
addText('This means Nginx cannot reach the backend application.');
doc.moveDown(0.2);
addCode('# Check if PM2 app is running');
addCode('pm2 status');
doc.moveDown(0.2);
addCode('# Check if app is listening on correct port');
addCode('sudo netstat -tulpn | grep 5001');
doc.moveDown(0.2);
addCode('# Check Nginx error logs');
addCode('sudo tail -f /var/log/nginx/error.log');

doc.addPage();

addHeading('Issue: Application Out of Memory');
addCode('# Increase PM2 memory limit');
addCode('# Edit ecosystem.config.js:');
addCode('max_memory_restart: "2G"  // Instead of 1G');
doc.moveDown(0.2);
addCode('# Restart PM2');
addCode('pm2 restart kinto-app');

doc.moveDown(0.3);
addHeading('Issue: Cannot Upload Files');
addText('Increase Nginx upload limit:');
addCode('# Edit Nginx config');
addCode('sudo nano /etc/nginx/sites-available/kinto');
doc.moveDown(0.2);
addCode('# Add inside server block:');
addCode('client_max_body_size 50M;');
doc.moveDown(0.2);
addCode('# Reload Nginx');
addCode('sudo systemctl reload nginx');

doc.moveDown(0.3);
addHeading('Issue: Session Expired Immediately');
addText('Check SESSION_SECRET is set in .env file and is at least 32 characters long.');

doc.addPage();

// Section 15: Backup & Maintenance
addSubtitle('15. Backup & Maintenance');
doc.moveDown(0.3);

addHeading('Database Backup Strategy');

addSubheading('Manual Backup:');
addCode('# Full database backup');
addCode('pg_dump -U kinto_user -d kinto_qa -h localhost -F c -f /home/kinto/backups/kinto_$(date +%Y%m%d_%H%M%S).dump');

doc.moveDown(0.3);
addSubheading('Automated Daily Backup:');
addCode('# Create backup script');
addCode('sudo nano /home/kinto/backup-db.sh');
doc.moveDown(0.2);

doc.fontSize(8).fillColor('#1e293b').font('Courier');
doc.text('#!/bin/bash', { indent: 20 });
doc.text('BACKUP_DIR="/home/kinto/backups"', { indent: 20 });
doc.text('DATE=$(date +%Y%m%d_%H%M%S)', { indent: 20 });
doc.text('BACKUP_FILE="$BACKUP_DIR/kinto_$DATE.dump"', { indent: 20 });
doc.text('', { indent: 20 });
doc.text('# Create backup directory if it doesn\'t exist', { indent: 20 });
doc.text('mkdir -p $BACKUP_DIR', { indent: 20 });
doc.text('', { indent: 20 });
doc.text('# Perform backup', { indent: 20 });
doc.text('pg_dump -U kinto_user -d kinto_qa -h localhost -F c -f $BACKUP_FILE', { indent: 20 });
doc.text('', { indent: 20 });
doc.text('# Delete backups older than 30 days', { indent: 20 });
doc.text('find $BACKUP_DIR -name "kinto_*.dump" -mtime +30 -delete', { indent: 20 });
doc.moveDown(0.3);

doc.fontSize(10).fillColor('#4a4a4a').font('Helvetica');
addCode('# Make executable');
addCode('chmod +x /home/kinto/backup-db.sh');
doc.moveDown(0.2);
addCode('# Add to crontab (daily at 2 AM)');
addCode('crontab -e');
addCode('# Add this line:');
addCode('0 2 * * * /home/kinto/backup-db.sh');

doc.addPage();

addHeading('Database Restore');
addCode('# Stop the application');
addCode('pm2 stop kinto-app');
doc.moveDown(0.2);
addCode('# Restore from backup');
addCode('pg_restore -U kinto_user -d kinto_qa -h localhost -c /home/kinto/backups/kinto_20251114_020000.dump');
doc.moveDown(0.2);
addCode('# Start the application');
addCode('pm2 start kinto-app');

doc.moveDown(0.3);
addHeading('Application Updates');
addCode('# Pull latest code (if using Git)');
addCode('cd /home/kinto/kinto-app');
addCode('git pull origin main');
doc.moveDown(0.2);
addCode('# Install new dependencies');
addCode('npm install --production');
doc.moveDown(0.2);
addCode('# Rebuild application');
addCode('npm run build');
doc.moveDown(0.2);
addCode('# Restart with PM2');
addCode('pm2 restart kinto-app');

doc.moveDown(0.3);
addHeading('System Maintenance');
addCode('# Update system packages (monthly)');
addCode('sudo apt update && sudo apt upgrade -y');
doc.moveDown(0.2);
addCode('# Update Node.js packages');
addCode('cd /home/kinto/kinto-app');
addCode('npm outdated  # Check for updates');
addCode('npm update    # Update packages');
doc.moveDown(0.2);
addCode('# Clean up old logs');
addCode('pm2 flush');
addCode('sudo find /var/log/nginx -name "*.log" -mtime +30 -delete');

doc.addPage();

// Deployment Checklist
addSubtitle('Production Deployment Checklist');
doc.moveDown(0.3);

const checklist = [
  '☐ Ubuntu server set up and accessible via SSH',
  '☐ Node.js 18+ installed',
  '☐ PostgreSQL 13+ installed and running',
  '☐ Database kinto_qa created',
  '☐ Database user created with strong password',
  '☐ All 53 tables created (baseline + incremental)',
  '☐ Application files uploaded to server',
  '☐ npm dependencies installed',
  '☐ Application built successfully',
  '☐ .env file created with all required variables',
  '☐ Port 5001 configured (or other available port)',
  '☐ PM2 installed and ecosystem.config.js created',
  '☐ Application started with PM2',
  '☐ PM2 startup configured for auto-start',
  '☐ Nginx installed and configured',
  '☐ Domain pointed to server IP',
  '☐ SSL certificate obtained (Let\'s Encrypt)',
  '☐ Firewall (UFW) configured',
  '☐ Admin password changed from default',
  '☐ Test users deleted (production only)',
  '☐ Database backup configured',
  '☐ Application tested and accessible',
  '☐ Monitoring and logs verified',
  '☐ Documentation updated with server details'
];

checklist.forEach(item => {
  doc.fontSize(10).fillColor('#4a4a4a').font('Helvetica').text(item, { indent: 20 });
  doc.moveDown(0.12);
});

doc.addPage();

// Quick Reference
addSubtitle('Quick Reference Commands');
doc.moveDown(0.3);

addHeading('PM2 Management');
addCode('pm2 list                    # List all apps');
addCode('pm2 logs kinto-app          # View logs');
addCode('pm2 restart kinto-app       # Restart app');
addCode('pm2 stop kinto-app          # Stop app');
addCode('pm2 start kinto-app         # Start app');
addCode('pm2 monit                   # Monitor resources');

doc.moveDown(0.3);
addHeading('Nginx Management');
addCode('sudo nginx -t               # Test config');
addCode('sudo systemctl reload nginx # Reload config');
addCode('sudo systemctl restart nginx# Restart Nginx');
addCode('sudo systemctl status nginx # Check status');

doc.moveDown(0.3);
addHeading('PostgreSQL Management');
addCode('sudo systemctl status postgresql  # Check status');
addCode('psql -U kinto_user -d kinto_qa   # Connect to DB');
addCode('pg_dump -U kinto_user -d kinto_qa -F c -f backup.dump  # Backup');

doc.moveDown(0.3);
addHeading('Log Files');
addCode('PM2 Logs:      /home/kinto/logs/');
addCode('Nginx Access:  /var/log/nginx/access.log');
addCode('Nginx Error:   /var/log/nginx/error.log');
addCode('PostgreSQL:    /var/log/postgresql/');

doc.moveDown(0.5);
addSeparator();

// Footer
doc.fontSize(10).fillColor('#6b7280').font('Helvetica');
doc.text('For support, refer to system administrator or deployment documentation.', { align: 'center' });
doc.moveDown(0.3);
doc.fontSize(9).fillColor('#9ca3af');
doc.text('Document Version: 1.0 | Last Updated: November 14, 2025', { align: 'center' });
doc.text('KINTO Operations & QA Management System', { align: 'center' });
doc.text('Production Deployment Guide - Linux/Ubuntu', { align: 'center' });
doc.moveDown(0.2);
doc.fontSize(10).fillColor('#16a34a').font('Helvetica-Bold');
doc.text('✓ Production Ready', { align: 'center' });

// Finalize PDF
doc.end();

console.log(`✅ Linux/Ubuntu Deployment Guide PDF generated: ${outputPath}`);
