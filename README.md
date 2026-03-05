# KINTO Operations & QA Management System

Comprehensive manufacturing operations and quality management system for production environments.

**Status:** ✅ READY FOR ON-PREMISES DEPLOYMENT

---

## Quick Start

### For Deployment
1. **Read:** `docs/deployment/ON_PREM_DEPLOYMENT_CHECKLIST.md`
2. **Or:** `docs/deployment/KINTO_QA_Deployment_Guide.pdf` (PDF version)

### For Testing
- **Test Users:** `docs/testing/TEST_CREDENTIALS.md`
- **Test Status:** `docs/testing/TEST_STATUS_SUMMARY.md`

### For System Info
- **Architecture:** `replit.md`
- **User Guide:** `docs/guides/USER_MANUAL.md`

---


## Project Structure

```
kinto-app/
├── client/                 # Frontend (React + TypeScript)
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Application pages
│   │   └── lib/           # Utilities and helpers
│   └── public/            # Static assets
│
├── server/                 # Backend (Express + TypeScript)
│   ├── index.ts           # Server entry point
│   ├── routes.ts          # API routes
│   ├── storage.ts         # Database operations
│   ├── auth.ts            # Authentication
│   └── db.ts              # Database connection
│
├── shared/                 # Shared code (types, schemas)
│   └── schema.ts          # Database schema (Drizzle ORM)
│
├── docs/                   # 📚 All documentation
│   ├── deployment/        # Deployment guides
│   ├── testing/           # Test documentation
│   └── guides/            # User & system guides
│
├── scripts/                # Utility scripts
│   ├── create-test-users.ts
│   ├── generate-deployment-pdf.js
│   └── legacy/            # Old scripts
│
├── database_scripts/       # Database migrations & seeds
│   ├── 01_schema.sql
│   ├── 02_seed_data.sql
│   └── 03_test_users.sql
│
└── dist/                   # Production build output
    ├── public/            # Frontend build
    └── index.js           # Backend build
```

---

## Technology Stack

### Frontend
- React 18 + TypeScript
- Vite (build tool)
- TailwindCSS + shadcn/ui
- Wouter (routing)
- TanStack Query (data fetching)

### Backend
- Node.js + Express
- TypeScript
- Passport.js (authentication)
- Drizzle ORM (database)

### Database
- PostgreSQL 13+
- Session management
- Audit logging

---

## Development

### Install Dependencies
```bash
npm install
```

### Run Development Server
```bash
npm run dev
```
Application runs on: http://localhost:5000

### Build for Production
```bash
npm run build
```
Creates:
- `dist/public/` - Frontend static files
- `dist/index.js` - Backend server

### Database
```bash
# Push schema changes to database
npm run db:push

# Create test users
npx tsx scripts/create-test-users.ts
```

---

## Production Deployment

### Quick Deploy (5 minutes)
```bash
# 1. Install dependencies
npm install

# 2. Build application
npm run build

# 3. Set environment variables
echo "DATABASE_URL=postgresql://user:pass@localhost:5432/kinto_production" > .env
echo "SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")" >> .env

# 4. Initialize database
npm run db:push

# 5. Start application
npm start
```

### Full Deployment Guide
See: `docs/deployment/ON_PREM_DEPLOYMENT_CHECKLIST.md`

---

## Environment Variables

Create `.env` file:

```bash
# Required
DATABASE_URL=postgresql://username:password@localhost:5432/database
SESSION_SECRET=your-32-character-random-secret

# Optional (notifications)
SENDGRID_API_KEY=your-sendgrid-api-key
FROM_EMAIL=noreply@yourcompany.com
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890
```

---

## Key Features

- ✅ Invoice creation with GST compliance
- ✅ Gatepass generation and tracking
- ✅ 5-stage dispatch workflow
- ✅ Purchase order management
- ✅ Inventory management (FIFO)
- ✅ Checklist management with approvals
- ✅ Preventive maintenance tracking
- ✅ Role-based access control
- ✅ Comprehensive reporting
- ✅ Professional invoice templates
- ✅ Machine startup reminders
- ✅ Missed checklist notifications

---

## Documentation

All documentation is in the `docs/` folder:

### Deployment
- `docs/deployment/ON_PREM_DEPLOYMENT_CHECKLIST.md` - ⭐ Start here
- `docs/deployment/PRODUCTION_READINESS_REPORT.md` - Status report
- `docs/deployment/KINTO_QA_Deployment_Guide.pdf` - PDF guide

### Testing
- `docs/testing/TEST_CREDENTIALS.md` - Test users
- `docs/testing/TEST_STATUS_SUMMARY.md` - Test results
- `docs/testing/TEST_CASES.md` - All test cases

### Guides
- `docs/guides/USER_MANUAL.md` - User guide
- `docs/guides/SYSTEM_DESIGN.md` - System architecture

See: `docs/README.md` for complete documentation index.

---

## Scripts

### Create Test Users
```bash
npx tsx scripts/create-test-users.ts
```

Creates 4 test users:
- `admin` / `Admin@123` (Administrator)
- `manager_test` / `Test@123` (Manager)
- `operator_test` / `Test@123` (Operator)
- `reviewer_test` / `Test@123` (Reviewer)

### Generate Deployment PDF
```bash
node scripts/generate-deployment-pdf.js
```

### Reset Admin Password
```bash
npx tsx scripts/reset-admin-password.ts
```

---

## Security

⚠️ **Before Production Deployment:**

1. Change admin password from `Admin@123`
2. Delete test accounts (`manager_test`, `operator_test`, `reviewer_test`)
3. Generate secure `SESSION_SECRET` (32+ characters)
4. Configure firewall (allow only ports 80, 443, 22)
5. Enable HTTPS/SSL

---

## Support

- **Architecture:** `replit.md`
- **Documentation:** `docs/`
- **Scripts:** `scripts/`
- **Database:** `database_scripts/`

---

## Recent Updates (November 10, 2025)

- ✅ All TypeScript errors resolved
- ✅ Production build successful
- ✅ Standardized delete confirmations (AlertDialog)
- ✅ Reviewer dashboard implemented
- ✅ Self-deletion prevention added
- ✅ Documentation organized into `docs/` folder
- ✅ Project structure cleaned up

---

## License

MIT

---

**Ready for on-premises deployment. See `docs/deployment/ON_PREM_DEPLOYMENT_CHECKLIST.md` to get started.**
