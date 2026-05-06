# SwachERP — Industry-Agnostic ERP SaaS

## Overview
SwachERP is a comprehensive SaaS ERP platform for Indian businesses across all industries (manufacturing, services, trading, healthcare, education, logistics, real estate, retail, agriculture). It covers production, inventory, purchase orders, GST-compliant invoicing, gatepasses, quality assurance, preventive maintenance, double-entry accounting, HR & Payroll, CRM, and an Employee Self-Service (ESS) Portal. Additional enterprise features include: Expense Claims, Timesheets, Performance Appraisals, Recurring Invoices, Multi-location Warehouses & Stock Transfers, UOM Conversions, Serial/Lot Tracking, Project Management (with BOQ, milestones, P&L), Fixed Asset Register & Depreciation, Multi-currency with Exchange Rates, and Configurable Module Labels & Custom Fields. The platform provides MIS analytics, supports multi-tenancy with isolated data spaces, and features two-way WhatsApp integration.

### New Modules Added (Generic ERP Phases 1–5 + Industry-Agnostic Gaps)
- **Phase 1:** Configurable Module Labels (rename any module), Custom Field Definitions (extend any entity) — accessible via Company Settings tabs
- **Phase 2:** Expense Claims (`/hr/expense-claims`), Recurring Invoice Schedules (`/recurring-invoices`)
- **Phase 3:** Multi-location Warehouses & Stock Transfers (`/warehouses`), UOM Conversions, Serial/Lot Register
- **Phase 4:** Project Management with BOQ, Milestones, Timesheets (`/projects`, `/hr/timesheets`)
- **Phase 5:** Fixed Asset Register + Depreciation (`/fixed-assets`), Performance Appraisal Cycles (`/hr/appraisals`), Multi-currency Management (`/currency-management`)

### Industry-Agnostic Gap Implementations (T001–T016)
- **T001 Item Master:** `item_type` (goods/service), `reorder_point`, `reorder_qty` in products schema + UI
- **T002 Proforma Invoice:** `invoice_type`, `currency_code`, `exchange_rate` on invoices; "Convert to Tax Invoice" action
- **T003 Purchase Requisitions:** `purchase_requisitions` + `purchase_requisition_items` tables; `/purchase-requisitions` page; "Convert to PO" action
- **T004 GRN + Retention:** `goods_receipt_notes` + `grn_items` tables; `/goods-receipt-notes` page; retention fields on PO
- **T005 Three-way Matching:** GRN linked to vendor invoices; matching status badge on expense forms
- **T006 Approval Workflows:** `approval_rules` + `approval_requests` + `approval_actions` tables; approve/reject engine; `/approvals` inbox page
- **T007 Cost Centres + Payment Terms:** `cost_centres` table; `/cost-centres` page; `cost_centre_id` on expenses/journals; `payment_terms_days` on vendors
- **T008 Credit Limit + Reorder Alerts:** `credit_limit` + `payment_terms_days` on vendors; credit limit warning in InvoiceForm; Reorder Alerts dashboard widget in AdminDashboardOverview
- **T009 Module Labels Sidebar:** `useFilteredNavigation` calls `applyModuleLabelsToNav()` from `useModuleLabels` hook
- **T010 Custom Fields on Forms:** `custom_field_values` DB table; `CustomFieldsSection` component wired into GRN, Invoice, Vendor/Customer, and Employee forms
- **T011 ESS Expense Claims:** Expense Claims tab in ESS portal; employee can submit and track own claims
- **T012 Recurring Invoice Cron:** Server cron at 6:00 AM generates overdue recurring invoices automatically
- **T013 GSTR-1/GSTR-3B Reports:** `/gst-reports` page with B2B summary by GSTIN and monthly aggregate; JSON export for GST portal
- **T014 Audit Trail:** `audit_logs` table; `/audit-trail` admin page with entity-type filtering and time-range search
- **T015 Bulk Operations:** Bulk approve/reject expenses; bulk record payment on invoices; bulk cancel POs
- **T016 Inline Attachments:** Attachment upload directly on invoice, PO, and expense forms using existing upload infrastructure

