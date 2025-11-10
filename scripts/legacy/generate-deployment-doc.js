import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createDeploymentDocument() {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          // Title
          new Paragraph({
            text: "KINTO QA Management System",
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          }),
          new Paragraph({
            text: "On-Premise Deployment Guide",
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          new Paragraph({
            text: "Version 1.0 | November 2025",
            alignment: AlignmentType.CENTER,
            spacing: { after: 600 },
          }),

          // Table of Contents
          new Paragraph({
            text: "Table of Contents",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({ text: "1. System Overview" }),
          new Paragraph({ text: "2. System Requirements" }),
          new Paragraph({ text: "3. Server Setup" }),
          new Paragraph({ text: "4. Database Installation" }),
          new Paragraph({ text: "5. Application Deployment" }),
          new Paragraph({ text: "6. Nginx Configuration" }),
          new Paragraph({ text: "7. SSL Certificate Setup" }),
          new Paragraph({ text: "8. Security Configuration" }),
          new Paragraph({ text: "9. Backup Strategy" }),
          new Paragraph({ text: "10. Monitoring & Maintenance" }),
          new Paragraph({ text: "11. Troubleshooting" }),
          new Paragraph({ text: "Appendix A: Default Credentials" }),
          new Paragraph({ text: "Appendix B: Quick Command Reference", spacing: { after: 600 } }),

          // 1. System Overview
          new Paragraph({
            text: "1. System Overview",
            heading: HeadingLevel.HEADING_1,
            pageBreakBefore: true,
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            text: "The KINTO QA Management System is a comprehensive manufacturing quality assurance platform designed for on-premise deployment. This system provides:",
            spacing: { after: 200 },
          }),
          new Paragraph({ text: "• Email/password authentication with role-based access control" }),
          new Paragraph({ text: "• Dynamic role management (Admin, Operator, Reviewer, Manager)" }),
          new Paragraph({ text: "• Checklist builder and execution" }),
          new Paragraph({ text: "• Preventive maintenance tracking" }),
          new Paragraph({ text: "• Spare parts management" }),
          new Paragraph({ text: "• Purchase order generation" }),
          new Paragraph({ text: "• PDF export capabilities" }),
          new Paragraph({ text: "• Mobile-responsive Progressive Web App interface", spacing: { after: 200 } }),

          // 2. System Requirements
          new Paragraph({
            text: "2. System Requirements",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            text: "Minimum Hardware Requirements:",
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 100 },
          }),
          new Paragraph({ text: "• Operating System: Ubuntu 20.04 LTS or higher (or equivalent Linux distribution)" }),
          new Paragraph({ text: "• CPU: 2 cores minimum (4 cores recommended)" }),
          new Paragraph({ text: "• RAM: 4 GB minimum (8 GB recommended)" }),
          new Paragraph({ text: "• Storage: 50 GB minimum (100 GB recommended)" }),
          new Paragraph({ text: "• Network: Static IP address for production access", spacing: { after: 200 } }),
          
          new Paragraph({
            text: "Software Requirements:",
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 100 },
          }),
          new Paragraph({ text: "• Node.js 20.x LTS" }),
          new Paragraph({ text: "• PostgreSQL 14 or higher" }),
          new Paragraph({ text: "• Nginx (reverse proxy)" }),
          new Paragraph({ text: "• PM2 (process manager)" }),
          new Paragraph({ text: "• Git (for code deployment)", spacing: { after: 200 } }),

          // 3. Server Setup
          new Paragraph({
            text: "3. Server Setup",
            heading: HeadingLevel.HEADING_1,
            pageBreakBefore: true,
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            text: "Step 1: Update System",
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "sudo apt update && sudo apt upgrade -y", font: "Courier New" })],
            spacing: { after: 200 },
          }),

          new Paragraph({
            text: "Step 2: Install Node.js 20 LTS",
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -", font: "Courier New" })],
          }),
          new Paragraph({
            children: [new TextRun({ text: "sudo apt install -y nodejs", font: "Courier New" })],
            spacing: { after: 200 },
          }),

          new Paragraph({
            text: "Step 3: Install PostgreSQL",
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "sudo apt install postgresql postgresql-contrib -y", font: "Courier New" })],
            spacing: { after: 200 },
          }),

          new Paragraph({
            text: "Step 4: Install Nginx",
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "sudo apt install nginx -y", font: "Courier New" })],
            spacing: { after: 200 },
          }),

          new Paragraph({
            text: "Step 5: Install PM2",
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "sudo npm install -g pm2", font: "Courier New" })],
            spacing: { after: 200 },
          }),

          new Paragraph({
            text: "Step 6: Install Build Tools",
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "sudo apt install build-essential -y", font: "Courier New" })],
            spacing: { after: 200 },
          }),

          // 4. Database Installation
          new Paragraph({
            text: "4. Database Installation",
            heading: HeadingLevel.HEADING_1,
            pageBreakBefore: true,
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            text: "Step 1: Create Database and User",
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 100 },
          }),
          new Paragraph({ text: "Switch to postgres user and create database:", spacing: { after: 100 } }),
          new Paragraph({
            children: [new TextRun({ text: "sudo -u postgres psql", font: "Courier New" })],
            spacing: { after: 100 },
          }),
          new Paragraph({ text: "Execute the following SQL commands:", spacing: { after: 100 } }),
          new Paragraph({
            children: [new TextRun({ text: "CREATE DATABASE kinto_qa;", font: "Courier New" })],
          }),
          new Paragraph({
            children: [new TextRun({ text: "CREATE USER kinto_admin WITH ENCRYPTED PASSWORD 'YourStrongPassword123!';", font: "Courier New" })],
          }),
          new Paragraph({
            children: [new TextRun({ text: "GRANT ALL PRIVILEGES ON DATABASE kinto_qa TO kinto_admin;", font: "Courier New" })],
          }),
          new Paragraph({
            children: [new TextRun({ text: "\\q", font: "Courier New" })],
            spacing: { after: 200 },
          }),

          new Paragraph({
            text: "Step 2: Run Database Initialization Scripts",
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 100 },
          }),
          new Paragraph({ text: "Navigate to the database folder and execute scripts in order:", spacing: { after: 100 } }),
          new Paragraph({
            children: [new TextRun({ text: "cd /path/to/kinto-qa/database", font: "Courier New" })],
          }),
          new Paragraph({
            children: [new TextRun({ text: "psql -h localhost -U kinto_admin -d kinto_qa -f 01_init_schema.sql", font: "Courier New" })],
          }),
          new Paragraph({
            children: [new TextRun({ text: "psql -h localhost -U kinto_admin -d kinto_qa -f 02_seed_roles.sql", font: "Courier New" })],
          }),
          new Paragraph({
            children: [new TextRun({ text: "psql -h localhost -U kinto_admin -d kinto_qa -f 03_seed_admin_user.sql", font: "Courier New" })],
            spacing: { after: 200 },
          }),

          new Paragraph({
            text: "Step 3: Verify Database Installation",
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [new TextRun({ text: 'psql -h localhost -U kinto_admin -d kinto_qa -c "SELECT * FROM roles;"', font: "Courier New" })],
            spacing: { after: 200 },
          }),

          new Paragraph({
            text: "Step 4: Configure PostgreSQL for Production",
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 100 },
          }),
          new Paragraph({ text: "Edit PostgreSQL configuration:", spacing: { after: 100 } }),
          new Paragraph({
            children: [new TextRun({ text: "sudo nano /etc/postgresql/14/main/postgresql.conf", font: "Courier New" })],
            spacing: { after: 100 },
          }),
          new Paragraph({ text: "Update these settings:", spacing: { after: 100 } }),
          new Paragraph({
            children: [new TextRun({ text: "shared_buffers = 256MB", font: "Courier New" })],
          }),
          new Paragraph({
            children: [new TextRun({ text: "effective_cache_size = 1GB", font: "Courier New" })],
          }),
          new Paragraph({
            children: [new TextRun({ text: "maintenance_work_mem = 64MB", font: "Courier New" })],
          }),
          new Paragraph({
            children: [new TextRun({ text: "work_mem = 16MB", font: "Courier New" })],
          }),
          new Paragraph({
            children: [new TextRun({ text: "max_connections = 100", font: "Courier New" })],
            spacing: { after: 100 },
          }),
          new Paragraph({ text: "Restart PostgreSQL:", spacing: { after: 100 } }),
          new Paragraph({
            children: [new TextRun({ text: "sudo systemctl restart postgresql", font: "Courier New" })],
          }),
          new Paragraph({
            children: [new TextRun({ text: "sudo systemctl enable postgresql", font: "Courier New" })],
            spacing: { after: 200 },
          }),

          // 5. Application Deployment
          new Paragraph({
            text: "5. Application Deployment",
            heading: HeadingLevel.HEADING_1,
            pageBreakBefore: true,
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            text: "Step 1: Create Application Directory",
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "sudo mkdir -p /var/www/kinto-qa", font: "Courier New" })],
          }),
          new Paragraph({
            children: [new TextRun({ text: "sudo chown -R $USER:$USER /var/www/kinto-qa", font: "Courier New" })],
            spacing: { after: 200 },
          }),

          new Paragraph({
            text: "Step 2: Copy Application Files",
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 100 },
          }),
          new Paragraph({ text: "Upload your application files to /var/www/kinto-qa using SCP, SFTP, or Git.", spacing: { after: 200 } }),

          new Paragraph({
            text: "Step 3: Install Dependencies",
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "cd /var/www/kinto-qa", font: "Courier New" })],
          }),
          new Paragraph({
            children: [new TextRun({ text: "npm install --production", font: "Courier New" })],
            spacing: { after: 200 },
          }),

          new Paragraph({
            text: "Step 4: Build Frontend",
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "npm run build", font: "Courier New" })],
            spacing: { after: 200 },
          }),

          new Paragraph({
            text: "Step 5: Create Environment File",
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 100 },
          }),
          new Paragraph({ text: "Create .env file in /var/www/kinto-qa with the following content:", spacing: { after: 100 } }),
          new Paragraph({
            children: [new TextRun({ text: "NODE_ENV=production", font: "Courier New" })],
          }),
          new Paragraph({
            children: [new TextRun({ text: "PORT=5000", font: "Courier New" })],
          }),
          new Paragraph({
            children: [new TextRun({ text: "", font: "Courier New" })],
          }),
          new Paragraph({
            children: [new TextRun({ text: "# Database Configuration", font: "Courier New" })],
          }),
          new Paragraph({
            children: [new TextRun({ text: "DATABASE_URL=postgresql://kinto_admin:YourPassword@localhost:5432/kinto_qa", font: "Courier New" })],
          }),
          new Paragraph({
            children: [new TextRun({ text: "PGHOST=localhost", font: "Courier New" })],
          }),
          new Paragraph({
            children: [new TextRun({ text: "PGPORT=5432", font: "Courier New" })],
          }),
          new Paragraph({
            children: [new TextRun({ text: "PGDATABASE=kinto_qa", font: "Courier New" })],
          }),
          new Paragraph({
            children: [new TextRun({ text: "PGUSER=kinto_admin", font: "Courier New" })],
          }),
          new Paragraph({
            children: [new TextRun({ text: "PGPASSWORD=YourPassword", font: "Courier New" })],
          }),
          new Paragraph({
            children: [new TextRun({ text: "", font: "Courier New" })],
          }),
          new Paragraph({
            children: [new TextRun({ text: "# Session Secret (32+ character random string)", font: "Courier New" })],
          }),
          new Paragraph({
            children: [new TextRun({ text: "SESSION_SECRET=your_long_random_secret", font: "Courier New" })],
            spacing: { after: 200 },
          }),

          new Paragraph({
            text: "Step 6: Start Application with PM2",
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "pm2 start server/index.js --name kinto-qa", font: "Courier New" })],
          }),
          new Paragraph({
            children: [new TextRun({ text: "pm2 save", font: "Courier New" })],
          }),
          new Paragraph({
            children: [new TextRun({ text: "pm2 startup", font: "Courier New" })],
            spacing: { after: 200 },
          }),

          // 6. Nginx Configuration
          new Paragraph({
            text: "6. Nginx Configuration",
            heading: HeadingLevel.HEADING_1,
            pageBreakBefore: true,
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            text: "Step 1: Create Nginx Configuration File",
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 100 },
          }),
          new Paragraph({ text: "Create /etc/nginx/sites-available/kinto-qa and configure as reverse proxy to port 5000.", spacing: { after: 200 } }),

          new Paragraph({
            text: "Step 2: Enable Site",
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "sudo ln -s /etc/nginx/sites-available/kinto-qa /etc/nginx/sites-enabled/", font: "Courier New" })],
          }),
          new Paragraph({
            children: [new TextRun({ text: "sudo nginx -t", font: "Courier New" })],
          }),
          new Paragraph({
            children: [new TextRun({ text: "sudo systemctl restart nginx", font: "Courier New" })],
          }),
          new Paragraph({
            children: [new TextRun({ text: "sudo systemctl enable nginx", font: "Courier New" })],
            spacing: { after: 200 },
          }),

          // 7. SSL Certificate
          new Paragraph({
            text: "7. SSL Certificate Setup (Optional but Recommended)",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            text: "Using Let's Encrypt for Free SSL:",
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "sudo apt install certbot python3-certbot-nginx -y", font: "Courier New" })],
          }),
          new Paragraph({
            children: [new TextRun({ text: "sudo certbot --nginx -d yourdomain.com", font: "Courier New" })],
            spacing: { after: 200 },
          }),

          // 8. Security Configuration
          new Paragraph({
            text: "8. Security Configuration",
            heading: HeadingLevel.HEADING_1,
            pageBreakBefore: true,
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            text: "Firewall Setup:",
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "sudo ufw enable", font: "Courier New" })],
          }),
          new Paragraph({
            children: [new TextRun({ text: "sudo ufw allow 22/tcp", font: "Courier New" })],
          }),
          new Paragraph({
            children: [new TextRun({ text: "sudo ufw allow 80/tcp", font: "Courier New" })],
          }),
          new Paragraph({
            children: [new TextRun({ text: "sudo ufw allow 443/tcp", font: "Courier New" })],
          }),
          new Paragraph({
            children: [new TextRun({ text: "sudo ufw status", font: "Courier New" })],
            spacing: { after: 200 },
          }),

          new Paragraph({
            text: "Security Checklist:",
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "☑ ", bold: true }),
              new TextRun({ text: "Change default admin password immediately" }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "☑ ", bold: true }),
              new TextRun({ text: "Use strong database passwords" }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "☑ ", bold: true }),
              new TextRun({ text: "Enable HTTPS/SSL certificates" }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "☑ ", bold: true }),
              new TextRun({ text: "Configure firewall rules" }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "☑ ", bold: true }),
              new TextRun({ text: "Keep system and packages updated" }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "☑ ", bold: true }),
              new TextRun({ text: "Monitor application logs regularly" }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "☑ ", bold: true }),
              new TextRun({ text: "Implement automated backups" }),
            ],
            spacing: { after: 200 },
          }),

          // 9. Backup Strategy
          new Paragraph({
            text: "9. Backup Strategy",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            text: "Database Backup:",
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "pg_dump -U kinto_admin kinto_qa > backup.sql", font: "Courier New" })],
            spacing: { after: 200 },
          }),

          new Paragraph({
            text: "Automated Daily Backups:",
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 100 },
          }),
          new Paragraph({ text: "Create backup script and add to crontab:", spacing: { after: 100 } }),
          new Paragraph({
            children: [new TextRun({ text: "sudo crontab -e", font: "Courier New" })],
          }),
          new Paragraph({ text: "Add daily backup at 2 AM:", spacing: { after: 100 } }),
          new Paragraph({
            children: [new TextRun({ text: "0 2 * * * /usr/local/bin/backup-kinto-qa.sh", font: "Courier New" })],
            spacing: { after: 200 },
          }),

          // 10. Monitoring & Maintenance
          new Paragraph({
            text: "10. Monitoring & Maintenance",
            heading: HeadingLevel.HEADING_1,
            pageBreakBefore: true,
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            text: "Essential Monitoring Commands:",
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "pm2 logs kinto-qa          # View application logs", font: "Courier New" })],
          }),
          new Paragraph({
            children: [new TextRun({ text: "pm2 monit                  # Monitor processes", font: "Courier New" })],
          }),
          new Paragraph({
            children: [new TextRun({ text: "sudo systemctl status nginx", font: "Courier New" })],
          }),
          new Paragraph({
            children: [new TextRun({ text: "sudo systemctl status postgresql", font: "Courier New" })],
          }),
          new Paragraph({
            children: [new TextRun({ text: "df -h                      # Check disk usage", font: "Courier New" })],
          }),
          new Paragraph({
            children: [new TextRun({ text: "free -h                    # Check memory usage", font: "Courier New" })],
            spacing: { after: 200 },
          }),

          new Paragraph({
            text: "Regular Maintenance Tasks:",
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 100 },
          }),
          new Paragraph({ text: "• Monitor disk space and clean up old logs" }),
          new Paragraph({ text: "• Review application logs for errors" }),
          new Paragraph({ text: "• Verify automated backups are running" }),
          new Paragraph({ text: "• Update system packages monthly" }),
          new Paragraph({ text: "• Review and rotate SSL certificates" }),
          new Paragraph({ text: "• Check database performance metrics", spacing: { after: 200 } }),

          // 11. Troubleshooting
          new Paragraph({
            text: "11. Troubleshooting",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            text: "Application Won't Start:",
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 100 },
          }),
          new Paragraph({ text: "Check PM2 logs for errors:", spacing: { after: 100 } }),
          new Paragraph({
            children: [new TextRun({ text: "pm2 logs kinto-qa", font: "Courier New" })],
            spacing: { after: 200 },
          }),

          new Paragraph({
            text: "Database Connection Issues:",
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 100 },
          }),
          new Paragraph({ text: "Test database connection:", spacing: { after: 100 } }),
          new Paragraph({
            children: [new TextRun({ text: "psql -h localhost -U kinto_admin -d kinto_qa", font: "Courier New" })],
            spacing: { after: 200 },
          }),

          new Paragraph({
            text: "Nginx Errors:",
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "sudo nginx -t", font: "Courier New" })],
          }),
          new Paragraph({
            children: [new TextRun({ text: "sudo tail -f /var/log/nginx/error.log", font: "Courier New" })],
            spacing: { after: 200 },
          }),

          // Appendix A
          new Paragraph({
            text: "Appendix A: Default Credentials",
            heading: HeadingLevel.HEADING_1,
            pageBreakBefore: true,
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            text: "Default Admin Account",
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Username: ", bold: true }),
              new TextRun({ text: "admin" }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Password: ", bold: true }),
              new TextRun({ text: "Admin@123" }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Email: ", bold: true }),
              new TextRun({ text: "admin@kinto.com" }),
            ],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "⚠️ IMPORTANT: ", bold: true, color: "FF0000" }),
              new TextRun({ text: "Change this password immediately after first login!" }),
            ],
            spacing: { after: 200 },
          }),

          new Paragraph({
            text: "Database Credentials",
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Database: ", bold: true }),
              new TextRun({ text: "kinto_qa" }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "User: ", bold: true }),
              new TextRun({ text: "kinto_admin" }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Password: ", bold: true }),
              new TextRun({ text: "(Set during installation)" }),
            ],
            spacing: { after: 200 },
          }),

          // Appendix B
          new Paragraph({
            text: "Appendix B: Quick Command Reference",
            heading: HeadingLevel.HEADING_1,
            pageBreakBefore: true,
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            text: "PM2 Commands:",
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "pm2 start server/index.js --name kinto-qa    # Start", font: "Courier New" })],
          }),
          new Paragraph({
            children: [new TextRun({ text: "pm2 restart kinto-qa                         # Restart", font: "Courier New" })],
          }),
          new Paragraph({
            children: [new TextRun({ text: "pm2 stop kinto-qa                            # Stop", font: "Courier New" })],
          }),
          new Paragraph({
            children: [new TextRun({ text: "pm2 logs kinto-qa                            # Logs", font: "Courier New" })],
          }),
          new Paragraph({
            children: [new TextRun({ text: "pm2 monit                                    # Monitor", font: "Courier New" })],
            spacing: { after: 200 },
          }),

          new Paragraph({
            text: "Nginx Commands:",
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "sudo nginx -t                                # Test config", font: "Courier New" })],
          }),
          new Paragraph({
            children: [new TextRun({ text: "sudo systemctl restart nginx                 # Restart", font: "Courier New" })],
          }),
          new Paragraph({
            children: [new TextRun({ text: "sudo systemctl status nginx                  # Status", font: "Courier New" })],
            spacing: { after: 200 },
          }),

          new Paragraph({
            text: "PostgreSQL Commands:",
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "sudo systemctl status postgresql             # Status", font: "Courier New" })],
          }),
          new Paragraph({
            children: [new TextRun({ text: "sudo -u postgres psql                        # Access", font: "Courier New" })],
          }),
          new Paragraph({
            children: [new TextRun({ text: "pg_dump -U kinto_admin kinto_qa > backup.sql # Backup", font: "Courier New" })],
            spacing: { after: 200 },
          }),

          // Footer
          new Paragraph({
            text: "End of Document",
            alignment: AlignmentType.CENTER,
            spacing: { before: 600 },
          }),
          new Paragraph({
            text: "For technical support, refer to project documentation in /database/README.md",
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            text: "or contact your system administrator.",
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          }),
        ],
      },
    ],
  });

  return doc;
}

// Generate and save the document
const doc = createDeploymentDocument();

Packer.toBuffer(doc).then((buffer) => {
  const outputPath = path.join(__dirname, "..", "KINTO_QA_Deployment_Guide.docx");
  fs.writeFileSync(outputPath, buffer);
  console.log(`✅ Deployment guide created successfully!`);
  console.log(`📄 File location: ${outputPath}`);
  console.log(`📦 File name: KINTO_QA_Deployment_Guide.docx`);
}).catch((error) => {
  console.error("❌ Error generating document:", error);
  process.exit(1);
});
