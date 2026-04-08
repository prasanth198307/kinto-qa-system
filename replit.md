# Kinto Smart Ops — Manufacturing ERP SaaS

## Overview
Kinto Smart Ops is a comprehensive manufacturing ERP SaaS platform for Indian manufacturing companies. It manages production, inventory, purchase orders, invoicing (GST-compliant), gatepasses, quality assurance, preventive maintenance, double-entry accounting, and provides MIS analytics. The system is built for multi-tenancy (SaaS) with each company getting their own isolated data space. It supports two-way WhatsApp integration for machine startup and checklist management. The business vision is to modernize Indian industrial operations with a cloud-based, subscription SaaS model.

## SaaS Multitenancy Architecture (Phase 2 — COMPLETE)

### Phase 1 (Complete)
- **Tenants table:** `tenants` (id, name, slug, plan, status, trial_ends_at, max_users, billing info, is_super_admin)
- **Tenant isolation:** `tenant_id INTEGER DEFAULT 1` column added to all 94 business tables
- **Default tenant:** Tenant #1 = KINTO (enterprise/active) — all existing data
- **Two-step login:** `/company` page (slug entry) → `/auth` (username+password with tenant context)
- **Self-registration:** `/register-company` (creates tenant + admin user, 14-day trial)
- **Super-admin dashboard:** `/super-admin/tenants` — manage all company accounts
- **API routes:** GET /api/tenants/lookup/:slug, POST /api/tenants/register, GET/PATCH /api/admin/tenants
- **Session:** `tenantId` stored in session after login for downstream use

### Phase 3 (Complete) — Plan-Based Module Gating

- **Plan tiers:** `trial` → `basic` → `professional` → `enterprise` (each is a superset of previous)
- **Plan map** (`server/plan-features.ts`): Defines which module groups belong to each plan
  - **Trial:** Invoicing, Purchase Orders, Basic Inventory
  - **Basic:** + Gatepasses & Dispatch, Sales Orders
  - **Professional:** + Production & BOM, Quality/Returns, Accounting/COA/Ledger, MIS Analytics, Expenses & Cash Register, Documents
  - **Enterprise:** + WhatsApp/Checklists, Preventive Maintenance
- **Backend enforcement** (`server/plan-middleware.ts`): `planEnforcementMiddleware` intercepts API requests, matches path prefixes to ROUTE_PLAN_REQUIREMENTS, returns HTTP 403 with upgrade message if plan doesn't qualify
- **Session caching:** `tenantPlan` stored in session at login (alongside `tenantId`); old sessions fall back to DB lookup and auto-cache
- **Frontend gating** (`client/src/hooks/use-plan-features.ts`): `usePlanFeatures()` hook fetches allowed modules/navItems from `GET /api/tenant/features`
- **Nav filtering** (`client/src/hooks/use-filtered-navigation.tsx`): Plan filter applied first (removes locked nav sections), then role/permission filter applied on top
- **Super-admin bypass:** Users with `isSuperAdmin=true` skip all plan enforcement

### Phase 2 (Complete) — Tenant Data Isolation via AsyncLocalStorage
- **Mechanism:** `AsyncLocalStorage` in `server/tenant-context.ts` propagates `tenantId` automatically through all async chains without prop-drilling
- **`tc()` helper:** Exported from `server/tenant-context.ts` — generates `eq(table.tenantId, currentTenantId)` WHERE clause; silently returns `undefined` for system tables without `tenantId`
- **storage.ts:** 253 `tc()` injections into all business table WHERE clauses
- **routes.ts direct queries:** 225 `tc()` injections into all direct `db.*` calls that bypass storage layer
- **Unique constraint fixes:** `roles(name, tenant_id)` and `chart_of_accounts(code, tenant_id)` — composite per-tenant unique (dropped global unique constraints)
- **Per-tenant seeding** (`server/seed-tenant.ts`): On new tenant registration, automatically seeds:
  - 5 default roles: `admin`, `manager`, `accountsmanager`, `operator`, `reviewer`
  - 80-account Indian manufacturing COA (GST-compliant, 5-level hierarchy)
