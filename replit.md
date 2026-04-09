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
- **CRM:** Lead Management module (`/crm/leads`) — Kanban board + table view, lead pipeline with 6 statuses (New/Contacted/Interested/Qualified/Lost/Converted), lead capture form (name, company, phone, email, source, product interest, assigned_to, follow-up date, notes), inline status transitions, stats summary cards. Available from Professional plan. DB: `crm_leads` table. Routes: `server/crm-routes.ts`.
- **HR & Payroll:** Employee master (5-tab form with personal, employment, contact/address, statutory/bank, family details), department/designation/shift masters, attendance management, leave management with approval workflows + WhatsApp notifications + monthly calendar view + year-end EL carry-forward, payroll processing with salary-structure component breakdown (Basic/HRA/DA/etc.), PT from state slabs, monthly TDS projection (Old/New regime), PF/ESI auto-calc, payroll lifecycle (Draft → Approved → Locked/Unlocked), payslip JSONB components, bulk WhatsApp/Email payslip delivery, bank transfer CSV download, single payslip WhatsApp send, printable payslips, salary revision/increment tracking, HR reports (employee directory, attendance summary, payroll summary, leave balance, salary revisions), exit management, F&F (Full & Final) settlement (auto-calculate pending salary, EL encashment, gratuity, notice recovery), TDS & Compliance (investment declaration form with 80C/80D/HRA tabs, annual tax summary, Form 16 Part A+B), Recruitment (job openings with pipeline kanban view, candidate applications, stage tracking).
- **ESS (Employee Self-Service) Portal:** Separate authenticated portal at `/ess` (public login) and `/ess/portal` (dashboard). Uses its own session keys (`essEmployeeId`, `essTenantId`) separate from admin session. Login: company slug + emp_code + password. Tabs: Home (summary cards), Pay Slips (view/print), Attendance (monthly), Leave (balance + apply), Tax Declaration (80C/80D/HRA/Other), Profile. Admin enables ESS for employees via "Set ESS Password" button (key icon) in employee list — calls `POST /api/ess/admin/set-password`. DB columns: `ess_password VARCHAR(200)` and `ess_enabled BOOLEAN` on `hr_employees`.
- **Reporting:** Customizable reports, sales dashboards, vendor analytics, and various MIS reports covering executive KPIs, production, inventory, sales, delivery, cash, and financial performance.
- **WhatsApp Integration:** Utilizes Colloki Flow API with Meta Cloud API fallback for AI-assisted responses, checklist Q&A, and photo storage capabilities.
- **Billing:** Integrates with Razorpay for order creation and webhook processing.
- **Backups:** Automated daily cron jobs for database backups, including pre-deletion backups and a 30-file rotation policy, manageable via a super-admin UI.

### System Design Choices
- **Authentication:** Supports username or email-based login.
- **Dispatch Workflow:** Implements an invoice-first, tamper-proof state machine.
- **Inventory Logic:** Features deduction on gatepass, FIFO batch allocation, and logical stock reservation.
- **UI/UX:** Uses Radix UI, Lucide React, shadcn/ui for components, and Tailwind CSS for styling.
- **Navigation:** Employs `VerticalNavSidebar` with a `navSections` array, supporting both tab-based (in-dashboard) and route-based (dedicated page) navigation patterns.
- **Role Management:** Role names are compared using `.toLowerCase()` for consistency across the system.
- **Page Wrappers:** Follow a specific pattern to ensure the sidebar remains visible during data loading, avoiding full-page spinners.

---

## NEW MODULE REGISTRATION CHECKLIST

Every new route-based page (dedicated URL like `/hr/something`) MUST be registered in ALL 8 of the following places. Missing any one causes the nav item to disappear or the page to be inaccessible.

### 1. `client/src/App.tsx` — `getAdminNavSections()` function
Add the nav item with `onClick: () => setLocation('/your/path')`.