### Industry Vertical Modules (Phase 6)
- **Healthcare:** `patients`, `wards`, `appointments`, `ipd_admissions` tables; `/healthcare` page with Patients/OPD/IPD/Wards tabs; `server/healthcare-routes.ts` → `/api/healthcare/*`
- **Education (Phase 8 — Full Expansion):** Comprehensive 12-tab ERP covering: Overview (8 stat cards), Students (blood_group, section, roll_number, transport/hostel flags, admission_no, academic_year), Staff (department, designation), Classes, Subjects (new — subject_code, theory_practical, pass/total marks), Attendance (student bulk-save by class + staff with check-in/out), Timetable (period master + grid by class/day), Assessments (exam creation + marks entry with auto-grading), Library (books + issue/return with fine), Transport (vehicles + routes + student assignments), Fees (6 sub-tabs: payments, fee structures, fee components, scholarships, discounts, fee ledger), Announcements (audience/priority). DB: extended `students` + `teachers` + 18 new tables. Routes: fully rewrote `server/education-routes.ts`. Migrations: `db_scripts/2026-05-01_education_full_expansion.sql`, `db_scripts/2026-05-01_education_fix_constraints.sql`. Bug fixes: AttendanceTab fully rewritten (SelectItem value="all" sentinel, queryFn throws on non-ok, Array.isArray guards, time substring fix, functional updater for state, onError toast handlers, stale closure fix); `exam_marks` unique constraint `(examination_id, student_id)` added; `fee_structure_components` unique constraint `(structure_id, component_id)` added.
- **Logistics:** `logistics_vehicles`, `trips`, `consignment_notes` tables; `/logistics` page with Trips/Vehicles/LR tabs; `server/logistics-routes.ts` → `/api/logistics/*`
- **Real Estate:** `re_projects`, `re_units`, `re_bookings`, `re_payment_schedules` tables; `/real-estate` page with Projects/Units/Bookings tabs; `server/realestate-routes.ts` → `/api/real-estate/*`
- **Retail/POS:** `pos_sessions`, `pos_transactions`, `pos_transaction_items` tables; `/pos` page with POS Terminal/Sales History/Sessions tabs; `server/retail-routes.ts` → `/api/pos/*`
- **Agriculture:** `farms`, `crop_cycles`, `commodity_prices`, `agri_procurement` tables; `/agriculture` page with Crop Cycles/Farms/Procurement/Commodity Prices tabs; `server/agriculture-routes.ts` → `/api/agriculture/*`
- All 6 vertical modules are gated under `enterprise` plan and registered in `server/plan-features.ts`, `client/src/hooks/use-filtered-navigation.tsx`, and `client/src/App.tsx` with `Industry Verticals` nav section.

### Marketing Pages (Phase 7 — Landing & Pricing)
- **landing.tsx:** Updated to industry-agnostic messaging — "Built for Indian Businesses", "30+ integrated modules", 6 industry verticals in NAV_PRODUCTS + MODULES grid, Solutions dropdown expanded to 12 industries, all plan features updated, footer extended with new module links.
- **pricing.tsx:** Plan cards pull from DB (`subscription_plans.features`). DB updated with comprehensive feature lists for Trial/Basic/Professional/Enterprise via `2026-05-01_update_plan_features_taglines.sql`.
- **auth-page.tsx:** Updated module chips to include industry verticals + new modules, stat "25+" → "30+", description "manufacturers" → "businesses".
- **company-select.tsx:** Updated description to be industry-agnostic.

### New Backend Routes
- `server/warehouse-routes.ts` → `/api/inventory/*` (warehouses, stock-transfers, uom, serial)
- `server/project-routes.ts` → `/api/projects/*` (projects, boq, milestones, timesheets, P&L)
- `server/asset-routes.ts` → `/api/assets/*` (fixed-assets, recurring-invoices, currencies, exchange-rates)
- `server/hr-routes.ts` extended with expense-claims, timesheets, appraisal-cycles, appraisals, module-labels, custom-fields
- `server/healthcare-routes.ts`, `server/education-routes.ts`, `server/logistics-routes.ts`, `server/realestate-routes.ts`, `server/retail-routes.ts`, `server/agriculture-routes.ts` — all industry vertical routes (requireAuth defined inline)

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

### Module Marketplace & Per-Tenant Billing (Phase 9)
- **DB:** `subscriptions.selected_modules JSONB DEFAULT '[]'` + `monthly_amount INTEGER DEFAULT 0` columns added (script: `db_scripts/2026-05-06_add_selected_modules_to_subscriptions.sql`)
- **Module Catalog:** `server/module-catalog.ts` — 27 paid + 4 free modules across 7 categories (Core, Finance, Inventory, Production, HR, Sales, Industry) with per-module monthly pricing (₹249–₹999)
- **New API endpoints** (all in `server/billing.ts`):
  - `GET /api/billing/module-catalog` — full catalog list
  - `GET /api/billing/selected-modules` — tenant's current selection + catalog
  - `POST /api/billing/selected-modules` — save selection, compute monthly total, log billing event
- **Plan middleware** (`server/plan-middleware.ts`) now checks `subscriptions.selected_modules` first (per-tenant override), falls back to plan-level modules. Cache TTL: 2 min per tenant.
- **Subscription Management UI** (`client/src/pages/subscription-management.tsx`) redesigned into 5 tabs:
  1. **Overview** — stat cards: status, monthly cost, active modules, next billing
  2. **Module Marketplace** — full module grid by category with sticky billing summary; toggle to add/remove; save with one click
  3. **Manage Modules** — list of active modules with remove/undo/add-more; dependency warnings; before/after billing diff
  4. **Auto-Deduct** — 5-step timeline showing billing cycle flow; payment method; notification toggles
  5. **Billing History** — all billing_events with event-type icons and amounts

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