- **Registration flow:** Updated to call `seedNewTenant()` and assign new tenant's own admin role to first user

### Phase 4 (Complete) — SaaS Operational Features

- **Trial Expiry Enforcement** (`server/auth.ts`): Login auto-expires tenants past `trialEndsAt`; blocked tenants see clear messages; `tenantStatus` stored in session
- **Tenant Middleware** (`server/tenant-middleware.ts`): Blocks all API calls for suspended/expired tenants; allowlist for auth/info endpoints
- **Max Users Enforcement** (`server/routes.ts`): `POST /api/users` checks current user count vs `maxUsers`; returns 403 at limit
- **Company Settings UI** (`client/src/pages/tenant-settings.tsx`): Plan overview, module list, company info form, logo URL + brand color; accessible at `/company-settings`
- **Tenant Info API** (`GET /api/tenant/info`, `PATCH /api/tenant/settings`): Returns full tenant info + user count; allows admin to update contact/branding fields
- **White-Labeling** (`client/src/hooks/use-tenant-branding.ts`): Applies `primaryColor` as CSS HSL variable; `GlobalHeader.tsx` shows custom logo if `logoUrl` is set
- **Super-Admin Enhancements** (`client/src/pages/super-admin-tenants.tsx`): Fixed plan tiers (trial/basic/professional/enterprise); "Seed Demo Tenant" button
- **Demo Tenant Seed** (`server/seed-demo-tenant.ts`, `POST /api/admin/seed-demo`): Creates "Acme Precision Parts" (slug: acme-demo) with vendors, raw materials, products; Login: acme-admin / Demo@1234

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend utilizes React 18 with TypeScript, Vite, Wouter, `shadcn/ui` (Radix UI), and Tailwind CSS ("New York" theme, Material Design principles) with a mobile-first approach. It features custom styling, a Vertical Sidebar for role-based navigation, dedicated detail pages, and form validation. The UI prioritizes a sleek, space-efficient design suitable for data-dense industrial operations, incorporating reduced spacing, compact typography, and accessible components.

### Technical Implementations
The backend is an Express.js application built with TypeScript and Node.js, using Neon Serverless PostgreSQL managed via Drizzle ORM. It implements Email/Password Authentication with `scrypt` and `Passport.js`, and a Dynamic Role-Based Access Control (RBAC) system. The system supports multi-item issuance, a Header-Detail pattern for transactions, automatic inventory management, comprehensive vendor and role management, and a RESTful JSON API with structured error handling and audit logging.

