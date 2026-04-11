# Kinto Smart Ops — Manufacturing ERP SaaS

## Overview
Kinto Smart Ops is a comprehensive SaaS ERP platform designed for Indian manufacturing companies. It streamlines core operations such as production, inventory, purchase orders, GST-compliant invoicing, gatepasses, quality assurance, preventive maintenance, and double-entry accounting. The platform includes MIS analytics, supports multi-tenancy with isolated data spaces, and features a two-way WhatsApp integration for machine startup and checklist management. The project's vision is to become the leading ERP solution in the Indian manufacturing sector, providing robust, scalable, and user-friendly tools to optimize operations and foster growth.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Technical Implementations
- **Backend:** Express.js with TypeScript and Node.js.
- **Database:** Neon Serverless PostgreSQL with Drizzle ORM.
- **Authentication:** Email/Password using `scrypt` and `Passport.js`.
- **Multi-tenancy:** Achieved using `AsyncLocalStorage` for automatic `tenantId` propagation.
- **Plan Gating:** Enforced on both backend (middleware) and frontend (`usePlanFeatures` hook).
- **File Uploads:** Scoped to `uploads/tenants/{tenantId}/{type}/`.
- **Schema Management:** Raw SQL commands via `db_scripts/`.
- **Frontend Build:** Vite.
- **Backend Build:** `tsx` for development, `esbuild` for production.

### Feature Specifications
- **Core ERP:** Production, inventory, purchase orders, sales orders, GST invoicing, gatepasses, quality control, returns, double-entry accounting (COA, ledger, P&L, Balance Sheet), preventive maintenance, expenses, cash register, document management.
- **CRM:** Lead Management with Kanban and table views, lead pipeline, lead capture forms, and status transitions.
- **HR & Payroll:** Employee master, department/designation/shift management, attendance, leave management with approval workflows and WhatsApp notifications, payroll processing with salary structure breakdown, TDS, PF/ESI auto-calculation, payslip generation and delivery, salary revision tracking, HR reports, exit management with Full & Final settlement, TDS & Compliance (investment declaration, tax summary, Form 16), and Recruitment.
- **ESS (Employee Self-Service) Portal:** Separate authenticated portal for employees to view payslips, attendance, leave, tax declarations, and profile, with self check-in/check-out functionality.
- **Reporting:** Customizable reports, sales dashboards, vendor analytics, and various MIS reports covering executive KPIs, production, inventory, sales, delivery, cash, and financial performance.
- **Role Permissions:** Granular access control across 73+ screens, with auto-seeding of default roles and support for multi-role users.

### System Design Choices
- **Authentication:** Supports username or email-based login.
- **Dispatch Workflow:** Invoice-first, tamper-proof state machine.
- **Inventory Logic:** Deduction on gatepass, FIFO batch allocation, and logical stock reservation.
- **UI/UX:** Utilizes Radix UI, Lucide React, shadcn/ui for components, and Tailwind CSS for styling.
- **Navigation:** Employs a `VerticalNavSidebar` supporting both tab-based and route-based navigation.
- **Role Management:** Role names are compared case-insensitively.
- **Page Wrappers:** Designed to maintain sidebar visibility during data loading.

## External Dependencies
- **Database:** Neon Serverless PostgreSQL
- **UI Frameworks:** Radix UI, Lucide React, shadcn/ui
- **Form Management:** react-hook-form, zod, drizzle-zod
- **Routing:** Wouter
- **State Management:** TanStack Query v5
- **Styling:** Tailwind CSS
- **Notifications:** SendGrid (email), Twilio (WhatsApp)
- **Payment Gateway:** Razorpay
- **Other:** Colloki Flow API, Meta Cloud API (WhatsApp), node-cron, passport, openid-client.