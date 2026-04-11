# Kinto Smart Ops — Manufacturing ERP SaaS

## Overview
Kinto Smart Ops is a comprehensive SaaS ERP platform designed for Indian manufacturing companies. It streamlines core operations including production, inventory, purchase orders, GST-compliant invoicing, gatepasses, quality assurance, preventive maintenance, and double-entry accounting. The platform provides MIS analytics, supports multi-tenancy with isolated data spaces, and features a two-way WhatsApp integration for machine startup and checklist management.

## User Preferences
Preferred communication style: Simple, everyday language.

---

## System Architecture

### Technical Implementations
- **Backend:** Express.js with TypeScript and Node.js.
- **Database:** Neon Serverless PostgreSQL with Drizzle ORM.
- **Authentication:** Email/Password using `scrypt` and `Passport.js`.
- **Multi-tenancy:** Implemented using `AsyncLocalStorage` for automatic `tenantId` propagation.
- **Plan Gating:** Enforced on both backend (middleware) and frontend (`usePlanFeatures` hook). **DB is the authoritative source** — `subscription_plans.modules` drives both the nav filter (`/api/tenant/features`) and the API route enforcement (`plan-middleware.ts`). Code constants in `plan-features.ts` are fallbacks only. Trial plan gets full enterprise-level access (all 15 modules).
- **File Uploads:** Scoped to `uploads/tenants/{tenantId}/{type}/`.
- **Schema Management:** Raw SQL commands via `psql $DATABASE_URL` with scripts saved in `db_scripts/`.
- **Build Systems:** Vite for frontend, `tsx` (development) and `esbuild` (production) for backend.

### Feature Specifications
The platform includes comprehensive modules for Core ERP (production, inventory, finance, maintenance), CRM (lead management with Kanban view), HR & Payroll (employee master, attendance, leave, payroll processing, TDS, recruitment), and an Employee Self-Service (ESS) Portal with distinct authentication. Key features include an invoice-first, tamper-proof dispatch workflow, FIFO batch allocation for inventory, and extensive reporting capabilities for various KPIs. Role-based permissions are granular, managed by registered screens and `endpointToScreenKey` mappings, supporting multi-role users with unioned permissions. Automated daily database backups are in place.

### System Design Choices
Authentication supports username or email. Inventory logic includes deduction on gatepass, FIFO batch allocation, and logical stock reservation. Role names are compared case-insensitively. Navigation items are consistently managed across multiple configurations (`App.tsx`, `plan-features.ts`, `use-filtered-navigation.tsx`) to ensure proper display and permission-based filtering. Critical UI navigation elements like `DASHBOARD_VALID_TABS` act as whitelists for URL parameters to prevent display issues.

---

## UI/UX & RESPONSIVENESS STANDARDS
**These must be followed for ALL new pages, components, and dialogs.**

### Viewport & Zoom
- **NEVER** use `user-scalable=no` or `maximum-scale=1` — these block mobile zoom (accessibility violation).
- Current viewport: `width=device-width, initial-scale=1.0, maximum-scale=5, user-scalable=yes, viewport-fit=cover`

### Sidebar Z-Index (CRITICAL for mobile)
- `GlobalHeader` is `z-50` (fixed at top).
- `VerticalNavSidebar` overlay is `z-[55]` — must be higher than header.
- `VerticalNavSidebar` panel is `z-[60]` — highest, so it covers the header on mobile.
- Dialogs/Radix dropdowns are `z-[60]` or `z-9999`. Never reduce these.

### Page-Level Padding
- **ALWAYS** use responsive padding: `p-4 sm:p-6` — NOT `p-6` alone.
- For page containers that are full-width: `p-4 space-y-4`
- Auth/login pages: `p-4 sm:p-8` for the form container column.
- Never use `p-8` or larger as the only padding class.

### Form Grid Layouts (CRITICAL for mobile)
Every `grid-cols-N` inside a Dialog or page form MUST have responsive breakpoints:
```jsx
// WRONG — breaks on mobile phones
<div className="grid grid-cols-2 gap-4">

// CORRECT
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

// WRONG — 3-col on small screens
<div className="grid grid-cols-3 gap-4">

// CORRECT
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">

// WRONG — 4-col stats cards without breakpoints
<div className="grid grid-cols-4 gap-3">

// CORRECT
<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
```
**Rule:** On mobile (< 640px = `sm:`), forms MUST be single-column. Stats cards: max 2 columns on mobile.

### Filter / Toolbar Bars
Every toolbar row with multiple elements MUST use `flex-wrap`:
```jsx
// WRONG — overflows on mobile
<div className="flex items-center gap-4">

// CORRECT
<div className="flex flex-wrap items-center gap-3">
```
Search inputs inside filter bars should use `min-w-[200px] flex-1` so they grow but never shrink below readable width.

