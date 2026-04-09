# Kinto Smart Ops — Manufacturing ERP SaaS

## Overview
Kinto Smart Ops is a comprehensive SaaS ERP platform designed for Indian manufacturing companies. It manages core operations such as production, inventory, purchase orders, GST-compliant invoicing, gatepasses, quality assurance, preventive maintenance, and double-entry accounting. The platform provides MIS analytics and supports multi-tenancy with isolated data spaces for each company. A key feature is its two-way WhatsApp integration for machine startup and checklist management. The project's vision is to modernize Indian industrial operations through a cloud-based, subscription model.

## User Preferences
Preferred communication style: Simple, everyday language.

---

## CRITICAL: Sidebar Navigation Architecture (READ BEFORE BUILDING ANY NEW MODULE)

This is the most important section. Misunderstanding this causes hidden bugs where nav items disappear or pages don't load.

### How the Sidebar Works

The app uses `VerticalNavSidebar` with a `navSections` array of `NavSection` objects. Each section has `items: NavItem[]`. A `NavItem` can have either:

**Pattern A — Tab-based item (stays in same dashboard, no `onClick`):**
```ts
{ id: "production", label: "Production", icon: Factory }
// → sidebar calls navigate('/?tab=production'), parent's onNavigate('production') fires
// → parent does setActiveView('production') → renderContent() switch handles it inline
```

**Pattern B — Route-based item (navigates to a dedicated page, has `onClick`):**
```ts
{ id: "hr-employees", label: "Employees", icon: Users, onClick: () => setLocation('/hr/employees') }
// → sidebar calls item.onClick() ONLY — does NOT call onNavigate/onItemClick
// → setLocation routes to a full-page wrapper component like HREmployeesWrapper
```

**RULE: When `item.onClick` is defined, VerticalNavSidebar does NOT call `onItemClick` (the onNavigate prop).** This is by design to prevent double-navigation conflicts. The dedicated page component manages its own active state.

### Dashboard Components and Their Sidebar Sources

| Component | Nav Source | Plan Filtered? | Role Filtered? |
|---|---|---|---|
| `AdminDashboard` | Hardcoded `navSections` array inside the component | NO | NO (admin sees all) |
| `ManagerDashboard` | `getAdminNavSections(setLocation)` + `useFilteredNavigation` | YES | YES |
| `CustomRoleDashboard` | `getAdminNavSections(setLocation)` + `useFilteredNavigation` | YES | YES |
| `HREmployeesWrapper` etc. | `getAdminNavSections(setLocation)` + `useFilteredNavigation` | YES | YES |

**CRITICAL BUG TRAP — `AdminDashboard` is HARDCODED:**
`AdminDashboard` (rendered when `user.role === 'admin'`, lowercase, which is the role NAME not UUID) has its own hardcoded `navSections` array — it does NOT use `getAdminNavSections`. Therefore:
- **Every new module section MUST be manually added to both:**
  1. `getAdminNavSections()` function (used by Manager, Custom roles, HR wrappers)
  2. The hardcoded `navSections` inside `AdminDashboard` component
- New route-based items in `AdminDashboard.navSections` MUST include `onClick: () => setLocation('/your-route')`
- New tab-based items in `AdminDashboard.navSections` MUST be handled in `AdminDashboard.renderContent()` switch

### How `/api/user` Returns `role`
`server/auth.ts` line 678-680:
```ts
if (user.roleId) {
  const roleData = await storage.getRole(user.roleId);
  res.json({ ...user, role: roleData?.name, isDemo });
}
```
So `user.role` in the frontend is the **role name string** (e.g. `"Admin"`, `"Manager"`), NOT a UUID. Role routing in `App.tsx` uses `.toLowerCase()` to compare:
- `"admin"` → `AdminDashboard`
- `"manager"` → `ManagerDashboard`
- anything else → `CustomRoleDashboard`

### Adding a New Module — Checklist

When adding a new module (e.g. "Finance", "CRM"), do ALL of the following:

1. **Backend**: Add routes in a new `server/xxx-routes.ts`, register in `server/routes.ts`
2. **Schema**: Add tables in `shared/xxx-schema.ts`, run SQL via `psql $DATABASE_URL -c "..."` (NOT `db:push`)
3. **Frontend pages**: Create `client/src/pages/xxx-*.tsx` with a Wrapper component that uses `useFilteredNavigation`
4. **Register routes in `App.tsx`**: Add `<ProtectedRoute path="/xxx/..." component={XxxWrapper} />`
5. **Add to `getAdminNavSections()`**: Add the new section with `onClick` handlers pointing to routes
6. **Add to `AdminDashboard.navSections`**: Manually add the same section (this is what gets missed!)
7. **Plan gating**: Add the module key to `server/plan-features.ts` in the appropriate plan(s)
8. **Permissions**: Add permission entries to `SCREEN_TO_PERMISSION_MAP` and `VIEW_TO_MODULE_MAP` in `App.tsx`
9. **DB**: Insert permission rows for the new screens into `role_permissions` for all system roles

### `useFilteredNavigation` Hook
Located in `client/src/hooks/use-filtered-navigation.tsx`. It:
1. Gets `allNavSections` from caller
2. Filters by plan features (`allowedNavItems` from `usePlanFeatures`)
3. For system roles (`admin`, `manager`, `accountsmanager`) → returns ALL plan-allowed sections (no DB filter)
4. For custom roles → additionally filters by `dbPermissions` from `/api/my-permissions`

**Case sensitivity**: `SYSTEM_ROLES_FULL_ACCESS = ['admin', 'manager', 'accountsmanager']` must be compared with `.toLowerCase()` because `user.role` comes back as "Admin" (capital A from DB).

### `SCREEN_TO_PERMISSION_MAP` and `VIEW_TO_MODULE_MAP` (App.tsx ~line 1589)
Every new nav item ID must be mapped:
```ts
'hr-employees': 'hr_employees',   // SCREEN_TO_PERMISSION_MAP: nav id → permission screen name
'hr-employees': 'HR & Payroll',   // VIEW_TO_MODULE_MAP: nav id → sidebar section label
```
This controls plan-level sidebar filtering.

---

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
- **Database Schema Changes:** NEVER use `db:push`. Always run raw SQL via `psql $DATABASE_URL -c "ALTER TABLE..."` and save a matching script in `db_scripts/`. Changing ID column types (serial ↔ varchar) is forbidden.

### Known Tenants (Development)
| ID | Slug | Admin | Password | Plan |
|---|---|---|---|---|
| 1 | kinto | admin | admin123 | Enterprise |
| 4 | test-corp | admin | admin123 | Professional |
| 5 | alpha | admin | admin123 | Basic |
| 6 | kinto-admin | superadmin | superadmin123 | Super-Admin |
| 7 | acme-demo | admin | admin123 | Enterprise (Demo) |

Super-admin login: username=`superadmin`, password=`superadmin123`, slug=`kinto-admin`

### Session / Cookie Notes
- SameSite=None; Secure=true in Replit → cookies are blocked inside the Replit iframe
- Always use "Open in New Tab" when testing authenticated flows

---

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
