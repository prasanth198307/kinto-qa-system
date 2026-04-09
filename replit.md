# Kinto Smart Ops — Manufacturing ERP SaaS

## Overview
Kinto Smart Ops is a comprehensive SaaS ERP platform designed for Indian manufacturing companies. It manages core operations such as production, inventory, purchase orders, GST-compliant invoicing, gatepasses, quality assurance, preventive maintenance, and double-entry accounting. The platform provides MIS analytics and supports multi-tenancy with isolated data spaces for each company. A key feature is its two-way WhatsApp integration for machine startup and checklist management. The project's vision is to modernize Indian industrial operations through a cloud-based, subscription model.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend is built with React 18, TypeScript, Vite, Wouter, `shadcn/ui` (Radix UI), and Tailwind CSS ("New York" theme). It follows Material Design principles with a mobile-first approach. Key features include custom styling, a Vertical Sidebar for role-based navigation, dedicated detail pages, and form validation. The design emphasizes a sleek, space-efficient interface for data-dense industrial operations, using reduced spacing, compact typography, and accessible components.

### Technical Implementations
The backend uses Express.js with TypeScript and Node.js, leveraging Neon Serverless PostgreSQL and Drizzle ORM. It incorporates Email/Password Authentication with `scrypt` and `Passport.js`, and a Dynamic Role-Based Access Control (RBAC) system. The system supports multi-item issuance, a Header-Detail pattern for transactions, automatic inventory management, comprehensive vendor and role management, and a RESTful JSON API with structured error handling and audit logging. A crucial architectural decision is the use of `AsyncLocalStorage` for tenant data isolation, propagating `tenantId` automatically across async chains. Plan-based module gating is enforced both at the backend (via middleware) and frontend (via hooks) to control feature access based on subscription tiers. SaaS operational features include trial expiry enforcement, tenant status middleware, max user enforcement, and comprehensive company settings UI with data export. White-labeling capabilities allow tenants to customize branding. Super-admin features include tenant impersonation, deletion with audit logging, and demo tenant seeding.

### Feature Specifications
- **Core ERP Modules:** Production, inventory, purchase orders, sales orders, GST-compliant invoicing, gatepasses, quality/returns, accounting (COA, ledger, P&L, Balance Sheet), preventive maintenance, expenses, cash register, document management, and HR & Payroll.
- **HR & Payroll Module:** Full HR module with employee master (photo upload, document management for offer letters/appointment letters/ID proofs), department/designation/shift masters, attendance marking (monthly grid with bulk save), leave management (application, approval/rejection workflow, leave balances), payroll processing (auto-calculate PF/ESI/PT, gross/net salary based on attendance), printable payslips with amount-in-words. Routes: /hr/employees, /hr/attendance, /hr/leaves, /hr/payroll, /hr/masters. Backend: /api/hr/*. DB tables: 15 HR tables (hr_departments, hr_designations, hr_shifts, hr_leave_types, hr_holidays, hr_salary_components, hr_salary_structures, hr_employees, hr_employee_documents, hr_attendance, hr_leave_balances, hr_leave_applications, hr_payroll_runs, hr_payslips, hr_pt_slabs). Files: server/hr-routes.ts, shared/hr-schema.ts, client/src/pages/hr-*.tsx.
- **Reporting & Analytics:** Comprehensive printable reports, sales/overview dashboards, unified operational/GST reports, and a dedicated MIS module with executive KPI, production, inventory, sales, delivery, and cash register analytics.
- **Workflow Automation:** Automated WhatsApp/Email reminders for machine startup and missed checklists.
- **Interactive Systems:** WhatsApp interactive checklist system with Q&A and photo uploads.
- **Financial Management:** Pending payments tracking, credit notes, customer advances with multi-payment support, vendor debit notes, per-item discounts, payment evidence, and write-off systems.
- **Inventory & Production:** Raw material and product master systems with BOMs, BOM-driven production with variance analysis, and FIFO batch allocation.
- **Quality & Returns:** Sales returns and damage handling with a three-stage workflow, traceability, and batch preservation; direct finished goods scrap module.
- **Access Control:** Comprehensive role permissions management with granular screen and API-level enforcement.
- **Data Management:** Master data management (product category/type), advanced search/filter, Vyapaar data import, server-side and client-side pagination, and a document management system with versioning and alerts.
- **SaaS Specifics:** Multitenancy (isolated data, per-tenant seeding), plan-based module gating, trial management, user limits, and tenant-specific notification configuration.
- **File Upload Scoping:** All file uploads (documents, scrap-evidence, expenses, WhatsApp photos) are saved under `uploads/tenants/{tenantId}/{type}/`. Serving routes validate tenant ownership. Legacy flat-path routes exist for backward compatibility.
- **Razorpay Billing:** `server/billing.ts` handles order creation, payment verification, webhook processing, billing history, and manual upgrade requests. Frontend pricing page integrates Razorpay checkout.js with graceful fallback when keys are absent. Keys via `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` env vars.
- **Automated Backups:** `server/backup.ts` exports full tenant JSON to `uploads/tenants/{id}/backups/`. Daily cron runs at 2:00 AM (node-cron). Pre-deletion backups run automatically before any tenant data deletion; filename stored in `deletion_audit.export_url`. Max 30 rotated files per tenant. Super-admin can list and download backups via UI and trigger manual backups.

### System Design Choices
- **Authentication:** Username or email login.
- **Dispatch Workflow:** Invoice-first, tamper-proof state machine with backend validation, race condition prevention, and optional digital signatures.
- **Inventory Logic:** Inventory deduction on gatepass, varied raw material inventory modes, explicit finished goods approval, automatic returns on cancellation, and logical stock reservation.
- **WhatsApp Integration:** Colloki Flow API with Meta WhatsApp Business Cloud API fallback, AI-assisted response interpretation, and secure photo storage.
- **Build & Deployment:** Vite for frontend, `tsx` for Express development, `esbuild` for backend production, Drizzle Kit for schema management.
- **Environment:** Automatic Replit environment detection for cookie settings.

## External Dependencies

### Database
- Neon Serverless PostgreSQL

### Authentication
- Replit Auth (OpenID Connect)
- `openid-client`
- `passport`

### UI Libraries
- Radix UI
- Lucide React
- date-fns
- cmdk
- vaul
- shadcn/ui

### Form Management
- react-hook-form
- @hookform/resolvers
- zod
- drizzle-zod

### Development Tools
- TypeScript
- Vite
- esbuild
- Tailwind CSS
- class-variance-authority
- tailwind-merge

### Notification Services
- SendGrid (Email)
- Twilio (WhatsApp)

### QR Code Generation
- qrcode

### Other
- Wouter (Routing)
- TanStack Query (Server State Management)