### Feature Specifications
- **Comprehensive Reporting:** Generates printable, branded reports, sales/overview dashboards, and unified operational/GST reports.
- **Automated Reminders:** Machine Startup Reminders and Missed Checklist Notifications via WhatsApp and Email.
- **WhatsApp Interactive Checklist System:** Production-ready interactive Q&A for checklist completion with multi-format answers and secure photo downloads.
- **Invoice & Gatepass Management:** Enforces an Invoice-First Gatepass Flow, manages templates, includes enhanced forms with print preview, smart item entry, automatic UPI payment QR code generation, manual credit note creation, and cancel/reissue functionality.
- **Complete Dispatch Tracking Workflow:** A 5-stage workflow from Invoice Creation to Proof of Delivery with strict state machine enforcement and optional digital signature.
- **Comprehensive Role Permissions Management:** Granular access control across system screens with metadata-driven UI and API-level permission enforcement.
- **Raw Material & Product Master Systems:** Manages raw material definitions with conversion methods and loss percentages, and comprehensive product management with Bill of Materials (BOM).
- **BOM-Driven Production:** Intelligent material issuance based on BOMs and production entry with BOM variance analysis, supporting multi-BOM configurations.
- **FIFO Batch Allocation:** Automatic allocation of raw materials from oldest batches first.
- **Production Reconciliation & Analytics:** End-of-day reconciliation, detailed reports, and a Variance Analytics Dashboard.
- **Sales Returns & Damage Handling:** Manages post-delivery returns with a three-stage workflow including quality segregation, inventory reconciliation, intelligent credit note generation, split disposition, repacking queue, and scrap inventory with evidence upload. Features full traceability and batch preservation.
- **Direct Finished Goods Scrap Module:** Allows direct recording of scrap from approved finished goods stock with audit logging and financial entries.
- **Master Data Management:** Comprehensive CRUD for Product Category & Type.
- **Financial Tracking:** Pending Payments Tracking Dashboard, Credit Notes Viewing System, Customer Advances System with multi-payment method support, and transaction-safe application to invoices.
- **Vendor Debit Notes System:** Manual debit note creation against vendors for claims with multi-item entries, GST breakdown, and settlement tracking.
- **Admin Navigation & Vendor Classification:** Organized admin dashboard navigation and a three-tier vendor classification system with accurate revenue reporting.
- **Sales Order Module:** Pre-invoice document with status flow (draft → confirmed → invoiced/partially_invoiced/cancelled), supporting multiple invoices per SO and pre-filling invoice data.
- **Advance Payments (Prepayments) System:** Records customer payments not linked to specific invoices, trackable in dashboards and applicable to invoices.
- **Per-Item Discount System:** Supports per-line-item discounts on Invoices and Sales Orders in percentage or flat rupee amounts, with GST calculated on post-discount value.
- **Comprehensive Search & Filter System:** Advanced search and filtering across all major data screens.
- **Vyapaar Data Import System:** Excel-based data migration from Vyapaar accounting software with fuzzy matching, intelligent date conversion, and comprehensive error handling.
- **Payment Evidence System:** Two-stream payment architecture with an immutable ledger and linked payment records for audit.
- **Payment Write-Off System:** Admin-only functionality to write off outstanding invoice balances with transaction-based implementation and audit logging.
- **Comprehensive Pagination System:** Server-side and client-side pagination across modules with URL-based state management, filtering, and sorting.
- **Document Management System:** Stores and organizes contracts, invoices, certificates with file versioning, category management, linking capabilities, and automated expiry alerts.
- **Expense Tracking System:** Records daily expenses with voucher issuance, categorization, payment mode tracking, GST handling, and approval workflow.
- **Monthly Expenses Module:** Tracks recurring monthly bills with month navigator, paid/pending status, payment details, carry-forward functionality, summary cards, and quick mark-as-paid actions.
- **Daily Cash Register:** Tracks daily business cash flow with Excel import, balance tracking, mandatory reconciliation, variance tracking, instant expense voucher auto-generation, and reporting.
- **MIS (Management Information System) Module:** Comprehensive executive dashboard with analytics screens for Executive KPI, Production, Inventory, Sales, Delivery Performance, and Cash Register Analytics.
- **Double-Entry Accounting & Ledger Module:** Complete journal/accounting system with Chart of Accounts management, auto-generated journal entries for all financial transactions, and manual journal entry capability. Includes Financial Year support, Trial Balance, Profit & Loss Statement, and Balance Sheet.

### System Design Choices
- **Authentication:** Users can log in with username or email.
- **Dispatch Workflow:** Invoice-first, tamper-proof state machine with strict backend validation, race condition prevention, database transactions, and optional digital signature.
- **Inventory Management Logic:** Inventory deduction on gatepass creation, support for different raw material inventory modes, explicit quality approval for finished goods, automatic inventory returns on cancellation, and logical stock reservation.
- **Production Reconciliation Design:** `netConsumed` calculated dynamically, composite unique index for data integrity, and server-side enforced role-based edit limits.
- **WhatsApp Integration:** Uses Colloki Flow API with Meta WhatsApp Business Cloud API fallback for interactive checklist completion with AI-assisted response interpretation, secure photo storage, and transactional integrity.
- **Build & Deployment:** Uses Vite for frontend, `tsx` for Express development, and `esbuild` for backend production. Drizzle Kit manages database schema.
- **Environment Handling:** Automatically detects Replit environment for cross-origin cookie settings.

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