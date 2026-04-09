# Kinto Smart Ops — Manufacturing ERP SaaS

## Overview
Kinto Smart Ops is a comprehensive SaaS ERP platform for Indian manufacturing companies, managing core operations like production, inventory, purchase orders, GST-compliant invoicing, and accounting. It provides MIS analytics, supports multi-tenancy with isolated data, and integrates two-way WhatsApp for machine startup and checklist management. The platform aims to modernize Indian industrial operations through a cloud-based, subscription model, offering a comprehensive suite of modules including HR & Payroll, Quality & Returns, and Preventive Maintenance.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend utilizes React 18, TypeScript, Vite, Wouter, `shadcn/ui` (Radix UI), and Tailwind CSS ("New York" theme). It follows Material Design principles with a mobile-first approach, emphasizing custom styling, a Vertical Sidebar for role-based navigation, dedicated detail pages, and form validation. The design prioritizes a sleek, space-efficient interface suitable for data-intensive industrial operations, using compact typography and accessible components.

### Technical Implementations
The backend is built with Express.js, TypeScript, and Node.js, leveraging Neon Serverless PostgreSQL and Drizzle ORM. It features Email/Password Authentication with `scrypt` and `Passport.js`, and a Dynamic Role-Based Access Control (RBAC) system. A critical architectural decision is the use of `AsyncLocalStorage` for tenant data isolation, propagating `tenantId` across async chains. Plan-based module gating is enforced at both backend and frontend levels. SaaS operational features include trial expiry enforcement, tenant status middleware, max user enforcement, comprehensive company settings, and white-labeling capabilities. Super-admin features include tenant impersonation, deletion with audit logging, and demo tenant seeding.

### Feature Specifications
- **Core ERP Modules:** Production, inventory, purchase orders, sales orders, GST-compliant invoicing, gatepasses, quality/returns, accounting (COA, ledger, P&L, Balance Sheet), preventive maintenance, expenses, cash register, document management, and HR & Payroll.
- **HR & Payroll Module:** Comprehensive employee master, department/designation/shift masters, attendance, leave management, payroll processing (PF/ESI/PT auto-calculation), and printable payslips.
- **Reporting & Analytics:** Printable reports, sales/overview dashboards, unified operational/GST reports, and MIS analytics across various departments.
- **Workflow Automation:** Automated WhatsApp/Email reminders for machine startup and missed checklists.
- **Interactive Systems:** WhatsApp interactive checklist system with Q&A and photo uploads.
- **Financial Management:** Pending payments tracking, credit notes, customer advances, vendor debit notes, per-item discounts, and payment evidence.
- **Inventory & Production:** Raw material and product master systems with BOMs, BOM-driven production with variance analysis, and FIFO batch allocation.
- **Quality & Returns:** Sales returns and damage handling with a three-stage workflow, traceability, and direct finished goods scrap module.
- **Access Control:** Granular screen and API-level role permissions management.
- **Data Management:** Master data management, advanced search/filter, Vyapaar data import, server-side/client-side pagination, and a document management system.
- **SaaS Specifics:** Multitenancy, plan-based module gating, trial management, user limits, and tenant-specific notification configuration.
- **File Upload Scoping:** All file uploads are scoped by `tenantId` for security.
- **Razorpay Billing:** Handles order creation, payment verification, webhook processing, billing history, and manual upgrade requests.
- **Automated Backups:** Daily cron-based JSON exports of tenant data, pre-deletion backups, and super-admin managed backup/restore.

### System Design Choices
- **Authentication:** Username or email login.
- **Dispatch Workflow:** Invoice-first, tamper-proof state machine with backend validation, race condition prevention, and optional digital signatures.
- **Inventory Logic:** Inventory deduction on gatepass, varied raw material inventory modes, explicit finished goods approval, automatic returns on cancellation, and logical stock reservation.
- **WhatsApp Integration:** Colloki Flow API with Meta WhatsApp Business Cloud API fallback, AI-assisted response interpretation, and secure photo storage.
- **Build & Deployment:** Vite for frontend, `tsx` for Express development, `esbuild` for backend production, Drizzle Kit for schema management.
- **Environment:** Automatic Replit environment detection for cookie settings.
- **Database Schema Changes:** Direct SQL commands via `psql` are used for schema changes, avoiding `db:push`.

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