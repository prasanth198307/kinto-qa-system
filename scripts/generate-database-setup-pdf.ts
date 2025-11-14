import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 50, bottom: 50, left: 50, right: 50 }
});

const outputPath = path.join(process.cwd(), 'KINTO_Database_Setup_Guide_MAC.pdf');
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

function addCode(text: string) {
  doc.fontSize(9).fillColor('#1e293b').font('Courier').text(text, { indent: 20 });
  doc.moveDown(0.2);
}

function addSeparator() {
  doc.moveDown(0.3);
  doc.strokeColor('#e5e7eb').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(0.5);
}

// Title Page
addTitle('KINTO Operations & QA');
addTitle('Database Setup Guide');
addTitle('for MAC');
doc.moveDown(1);
doc.fontSize(12).fillColor('#6b7280').text('PostgreSQL Installation & Migration', { align: 'center' });
doc.moveDown(0.5);
doc.fontSize(10).fillColor('#6b7280').text('Last Updated: November 14, 2025', { align: 'center' });
doc.moveDown(0.3);
doc.fontSize(10).fillColor('#16a34a').text('All 53 Tables • Production Ready', { align: 'center' });

doc.addPage();

// Database Schema Overview
addSubtitle('Database Schema Overview');
doc.moveDown(0.5);

addHeading('Total Tables: 53');
doc.moveDown(0.3);

addSubheading('Tables Distribution:');
addCheckmark('Baseline Schema: 31 tables (database_scripts/)');
addCheckmark('WhatsApp Integration: 1 table');
addCheckmark('Financial & Invoicing: 6 tables');
addCheckmark('Sales Returns & Credit Notes: 5 tables');
addCheckmark('Production Management: 5 tables');
addCheckmark('Configuration & Assignments: 5 tables');

doc.moveDown(0.5);
addSeparator();

// Baseline Schema Tables
addSubtitle('Baseline Schema (31 Tables)');
doc.moveDown(0.3);

addSubheading('Core System (4 tables):');
addCheckmark('sessions');
addCheckmark('roles');
addCheckmark('role_permissions');
addCheckmark('users');
doc.moveDown(0.3);

addSubheading('Machine Management (5 tables):');
addCheckmark('machine_types');
addCheckmark('machines');
addCheckmark('machine_spares');
addCheckmark('user_assignments');
addCheckmark('spare_parts_catalog');
doc.moveDown(0.3);

addSubheading('Quality & Checklists (4 tables):');
addCheckmark('checklist_templates');
addCheckmark('template_tasks');
addCheckmark('checklist_submissions');
addCheckmark('submission_tasks');
doc.moveDown(0.3);

addSubheading('Preventive Maintenance (6 tables):');
addCheckmark('maintenance_plans');
addCheckmark('pm_task_list_templates');
addCheckmark('pm_template_tasks');
addCheckmark('pm_executions');
addCheckmark('pm_execution_tasks');
addCheckmark('maintenance_history');
doc.moveDown(0.3);

addSubheading('Inventory & Materials (5 tables):');
addCheckmark('uom (Unit of Measurement)');
addCheckmark('products');
addCheckmark('raw_materials');
addCheckmark('raw_material_transactions');
addCheckmark('finished_goods');
doc.moveDown(0.3);

addSubheading('Vendors & Purchase (3 tables):');
addCheckmark('vendors');
addCheckmark('purchase_orders');
addCheckmark('required_spares');
doc.moveDown(0.3);

addSubheading('Issuance & Dispatch (4 tables):');
addCheckmark('raw_material_issuance');
addCheckmark('raw_material_issuance_items');
addCheckmark('gatepasses');
addCheckmark('gatepass_items');

doc.addPage();

// Incremental Migrations
addSubtitle('Incremental Migrations (22 Tables)');
doc.moveDown(0.3);

addSubheading('WhatsApp Integration (1 table):');
addCheckmark('partial_task_answers');
doc.moveDown(0.3);

addSubheading('Financial & Invoicing (6 tables):');
addCheckmark('banks');
addCheckmark('invoice_templates');
addCheckmark('terms_conditions');
addCheckmark('invoices');
addCheckmark('invoice_items');
addCheckmark('invoice_payments');
doc.moveDown(0.3);