### 2. `client/src/App.tsx` — `AdminDashboard` hardcoded `navSections` array (~line 1957)
**CRITICAL TRAP:** AdminDashboard does NOT use `getAdminNavSections()`. It has its own separate hardcoded array. Must add the item here too — with the same `onClick`.

### 3. `client/src/App.tsx` — `SCREEN_TO_PERMISSION_MAP`
Add: `'your-nav-id': 'existing_screen_key'`

### 4. `client/src/App.tsx` — `VIEW_TO_MODULE_MAP`
Add: `'your-nav-id': 'Section Label'` (e.g. `'HR & Payroll'`)

### 5. `client/src/App.tsx` — Wrapper function
```typescript
function YourPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('your-nav-id');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Page Title" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0}
      navSections={resolvedNav} activeView={activeView}
      onNavigate={(v) => { setActiveView(v); setLocation('/'); }}>
      <YourPage />
    </DashboardShell>
  );
}
```
**NEVER** use `if (isLoading) return <Spinner/>` — always use `resolvedNav` pattern above.

### 6. `client/src/App.tsx` — `Router` ProtectedRoute
```typescript
<ProtectedRoute path="/your/path" component={YourPageWrapper} />
```

### 7. `server/plan-features.ts` — Module nav items list
Find which module object your feature belongs to (e.g. `hr_payroll`) and add the nav item ID:
```typescript
hr_payroll: [
  "hr-employees",
  "your-new-nav-id",   // ADD HERE
  ...
],
```
**If this is missing, the item disappears from the sidebar after the plan features API responds (usually within 1 second of page load).**

### 8. `client/src/hooks/use-filtered-navigation.tsx` — `navItemToScreenKey` map
Add the nav item ID mapped to an existing screen key (used for DB-permission-based role filtering):
```typescript
'your-new-nav-id': 'existing_screen_key',
```
**If this is missing, the item is blocked for any role that goes through the DB permissions path (returns `false` = denied).**

---

## Key Architecture Rules

### Double-Navigation Bug (FIXED — do not revert)
`VerticalNavSidebar.handleItemClick` only calls `item.onClick()` when `onClick` is defined — it does NOT also call `onItemClick`. This prevents the wrapper's `onNavigate` (which calls `setLocation('/')`) from overriding the intended route navigation.

### Nav Items MUST always have `onClick` in `getAdminNavSections()`
Every nav item in `getAdminNavSections()` **must** have an `onClick` handler. Items without `onClick` fall to the `else` branch in `VerticalNavSidebar.handleItemClick`, which calls both `navigate('/?tab=itemId')` AND `onItemClick(itemId)`. From within a wrapper page, `onItemClick` triggers `onNavigate → setLocation('/')`, causing unexpected navigation back to root. Always provide `onClick: () => setLocation('/your/path')`.

### Browser Caching of Plan Features (FIXED — do not revert)
`/api/tenant/features` has `Cache-Control: no-store` header. **Do not remove this.** Without it, the browser caches the response and serves stale plan data that may be missing newly added nav items — causing sidebar items to disappear ~1 second after page load. This was the root cause of HR Reports and Exit Management disappearing from the sidebar.

### Role name comparison
`/api/user` returns `role: "Admin"` (capital A). Always use `.toLowerCase()` when comparing role names.

### Session / Auth
- SameSite=None; Secure=true in Replit — always "Open in New Tab" for authenticated testing
- Super-admin: username=`superadmin`, password=`superadmin123`, slug=`kinto-admin`

### Schema changes
- `db:push` is blocked — use `psql $DATABASE_URL -c "..."` for ALL schema changes
- Save matching scripts in `db_scripts/`

### SYSTEM_ROLES_FULL_ACCESS
Roles `['admin', 'manager', 'accountsmanager']` bypass DB permission filtering — only plan gating applies to them. Items missing from `server/plan-features.ts` will still be filtered out even for these roles.

---

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
