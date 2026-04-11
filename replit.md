# Kinto Smart Ops — Manufacturing ERP SaaS

## Overview
Kinto Smart Ops is a comprehensive SaaS ERP platform designed for Indian manufacturing companies. It streamlines core operations including production, inventory, purchase orders, GST-compliant invoicing, gatepasses, quality assurance, preventive maintenance, and double-entry accounting. The platform provides MIS analytics, supports multi-tenancy with isolated data spaces, and features a two-way WhatsApp integration for machine startup and checklist management. Key features include an invoice-first, tamper-proof dispatch workflow, FIFO batch allocation for inventory, and extensive reporting capabilities. The platform also offers granular role-based permissions, HR & Payroll, CRM, and an Employee Self-Service (ESS) Portal.

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