addSubheading('Sales Returns & Credit Notes (5 tables):');
addCheckmark('sales_returns');
addCheckmark('sales_return_items');
addCheckmark('credit_notes');
addCheckmark('credit_note_items');
addCheckmark('manual_credit_note_requests');
doc.moveDown(0.3);

addSubheading('Production Management (5 tables):');
addCheckmark('raw_material_types');
addCheckmark('product_bom');
addCheckmark('production_entries');
addCheckmark('production_reconciliations');
addCheckmark('production_reconciliation_items');
doc.moveDown(0.3);

addSubheading('Configuration & Assignments (5 tables):');
addCheckmark('product_categories');
addCheckmark('product_types');
addCheckmark('notification_config');
addCheckmark('machine_startup_tasks');
addCheckmark('checklist_assignments');

doc.moveDown(0.5);
addSeparator();

// Verification Status
addSubtitle('Verification Status');
doc.moveDown(0.3);

doc.fontSize(11).fillColor('#16a34a').font('Helvetica-Bold');
doc.text('✓ Schema Completeness: ALL 53 TABLES PRESENT');
doc.text('✓ Missing Scripts: NONE');
doc.text('✓ Script Organization: PROPERLY ORGANIZED');
doc.text('✓ Foreign Key Dependencies: CORRECT ORDER');

doc.addPage();

// MAC Installation Instructions
addSubtitle('MAC Installation Instructions');
doc.moveDown(0.5);

addHeading('Prerequisites');
doc.moveDown(0.2);

addText('1. Install PostgreSQL (if not already installed):');
addCode('brew install postgresql@15');
addCode('brew services start postgresql@15');
doc.moveDown(0.3);

addText('2. Verify Installation:');
addCode('psql --version');
addText('Should show: psql (PostgreSQL) 15.x or higher');

doc.moveDown(0.5);
addSeparator();

addHeading('Step 1: Create Database');
doc.moveDown(0.2);

addCode('# Create database');
addCode('createdb kinto_qa');
doc.moveDown(0.2);
addCode('# Or using psql:');
addCode('psql postgres -c "CREATE DATABASE kinto_qa;"');

doc.moveDown(0.5);
addSeparator();

addHeading('Step 2: Execute Baseline Schema Scripts');
doc.moveDown(0.2);

addCode('# Navigate to project directory');
addCode('cd /path/to/your/project');
doc.moveDown(0.2);

addCode('# Execute baseline schema (creates 31 tables)');
addCode('psql -d kinto_qa -f database_scripts/01_schema.sql');
doc.moveDown(0.2);

addCode('# Insert seed data');
addCode('psql -d kinto_qa -f database_scripts/02_seed_data.sql');
doc.moveDown(0.2);

addCode('# Create performance indexes');
addCode('psql -d kinto_qa -f database_scripts/03_indexes.sql');
doc.moveDown(0.2);

addCode('# Create test users (optional)');
addCode('psql -d kinto_qa -f database_scripts/03_test_users.sql');

doc.moveDown(0.3);
addSubheading('Expected Output:');
addCheckmark('31 tables created');
addCheckmark('4 roles created (Admin, Manager, Operator, Reviewer)');
addCheckmark('1 admin user created (admin / Admin@123)');
addCheckmark('60+ permissions configured');
addCheckmark('8 units created (Kg, Ltr, Nos, Mtr, Pcs, Box, Carton, Set)');
addCheckmark('5 machine types created');
addCheckmark('40+ indexes created');

doc.addPage();

// Step 3: Execute Incremental Migrations
addHeading('Step 3: Execute Incremental Migrations');
doc.moveDown(0.2);

addText('Execute in this EXACT order:');
doc.moveDown(0.2);

addSubheading('1. Legacy migrations (chronological order):');
addCode('psql -d kinto_qa -f updated_dbscripts/20251106_163500_production_management.sql');
addCode('psql -d kinto_qa -f updated_dbscripts/20251107_020000_notification_config.sql');
addCode('psql -d kinto_qa -f updated_dbscripts/20251110_incremental_whatsapp_checklist.sql');
addCode('psql -d kinto_qa -f updated_dbscripts/20251111_add_photo_spare_parts_columns.sql');
doc.moveDown(0.3);

