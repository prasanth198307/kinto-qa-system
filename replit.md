# Kinto Smart Ops — Manufacturing ERP SaaS

## Overview
Kinto Smart Ops is a comprehensive SaaS ERP platform designed for Indian manufacturing companies. It streamlines core operations including production, inventory, purchase orders, GST-compliant invoicing, gatepasses, quality assurance, preventive maintenance, and double-entry accounting. The platform provides MIS analytics, supports multi-tenancy with isolated data spaces, and features a two-way WhatsApp integration for machine startup and checklist management. The project's vision is to be the leading ERP solution in the Indian manufacturing sector, offering robust, scalable, and user-friendly tools to optimize operations and foster growth.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The platform utilizes Radix UI, Lucide React, and shadcn/ui for components, styled with Tailwind CSS, class-variance-authority, and tailwind-merge for a consistent and modern interface. Navigation is managed through a `VerticalNavSidebar` supporting both tab-based and route-based patterns. Page wrappers are designed to maintain sidebar visibility during data loading, avoiding full-page spinners.

### Technical Implementations
- **Backend:** Express.js with TypeScript and Node.js.
- **Database:** Neon Serverless PostgreSQL with Drizzle ORM.
- **Authentication:** Email/Password using `scrypt` and `Passport.js`.
- **Multi-tenancy:** Implemented using `AsyncLocalStorage` for automatic `tenantId` propagation.
- **Plan Gating:** Enforced on both backend (middleware) and frontend (`usePlanFeatures` hook).
- **File Uploads:** Scoped to `uploads/tenants/{tenantId}/{type}/`.
- **Schema Management:** Raw SQL commands via `psql $DATABASE_URL` with scripts saved in `db_scripts/`.
- **Build Systems:** Vite for frontend, `tsx` (development) and `esbuild` (production) for backend.

### Feature Specifications
The platform includes comprehensive modules for Core ERP (production, inventory, finance, maintenance), CRM (lead management with Kanban view), HR & Payroll (employee master, attendance, leave, payroll processing, TDS, recruitment), and an Employee Self-Service (ESS) Portal with distinct authentication. Key features include an invoice-first, tamper-proof dispatch workflow, FIFO batch allocation for inventory, and extensive reporting capabilities for various KPIs. Role-based permissions are granular, managed by registered screens and `endpointToScreenKey` mappings, supporting multi-role users with unioned permissions. Automated daily database backups are in place.

### System Design Choices
Authentication supports username or email. Inventory logic includes deduction on gatepass, FIFO batch allocation, and logical stock reservation. Role names are compared case-insensitively. Navigation items are consistently managed across multiple configurations (`App.tsx`, `plan-features.ts`, `use-filtered-navigation.tsx`) to ensure proper display and permission-based filtering. Critical UI navigation elements like `DASHBOARD_VALID_TABS` act as whitelists for URL parameters to prevent display issues.

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