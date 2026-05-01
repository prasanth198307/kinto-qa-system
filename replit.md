# SwachERP — Manufacturing ERP SaaS

## Overview
SwachERP is a comprehensive SaaS ERP platform for Indian manufacturing companies and beyond (industry-agnostic). It covers production, inventory, purchase orders, GST-compliant invoicing, gatepasses, quality assurance, preventive maintenance, double-entry accounting, HR & Payroll, CRM, and an Employee Self-Service (ESS) Portal. Additional enterprise features include: Expense Claims, Timesheets, Performance Appraisals, Recurring Invoices, Multi-location Warehouses & Stock Transfers, UOM Conversions, Serial/Lot Tracking, Project Management (with BOQ, milestones, P&L), Fixed Asset Register & Depreciation, Multi-currency with Exchange Rates, and Configurable Module Labels & Custom Fields. The platform provides MIS analytics, supports multi-tenancy with isolated data spaces, and features two-way WhatsApp integration.

### New Modules Added (Generic ERP Phases 1–5)
- **Phase 1:** Configurable Module Labels (rename any module), Custom Field Definitions (extend any entity) — accessible via Company Settings tabs
- **Phase 2:** Expense Claims (`/hr/expense-claims`), Recurring Invoice Schedules (`/recurring-invoices`)
- **Phase 3:** Multi-location Warehouses & Stock Transfers (`/warehouses`), UOM Conversions, Serial/Lot Register
- **Phase 4:** Project Management with BOQ, Milestones, Timesheets (`/projects`, `/hr/timesheets`)
- **Phase 5:** Fixed Asset Register + Depreciation (`/fixed-assets`), Performance Appraisal Cycles (`/hr/appraisals`), Multi-currency Management (`/currency-management`)

### New Backend Routes
- `server/warehouse-routes.ts` → `/api/inventory/*` (warehouses, stock-transfers, uom, serial)
- `server/project-routes.ts` → `/api/projects/*` (projects, boq, milestones, timesheets, P&L)
- `server/asset-routes.ts` → `/api/assets/*` (fixed-assets, recurring-invoices, currencies, exchange-rates)
- `server/hr-routes.ts` extended with expense-claims, timesheets, appraisal-cycles, appraisals, module-labels, custom-fields

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Technical Implementations
- **Backend:** Express.js with TypeScript and Node.js.
- **Database:** Neon Serverless PostgreSQL with Drizzle ORM.
- **Authentication:** Email/Password using `scrypt` and `Passport.js`.
- **Multi-tenancy:** Implemented using `AsyncLocalStorage` for automatic `tenantId` propagation.
- **Plan Gating:** Enforced on both backend (`plan-middleware.ts`) and frontend (`usePlanFeatures` hook). The DB is the single source of truth for `subscription_plans.modules`.
- **File Uploads:** Scoped to `uploads/tenants/{tenantId}/{type}/`.
- **Schema Management:** Raw SQL commands via `psql $DATABASE_URL` with scripts saved in `db_scripts/`.
- **Build Systems:** Vite for frontend, `tsx` (development) and `esbuild` (production) for backend.

### System Design Choices
- **UI/UX Standards:** Responsive design is critical. All layouts must use responsive breakpoints (e.g., `grid-cols-1 sm:grid-cols-2`), `flex-wrap` for toolbars, and `p-4 sm:p-6` for page padding. Dialogs and modals are designed with `max-h-[90dvh]` and `overflow-y-auto` for small screens. `user-scalable=no` is forbidden.
- **Navigation:** New pages must be registered in 8 specific locations across `client/src/App.tsx`, `server/plan-features.ts`, and `client/src/hooks/use-filtered-navigation.tsx` to ensure proper display, permissions, and plan-based filtering. `DASHBOARD_VALID_TABS` acts as a critical whitelist for URL parameters.
- **Authentication:** Supports username or email. Role names are compared case-insensitively.
- **Inventory:** Includes deduction on gatepass, FIFO batch allocation, and logical stock reservation.
- **Plan System:** The `subscription_plans` table in the DB is the single source of truth for plan module assignments, driving both sidebar navigation and API route enforcement. Custom plans are supported.
- **Database Changes:** `db:push` is blocked; all schema changes must use `psql $DATABASE_URL -c "..."` commands, with scripts saved in `db_scripts/`.
- **Role Permissions:** `can_view/can_create/can_edit/can_delete` are INTEGER (0/1), not boolean.
- **CORS Whitelisting:** Per-tenant CORS origin whitelisting is stored in `tenants.cors_origins text[]`. The dynamic CORS middleware in `server/index.ts` caches all origins with a 60-second TTL. Super-admins manage origins via `GET/PUT /api/admin/tenants/:id/cors-origins` and the "CORS Origins" option in the super-admin tenant dropdown menu. Replit/localhost origins are always allowed without being stored.

## External Dependencies
- **Database:** Neon Serverless PostgreSQL
- **UI Libraries:** Radix UI, Lucide React, shadcn/ui, date-fns, cmdk, vaul
- **Form Handling:** react-hook-form, @hookform/resolvers, zod, drizzle-zod
- **Routing:** Wouter
- **State Management:** TanStack Query v5
- **Styling:** Tailwind CSS, class-variance-authority, tailwind-merge
- **Notifications:** SendGrid (email), Twilio (WhatsApp)
- **Payment Gateway:** Razorpay
- **WhatsApp Integration:** Colloki Flow API, Meta Cloud API
- **Utilities:** qrcode, node-cron, passport, openid-client