addSubheading('2. Complete schema migrations:');
addCode('psql -d kinto_qa -f updated_dbscripts/20251112_140000_financial_invoicing.sql');
addCode('psql -d kinto_qa -f updated_dbscripts/20251112_140001_sales_returns_credit_notes.sql');
addCode('psql -d kinto_qa -f updated_dbscripts/20251112_140002_production_management.sql');
addCode('psql -d kinto_qa -f updated_dbscripts/20251112_140003_configuration_assignments.sql');
doc.moveDown(0.3);

addSubheading('3. Recent patches:');
addCode('psql -d kinto_qa -f updated_dbscripts/20251112_150000_add_credit_notes_approved_by.sql');
addCode('psql -d kinto_qa -f updated_dbscripts/20251113_060000_product_category_type_display_order.sql');

doc.moveDown(0.3);
addSubheading('Expected Output:');
addCheckmark('22 additional tables created');
addCheckmark('Total: 53 tables in database');

doc.addPage();

// Step 4: Verify Installation
addHeading('Step 4: Verify Installation');
doc.moveDown(0.2);

addCode('# Count tables (should be 53)');
addCode('psql -d kinto_qa -c "SELECT COUNT(*) FROM information_schema.tables');
addCode('WHERE table_schema = \'public\';"');
doc.moveDown(0.3);

addCode('# List all tables');
addCode('psql -d kinto_qa -c "\\dt"');
doc.moveDown(0.3);

addCode('# Verify admin user exists');
addCode('psql -d kinto_qa -c "SELECT username, email, role_id');
addCode('FROM users WHERE username = \'admin\';"');

doc.moveDown(0.3);
addSubheading('Expected Results:');
addCheckmark('Table count: 53');
addCheckmark('Admin user: admin / admin@kinto.com');

doc.moveDown(0.5);
addSeparator();

// Default Credentials
addSubtitle('Default Credentials');
doc.moveDown(0.3);

addText('After installation, you can log in with:');
doc.moveDown(0.2);

addSubheading('Admin:');
addBullet('Username: admin');
addBullet('Password: Admin@123');
addBullet('Email: admin@kinto.com');
doc.moveDown(0.3);

addSubheading('Test Users (Optional):');
addBullet('Manager: manager_test / Test@123');
addBullet('Operator: operator_test / Test@123');
addBullet('Reviewer: reviewer_test / Test@123');

doc.moveDown(0.3);
doc.fontSize(10).fillColor('#dc2626').font('Helvetica-Bold');
doc.text('⚠ IMPORTANT: Change admin password immediately after first login!');

doc.addPage();

// Production Deployment Checklist
addSubtitle('Production Deployment Checklist');
doc.moveDown(0.3);

addText('Before deploying to production:');
doc.moveDown(0.2);

addCheckmark('Change admin password from Admin@123');
doc.moveDown(0.1);
addCheckmark('Delete test users:');
addCode('DELETE FROM users WHERE username IN');
addCode('(\'manager_test\', \'operator_test\', \'reviewer_test\');');
doc.moveDown(0.1);
addCheckmark('Review and adjust role permissions');
addCheckmark('Configure notification settings (Email/WhatsApp)');
addCheckmark('Backup database');
addCheckmark('Set production DATABASE_URL in environment');

doc.moveDown(0.5);
addSeparator();

// Environment Configuration
addSubtitle('Environment Configuration');
doc.moveDown(0.3);

addText('Create a .env file in your project root:');
doc.moveDown(0.2);

addCode('# Database Connection');
addCode('DATABASE_URL=postgresql://username:password@localhost:5432/kinto_qa');
doc.moveDown(0.2);
addCode('# Example for local development:');
addCode('DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/kinto_qa');
doc.moveDown(0.2);
addCode('# Session Secret');
addCode('SESSION_SECRET=your-super-secret-key-here-min-32-chars');

