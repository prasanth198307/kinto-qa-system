# Scripts Directory

This folder contains utility scripts for the KINTO application.

## Current Scripts

### Active Scripts
- **create-test-users.ts** - Creates test users in database (admin, manager, operator, reviewer)
- **generate-deployment-pdf.js** - Generates deployment guide PDF
- **reset-admin-password.ts** - Resets admin password (now in scripts/)
- **database_schema.sql** - Database schema export (now in scripts/)

### Legacy Scripts (`legacy/`)
Old PDF generation scripts moved to legacy folder:
- generate-deployment-doc.js
- generate-docs-pdfs.ts
- generate-macos-pdf.ts
- generate-mobile-guide-pdf.js
- generate-mobile-responsiveness-pdf.ts

---

## Usage

### Create Test Users
```bash
npx tsx scripts/create-test-users.ts
```

Creates 4 test users:
- admin / Admin@123
- manager_test / Test@123
- operator_test / Test@123
- reviewer_test / Test@123

### Generate Deployment PDF
```bash
node scripts/generate-deployment-pdf.js
```

Generates: `KINTO_QA_Deployment_Guide.pdf`

### Reset Admin Password
```bash
npx tsx scripts/reset-admin-password.ts
```

Resets admin password to: Admin@123

---

## Database Scripts

Database migration and seed scripts are in `/database_scripts/` folder.

See `/database_scripts/README.md` for details.

---

## Legacy Scripts

Old scripts have been moved to `scripts/legacy/` folder. These are kept for reference but are no longer actively used.
