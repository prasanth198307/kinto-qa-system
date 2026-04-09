# Kinto Smart Ops — Manufacturing ERP SaaS

## Overview
Kinto Smart Ops is a comprehensive SaaS ERP platform for Indian manufacturing companies. It manages core operations like production, inventory, purchase orders, GST-compliant invoicing, gatepasses, quality assurance, preventive maintenance, and double-entry accounting. The platform provides MIS analytics and supports multi-tenancy with isolated data spaces. A key feature is its two-way WhatsApp integration for machine startup and checklist management, enhancing operational efficiency and real-time communication. The project aims to become the leading ERP solution in the Indian manufacturing sector, empowering businesses with robust, scalable, and user-friendly tools to optimize their operations and drive growth.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Technical Implementations
- **Backend:** Express.js with TypeScript and Node.js.
- **Database:** Neon Serverless PostgreSQL with Drizzle ORM.
- **Authentication:** Email/Password using `scrypt` and `Passport.js`.
- **Multi-tenancy:** Achieved using `AsyncLocalStorage` to propagate `tenantId` automatically.
- **Plan Gating:** Enforced on both backend (middleware) and frontend (`usePlanFeatures` hook).
- **File Uploads:** Scoped to `uploads/tenants/{tenantId}/{type}/`.
- **Schema Management:** Raw SQL commands for database changes, with scripts saved in `db_scripts/`.
- **Frontend Build:** Vite.
- **Backend Build:** `tsx` for development, `esbuild` for production.

### Feature Modules
- **Core ERP:** Production, inventory, purchase orders, sales orders, GST invoicing, gatepasses, quality control, returns, double-entry accounting (COA, ledger, P&L, Balance Sheet), preventive maintenance, expenses, cash register, document management.
- **HR & Payroll:** Employee master (5-tab form with personal, employment, contact/address, statutory/bank, family details), department/designation/shift masters, attendance management, leave management with approval workflows, payroll processing (PF/ESI/PT auto-calculation), printable payslips, salary revision/increment tracking, and HR reports (employee directory, attendance summary, payroll summary, leave balance, salary revisions).
- **Reporting:** Customizable reports, sales dashboards, vendor analytics, and various MIS reports covering executive KPIs, production, inventory, sales, delivery, cash, and financial performance.
- **WhatsApp Integration:** Utilizes Colloki Flow API with Meta Cloud API fallback for AI-assisted responses, checklist Q&A, and photo storage capabilities.
- **Billing:** Integrates with Razorpay for order creation and webhook processing.
- **Backups:** Automated daily cron jobs for database backups, including pre-deletion backups and a 30-file rotation policy, manageable via a super-admin UI.

### System Design Choices
- **Authentication:** Supports username or email-based login.
- **Dispatch Workflow:** Implements an invoice-first, tamper-proof state machine.
- **Inventory Logic:** Features deduction on gatepass, FIFO batch allocation, and logical stock reservation.
- **UI/UX:** Uses Radix UI, Lucide React, shadcn/ui for components, and Tailwind CSS for styling.
- **Navigation:** Employs `VerticalNavSidebar` with a `navSections` array, supporting both tab-based (in-dashboard) and route-based (dedicated page) navigation patterns. All new navigation items require explicit registration in `getAdminNavSections()`, `AdminDashboard`'s hardcoded navSections, `SCREEN_TO_PERMISSION_MAP`, and `VIEW_TO_MODULE_MAP`.
- **Role Management:** Role names are compared using `.toLowerCase()` for consistency across the system.
- **Page Wrappers:** Follow a specific pattern to ensure the sidebar remains visible during data loading, avoiding full-page spinners.

## External Dependencies
- **Database:** Neon Serverless PostgreSQL
- **UI Frameworks:** Radix UI, Lucide React, shadcn/ui, date-fns, cmdk, vaul
- **Form Management:** react-hook-form, @hookform/resolvers, zod, drizzle-zod
- **Routing:** Wouter
- **State Management:** TanStack Query v5
- **Styling:** Tailwind CSS, class-variance-authority, tailwind-merge
- **Notifications:** SendGrid (email), Twilio (WhatsApp)
- **Payment Gateway:** Razorpay
- **Other:** qrcode, node-cron, passport, openid-client, Colloki Flow API, Meta Cloud API (WhatsApp)