doc.addPage();

// Backup and Restore
addSubtitle('Backup and Restore');
doc.moveDown(0.3);

addHeading('Backup Database');
addCode('# Full backup (custom format)');
addCode('pg_dump -d kinto_qa -F c -f kinto_qa_backup_$(date +%Y%m%d).dump');
doc.moveDown(0.2);
addCode('# SQL format backup');
addCode('pg_dump -d kinto_qa > kinto_qa_backup_$(date +%Y%m%d).sql');

doc.moveDown(0.5);

addHeading('Restore Database');
addCode('# From custom format');
addCode('pg_restore -d kinto_qa kinto_qa_backup_20251114.dump');
doc.moveDown(0.2);
addCode('# From SQL format');
addCode('psql -d kinto_qa < kinto_qa_backup_20251114.sql');

doc.moveDown(0.5);
addSeparator();

// Troubleshooting
addSubtitle('Troubleshooting');
doc.moveDown(0.3);

addSubheading('Issue: "database does not exist"');
addCode('createdb kinto_qa');
doc.moveDown(0.3);

addSubheading('Issue: "permission denied"');
addCode('# Grant privileges to your user');
addCode('psql postgres -c "GRANT ALL PRIVILEGES ON DATABASE kinto_qa TO your_username;"');
doc.moveDown(0.3);

addSubheading('Issue: "table already exists"');
addText('Scripts use CREATE TABLE IF NOT EXISTS, so they\'re safe to re-run.');
addText('If you need to start fresh:');
addCode('dropdb kinto_qa');
addCode('createdb kinto_qa');
addCode('# Then re-run all scripts');
doc.moveDown(0.3);

addSubheading('Issue: "foreign key violation"');
addText('Ensure you execute scripts in the exact order specified in this guide.');

doc.addPage();

// Quick Verification Queries
addSubtitle('Quick Verification Queries');
doc.moveDown(0.3);

addCode('-- Count all tables (Expected: 53)');
addCode('SELECT COUNT(*) FROM information_schema.tables');
addCode('WHERE table_schema = \'public\';');
doc.moveDown(0.3);

addCode('-- List all tables');
addCode('SELECT table_name FROM information_schema.tables');
addCode('WHERE table_schema = \'public\' ORDER BY table_name;');
doc.moveDown(0.3);

addCode('-- Check roles (Expected: 4 roles)');
addCode('SELECT * FROM roles ORDER BY id;');
doc.moveDown(0.3);

addCode('-- Check users');
addCode('SELECT username, email, role_id FROM users;');
doc.moveDown(0.3);

addCode('-- Check permissions count (Expected: 60+)');
addCode('SELECT COUNT(*) FROM role_permissions;');

doc.moveDown(0.5);
addSeparator();

// Installation Checklist
addSubtitle('Installation Checklist');
doc.moveDown(0.3);

const checklistItems = [
  'PostgreSQL installed and running',
  'Database kinto_qa created',
  'Baseline schema executed (01_schema.sql)',
  'Seed data inserted (02_seed_data.sql)',
  'Indexes created (03_indexes.sql)',
  'Test users created (03_test_users.sql) - optional',
  'All 10 incremental migrations executed in order',
  'Total 53 tables verified',
  'Admin login tested',
  'Environment variables configured',
  'Database backup taken'
];

checklistItems.forEach(item => {
  doc.fontSize(10).fillColor('#4a4a4a').font('Helvetica').text('☐ ' + item, { indent: 20 });
  doc.moveDown(0.15);
});

doc.moveDown(0.5);

// Footer
doc.fontSize(10).fillColor('#6b7280').font('Helvetica');
doc.text('For support or questions, refer to your system administrator.', { align: 'center' });
doc.moveDown(0.3);
doc.fontSize(9).fillColor('#9ca3af');
doc.text('Document Version: 1.0', { align: 'center' });
doc.text('Last Verified: November 14, 2025', { align: 'center' });
doc.text('Status: Production Ready ✓', { align: 'center' });

// Finalize PDF
doc.end();

console.log(`✅ Database Setup PDF generated successfully: ${outputPath}`);