### Dialog / Modal Responsiveness
The base `DialogContent` component already applies:
- `w-[calc(100%-2rem)]` — gives 1rem margin on each side on mobile
- `max-w-lg` default — doesn't exceed viewport width
- `max-h-[90dvh] overflow-y-auto` — prevents overflow on small screens
- `p-4 sm:p-6` — responsive padding

When overriding dialog width with custom classes (`max-w-2xl`, `max-w-3xl`, etc.), ALWAYS also add:
```jsx
<DialogContent className="max-w-3xl max-h-[90dvh] overflow-y-auto">
```
Wide dialogs (`max-w-4xl`, `max-w-5xl`) will still stay within mobile viewport width because the base class uses `w-[calc(100%-2rem)]`.

### Tables
The base `<Table>` component wraps in `overflow-auto` — all tables scroll horizontally on mobile automatically. However:
- Add `min-w-[xxx]` to critical `<TableHead>` columns that must not collapse.
- Use `overflow-x-auto` wrapper for raw `<table>` HTML elements (not using the shadcn Table component).

### Safe Area (iPhone Home Bar)
Use `pb-safe` class for elements near the bottom of the screen on mobile:
```jsx
<div className="pb-safe"> {/* Prevents content hiding behind iPhone home indicator */}
```

### Card Padding
`CardContent` default is `p-4 pt-0` — compact enough for mobile. Do NOT override to `p-6` as it wastes space on small screens.

### Text and Input Size
- `input, textarea, select` default to `font-size: max(16px, 1em)` on mobile to prevent iOS Safari zoom-on-focus. Desktop reverts to `0.875rem` via `@media (hover: hover) and (pointer: fine)`.
- Never manually set `text-xs` on interactive inputs — below 16px on mobile triggers iOS zoom.

### Flex Rows with justify-between
Always include a `gap-N` class on justify-between rows:
```jsx
// WRONG — elements may touch on smaller screens
<div className="flex items-center justify-between">

// CORRECT — with gap
<div className="flex flex-wrap items-center justify-between gap-3">
```

---

## NEW MODULE REGISTRATION CHECKLIST

Every new route-based page (dedicated URL like `/hr/something`) MUST be registered in ALL 8 of the following places. Missing any one causes the nav item to disappear or the page to be inaccessible.

### 1. `client/src/App.tsx` — `getAdminNavSections()` function
Add the nav item with `onClick: () => setLocation('/your/path')`.

### 2. `client/src/App.tsx` — `AdminDashboard` hardcoded `navSections` array (~line 911)
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
      onNavigate={(v) => { setActiveView(v); }}>
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
Find which module object your feature belongs to and add the nav item ID.
**If this is missing, the item disappears from the sidebar after plan features API responds (~1 second after load).**

### 8. `client/src/hooks/use-filtered-navigation.tsx` — `navItemToScreenKey` map
Add the nav item ID mapped to an existing screen key.
**If this is missing, the item is blocked for any role that goes through DB permissions.**

---

## Key Architecture Rules

### DASHBOARD_VALID_TABS — Tab Whitelist (CRITICAL)
`DASHBOARD_VALID_TABS` (line ~292 in App.tsx) is a whitelist of valid `?tab=` URL parameters. If a tab ID is navigated to but NOT in this list, the dashboard silently shows the **overview** (default switch case).

**Rule:** Every tab ID used in `setActiveView(id)`, `setLocation('/?tab=id')`, or any `case 'id':` in a `renderContent()` switch **MUST** be in `DASHBOARD_VALID_TABS`.

### Two Nav Array Architecture
- **AdminDashboard** (~line 862): Its own internal `navSections` array with items that can use tab-based navigation.
- **`getAdminNavSections()`**: Used by all wrapper pages. ALL items MUST have `onClick: () => setLocation('/path')`.
- Keep both in sync when adding new nav items.

### Browser Caching of Plan Features (FIXED — do not revert)
`/api/tenant/features` has `Cache-Control: no-store`. **Do not remove this.**

### Session / Auth
- SameSite=None; Secure=true — always "Open in New Tab" for authenticated testing in Replit
- Super-admin: username=`superadmin`, password=`superadmin123`, slug=`kinto-admin`
- Kinto test: `admin`/`admin123`/`kinto`

### Schema changes
- `db:push` is blocked — use `psql $DATABASE_URL -c "..."` for ALL schema changes
- Save scripts in `db_scripts/`

### Role name comparison
`/api/user` returns `role: "Admin"` (capital A). Always use `.toLowerCase()` when comparing role names.

### `role_permissions` columns
`can_view/can_create/can_edit/can_delete` are INTEGER (0/1), NOT boolean.

---

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
