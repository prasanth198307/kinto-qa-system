import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createDeploymentPDF() {
  const doc = new PDFDocument({
    margins: {
      top: 50,
      bottom: 50,
      left: 60,
      right: 60
    },
    size: 'A4'
  });

  const outputPath = path.join(__dirname, '..', 'KINTO_QA_Deployment_Guide.pdf');
  doc.pipe(fs.createWriteStream(outputPath));

  // Helper functions
  function addTitle(text) {
    doc.fontSize(24).font('Helvetica-Bold').fillColor('#1a1a1a').text(text, { align: 'center' });
    doc.moveDown(0.5);
  }

  function addHeading1(text) {
    doc.fontSize(18).font('Helvetica-Bold').fillColor('#2563eb').text(text);
    doc.moveDown(0.5);
  }

  function addHeading2(text) {
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a1a1a').text(text);
    doc.moveDown(0.3);
  }

  function addParagraph(text) {
    doc.fontSize(11).font('Helvetica').fillColor('#4a4a4a').text(text, { align: 'left' });
    doc.moveDown(0.5);
  }

  function addBullet(text) {
    doc.fontSize(11).font('Helvetica').fillColor('#4a4a4a').text('• ' + text, { indent: 20 });
  }

  function addCode(text) {
    doc.fontSize(9).font('Courier').fillColor('#000000').text(text, {
      indent: 20,
      continued: false
    });
    doc.moveDown(0.3);
  }

  function addPageBreak() {
    doc.addPage();
  }

  // Cover Page
  doc.moveDown(5);
  doc.fontSize(32).font('Helvetica-Bold').fillColor('#1a1a1a')
    .text('KINTO QA', { align: 'center' });
  doc.fontSize(28).fillColor('#2563eb')
    .text('Management System', { align: 'center' });
  doc.moveDown(2);
  doc.fontSize(20).font('Helvetica').fillColor('#4a4a4a')
    .text('On-Premise Deployment Guide', { align: 'center' });
  doc.moveDown(4);
  doc.fontSize(12).fillColor('#6b6b6b')
    .text('Version 1.0 | November 2025', { align: 'center' });

  addPageBreak();

  // Table of Contents
  addHeading1('Table of Contents');
  doc.moveDown(0.5);
  addParagraph('1. System Overview');
  addParagraph('2. System Requirements');
  addParagraph('3. Server Setup');
  addParagraph('4. Database Installation');
  addParagraph('5. Application Deployment');
  addParagraph('6. Nginx Configuration');
  addParagraph('7. SSL Certificate Setup');
  addParagraph('8. Security Configuration');
  addParagraph('9. Backup Strategy');
  addParagraph('10. Monitoring & Maintenance');
  addParagraph('11. Troubleshooting');
  addParagraph('Appendix A: Default Credentials');
  addParagraph('Appendix B: Quick Command Reference');

  addPageBreak();

  // 1. System Overview
  addHeading1('1. System Overview');
  addParagraph('The KINTO QA Management System is a comprehensive manufacturing quality assurance platform designed for on-premise deployment. This system provides:');
  doc.moveDown(0.3);
  addBullet('Email/password authentication with role-based access control');
  addBullet('Dynamic role management (Admin, Operator, Reviewer, Manager)');
  addBullet('Checklist builder and execution');
  addBullet('Preventive maintenance tracking');
  addBullet('Spare parts management');
  addBullet('Purchase order generation');
  addBullet('PDF export capabilities');
  addBullet('Mobile-responsive Progressive Web App interface');
  doc.moveDown(1);

  // 2. System Requirements
  addHeading1('2. System Requirements');
  addHeading2('Minimum Hardware Requirements:');
  addBullet('Operating System: Ubuntu 20.04 LTS or higher');
  addBullet('CPU: 2 cores minimum (4 cores recommended)');
  addBullet('RAM: 4 GB minimum (8 GB recommended)');
  addBullet('Storage: 50 GB minimum (100 GB recommended)');
  addBullet('Network: Static IP address for production access');
  doc.moveDown(0.5);

  addHeading2('Software Requirements:');
  addBullet('Node.js 20.x LTS');
  addBullet('PostgreSQL 14 or higher');
  addBullet('Nginx (reverse proxy)');
  addBullet('PM2 (process manager)');
  addBullet('Git (for code deployment)');
  doc.moveDown(1);

  addPageBreak();

  // 3. Server Setup
  addHeading1('3. Server Setup');
  
  addHeading2('Step 1: Update System');
  addCode('sudo apt update && sudo apt upgrade -y');
  doc.moveDown(0.5);

  addHeading2('Step 2: Install Node.js 20 LTS');
  addCode('curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -');
  addCode('sudo apt install -y nodejs');
  doc.moveDown(0.5);

  addHeading2('Step 3: Install PostgreSQL');
  addCode('sudo apt install postgresql postgresql-contrib -y');
  doc.moveDown(0.5);

  addHeading2('Step 4: Install Nginx');
  addCode('sudo apt install nginx -y');
  doc.moveDown(0.5);

  addHeading2('Step 5: Install PM2');
  addCode('sudo npm install -g pm2');
  doc.moveDown(0.5);

  addHeading2('Step 6: Install Build Tools');
  addCode('sudo apt install build-essential -y');
  doc.moveDown(1);

  addPageBreak();

  // 4. Database Installation
  addHeading1('4. Database Installation');
  
  addHeading2('Step 1: Create Database and User');
  addParagraph('Switch to postgres user and create database:');
  addCode('sudo -u postgres psql');
  doc.moveDown(0.3);
  addParagraph('Execute the following SQL commands:');
  addCode('CREATE DATABASE kinto_qa;');
  addCode('CREATE USER kinto_admin WITH ENCRYPTED PASSWORD \'YourStrongPassword123!\';');
  addCode('GRANT ALL PRIVILEGES ON DATABASE kinto_qa TO kinto_admin;');
  addCode('\\q');
  doc.moveDown(0.5);

  addHeading2('Step 2: Run Database Initialization Scripts');
  addParagraph('Navigate to the database folder and execute scripts in order:');
  addCode('cd /path/to/kinto-qa/database');
  addCode('psql -h localhost -U kinto_admin -d kinto_qa -f 01_init_schema.sql');
  addCode('psql -h localhost -U kinto_admin -d kinto_qa -f 02_seed_roles.sql');
  addCode('psql -h localhost -U kinto_admin -d kinto_qa -f 03_seed_admin_user.sql');
  doc.moveDown(0.5);

  addHeading2('Step 3: Verify Database Installation');
  addCode('psql -h localhost -U kinto_admin -d kinto_qa -c "SELECT * FROM roles;"');
  doc.moveDown(0.5);

  addHeading2('Step 4: Configure PostgreSQL for Production');
  addParagraph('Edit PostgreSQL configuration:');
  addCode('sudo nano /etc/postgresql/14/main/postgresql.conf');
  doc.moveDown(0.3);
  addParagraph('Update these settings:');
  addCode('shared_buffers = 256MB');
  addCode('effective_cache_size = 1GB');
  addCode('maintenance_work_mem = 64MB');
  addCode('work_mem = 16MB');
  addCode('max_connections = 100');
  doc.moveDown(0.3);
  addParagraph('Restart PostgreSQL:');
  addCode('sudo systemctl restart postgresql');
  addCode('sudo systemctl enable postgresql');

  addPageBreak();

  // 5. Application Deployment
  addHeading1('5. Application Deployment');
  
  addHeading2('Step 1: Create Application Directory');
  addCode('sudo mkdir -p /var/www/kinto-qa');
  addCode('sudo chown -R $USER:$USER /var/www/kinto-qa');
  doc.moveDown(0.5);

  addHeading2('Step 2: Copy Application Files');
  addParagraph('Upload your application files to /var/www/kinto-qa using SCP, SFTP, or Git.');
  doc.moveDown(0.5);

  addHeading2('Step 3: Install Dependencies');
  addCode('cd /var/www/kinto-qa');
  addCode('npm install --production');
  doc.moveDown(0.5);

  addHeading2('Step 4: Build Frontend');
  addCode('npm run build');
  doc.moveDown(0.5);

  addHeading2('Step 5: Create Environment File');
  addParagraph('Create .env file in /var/www/kinto-qa:');
  addCode('NODE_ENV=production');
  addCode('PORT=5000');
  addCode('');
  addCode('# Database Configuration');
  addCode('DATABASE_URL=postgresql://kinto_admin:YourPassword@localhost:5432/kinto_qa');
  addCode('PGHOST=localhost');
  addCode('PGPORT=5432');
  addCode('PGDATABASE=kinto_qa');
  addCode('PGUSER=kinto_admin');
  addCode('PGPASSWORD=YourPassword');
  addCode('');
  addCode('# Session Secret (32+ character random string)');
  addCode('SESSION_SECRET=your_long_random_secret');
  doc.moveDown(0.5);

  addHeading2('Step 6: Start Application with PM2');
  addCode('pm2 start server/index.js --name kinto-qa');
  addCode('pm2 save');
  addCode('pm2 startup');

  addPageBreak();

  // 6. Nginx Configuration
  addHeading1('6. Nginx Configuration');
  
  addHeading2('Step 1: Create Nginx Configuration File');
  addParagraph('Create /etc/nginx/sites-available/kinto-qa and configure as reverse proxy to port 5000.');
  doc.moveDown(0.5);

  addHeading2('Step 2: Enable Site');
  addCode('sudo ln -s /etc/nginx/sites-available/kinto-qa /etc/nginx/sites-enabled/');
  addCode('sudo nginx -t');
  addCode('sudo systemctl restart nginx');
  addCode('sudo systemctl enable nginx');
  doc.moveDown(1);

  // 7. SSL Certificate
  addHeading1('7. SSL Certificate Setup (Optional but Recommended)');
  addHeading2('Using Let\'s Encrypt for Free SSL:');
  addCode('sudo apt install certbot python3-certbot-nginx -y');
  addCode('sudo certbot --nginx -d yourdomain.com');
  doc.moveDown(1);

  addPageBreak();

  // 8. Security Configuration
  addHeading1('8. Security Configuration');
  
  addHeading2('Firewall Setup:');
  addCode('sudo ufw enable');
  addCode('sudo ufw allow 22/tcp');
  addCode('sudo ufw allow 80/tcp');
  addCode('sudo ufw allow 443/tcp');
  addCode('sudo ufw status');
  doc.moveDown(0.5);

  addHeading2('Security Checklist:');
  doc.fontSize(11).font('Helvetica-Bold').text('☑ Change default admin password immediately');
  doc.font('Helvetica-Bold').text('☑ Use strong database passwords');
  doc.font('Helvetica-Bold').text('☑ Enable HTTPS/SSL certificates');
  doc.font('Helvetica-Bold').text('☑ Configure firewall rules');
  doc.font('Helvetica-Bold').text('☑ Keep system and packages updated');
  doc.font('Helvetica-Bold').text('☑ Monitor application logs regularly');
  doc.font('Helvetica-Bold').text('☑ Implement automated backups');
  doc.moveDown(1);

  // 9. Backup Strategy
  addHeading1('9. Backup Strategy');
  
  addHeading2('Database Backup:');
  addCode('pg_dump -U kinto_admin kinto_qa > backup.sql');
  doc.moveDown(0.5);

  addHeading2('Automated Daily Backups:');
  addParagraph('Create backup script and add to crontab:');
  addCode('sudo crontab -e');
  doc.moveDown(0.3);
  addParagraph('Add daily backup at 2 AM:');
  addCode('0 2 * * * /usr/local/bin/backup-kinto-qa.sh');
  doc.moveDown(1);

  addPageBreak();

  // 10. Monitoring & Maintenance
  addHeading1('10. Monitoring & Maintenance');
  
  addHeading2('Essential Monitoring Commands:');
  addCode('pm2 logs kinto-qa          # View application logs');
  addCode('pm2 monit                  # Monitor processes');
  addCode('sudo systemctl status nginx');
  addCode('sudo systemctl status postgresql');
  addCode('df -h                      # Check disk usage');
  addCode('free -h                    # Check memory usage');
  doc.moveDown(0.5);

  addHeading2('Regular Maintenance Tasks:');
  addBullet('Monitor disk space and clean up old logs');
  addBullet('Review application logs for errors');
  addBullet('Verify automated backups are running');
  addBullet('Update system packages monthly');
  addBullet('Review and rotate SSL certificates');
  addBullet('Check database performance metrics');
  doc.moveDown(1);

  // 11. Troubleshooting
  addHeading1('11. Troubleshooting');
  
  addHeading2('Application Won\'t Start:');
  addParagraph('Check PM2 logs for errors:');
  addCode('pm2 logs kinto-qa');
  doc.moveDown(0.5);

  addHeading2('Database Connection Issues:');
  addParagraph('Test database connection:');
  addCode('psql -h localhost -U kinto_admin -d kinto_qa');
  doc.moveDown(0.5);

  addHeading2('Nginx Errors:');
  addCode('sudo nginx -t');
  addCode('sudo tail -f /var/log/nginx/error.log');

  addPageBreak();

  // Appendix A
  addHeading1('Appendix A: Default Credentials');
  
  addHeading2('Default Admin Account');
  doc.fontSize(11).font('Helvetica-Bold').text('Username: ');
  doc.font('Helvetica').text('admin', { continued: false });
  doc.font('Helvetica-Bold').text('Password: ');
  doc.font('Helvetica').text('Admin@123', { continued: false });
  doc.font('Helvetica-Bold').text('Email: ');
  doc.font('Helvetica').text('admin@kinto.com', { continued: false });
  doc.moveDown(0.5);
  
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#dc2626')
    .text('⚠️ IMPORTANT: Change this password immediately after first login!');
  doc.moveDown(1);

  addHeading2('Database Credentials');
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#1a1a1a').text('Database: ');
  doc.font('Helvetica').text('kinto_qa', { continued: false });
  doc.font('Helvetica-Bold').text('User: ');
  doc.font('Helvetica').text('kinto_admin', { continued: false });
  doc.font('Helvetica-Bold').text('Password: ');
  doc.font('Helvetica').text('(Set during installation)', { continued: false });

  addPageBreak();

  // Appendix B
  addHeading1('Appendix B: Quick Command Reference');
  
  addHeading2('PM2 Commands:');
  addCode('pm2 start server/index.js --name kinto-qa    # Start');
  addCode('pm2 restart kinto-qa                         # Restart');
  addCode('pm2 stop kinto-qa                            # Stop');
  addCode('pm2 logs kinto-qa                            # Logs');
  addCode('pm2 monit                                    # Monitor');
  doc.moveDown(0.5);

  addHeading2('Nginx Commands:');
  addCode('sudo nginx -t                                # Test config');
  addCode('sudo systemctl restart nginx                 # Restart');
  addCode('sudo systemctl status nginx                  # Status');
  doc.moveDown(0.5);

  addHeading2('PostgreSQL Commands:');
  addCode('sudo systemctl status postgresql             # Status');
  addCode('sudo -u postgres psql                        # Access');
  addCode('pg_dump -U kinto_admin kinto_qa > backup.sql # Backup');
  doc.moveDown(2);

  // Footer
  doc.fontSize(12).font('Helvetica').fillColor('#6b6b6b')
    .text('End of Document', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(10)
    .text('For technical support, refer to project documentation in /database/README.md', { align: 'center' });
  doc.text('or contact your system administrator.', { align: 'center' });

  doc.end();

  console.log('✅ PDF Deployment guide created successfully!');
  console.log(`📄 File location: ${outputPath}`);
  console.log(`📦 File name: KINTO_QA_Deployment_Guide.pdf`);
}

createDeploymentPDF();
