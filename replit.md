# KINTO Operations & QA Management System

## Overview
KINTO Operations & QA is a comprehensive manufacturing operations and quality management system designed to streamline industrial operations, enhance quality control, and prevent errors. It manages production, inventory, purchase orders, invoicing, gatepasses, quality assurance, and preventive maintenance. Key features include FIFO payment allocation, GST-compliant invoice generation, payment tracking, extensive reporting, and two-way WhatsApp integration for machine startup and checklist management. The system supports various user roles through tasks like checklist completion, verification, approval, and configuration, providing a full-stack TypeScript solution for industrial settings. The business vision is to modernize industrial operations, improve efficiency, and ensure high-quality output.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Changes (November 24, 2025)

### Manual Credit Note Creation Feature (November 24, 2025)
**Context:** User reported delivered invoice with wrong amount in same GST billing cycle.

**Solution:** Implemented manual credit note creation feature for pricing corrections.

**Implementation:**
- **Backend:** POST `/api/credit-notes/manual` endpoint with hardened security
  - Zod schema validation (strict type checking)
  - Authoritative invoice data (GST rates from invoice, never client)
  - Price validation: adjusted price ≤ invoice price (for pricing_error)
  - Quantity validation: credit qty ≤ invoiced qty
  - Outstanding balance check: prevents over-crediting
  - Currency handling: consistent paise values throughout
  - Auto-generated credit note numbers: CN-{INV#}-{SEQ}
  - Full audit trail logging

- **Frontend:** CreateCreditNoteDialog component
  - Admin/Manager only (role-based access)
  - Accessible from invoice detail page
  - Reason selection: pricing_error, discount, damage, other
  - Item selection with quantity/price adjustment
  - Client-side clamping to invoice prices
  - Proper paise/rupee conversion (fixes currency inconsistency)
  - Responsive UI with validation feedback

**Security Features:**
- ✅ Server-side validation (Zod + custom logic)
- ✅ No client-controlled prices (uses authoritative invoice data)
- ✅ No quantity manipulation (validates against invoice)
- ✅ No GST tampering (recalculates from invoice rates)
- ✅ No over-crediting (checks outstanding balance)
- ✅ Currency consistency (paise throughout)

**GST Compliance:**
- Same billing cycle: Credit note and invoice appear in same GSTR-1
- Auto-netted in GST return period
- Full tax breakdown preserved (CGST, SGST, IGST)

**Use Cases:**
1. **Pricing Error:** Overcharged/undercharged amount correction
2. **Discount:** Additional discount after delivery
3. **Damage:** Quality issue discovered post-delivery
4. **Other:** Custom reason with explanation

**Test Results:**
- ✅ E2E test passed: CN-336-01 created successfully
- ✅ Currency handling validated
- ✅ Security hardening verified by architect

### Cancel & Reissue Invoice Feature (November 24, 2025)
**Context:** Simpler alternative to credit notes for same-month invoice corrections (e.g., wrong amounts entered before dispatch).

**Solution:** Implemented Cancel & Reissue workflow that creates a fresh invoice copy while soft-deleting the original.

**Implementation:**
- **Backend:** POST `/api/invoices/:id/cancel-and-reissue` endpoint with robust safeguards
  - Current-month restriction: Only invoices from the current billing month can be reissued
  - Active gatepass blocking: Prevents reissue if gatepass already created
  - Deep data cleaning: Strips ALL identifiers (id, invoiceNumber, gatepassId, item IDs, timestamps, templateId, termsConditionsId)
  - Explicit flag: Returns `isReissue: true` to differentiate from edit mode
  - Soft delete: Sets original invoice `record_status = 0` (cancelled, preserved for audit trail)

- **Frontend:** Complete data flow with sessionStorage management
  - **invoice-detail.tsx**: Cancel & Reissue button → stores clean data + flag → navigates to Production Management
  - **production-management.tsx**: Detects reissue param → loads sessionStorage → sets `isReissueMode=true` → opens form → cleans up storage
  - **InvoiceForm.tsx**: Accepts `isReissueMode` prop → always POSTs new invoice (never PATCH) → pre-fills all fields including buyer name

**Workflow Steps:**
1. User clicks "Cancel & Reissue" on current-month invoice (no active gatepass)
2. Backend cancels original invoice, strips all IDs, returns clean data + `isReissue: true`
3. Frontend stores data/flag in sessionStorage, navigates to `/?tab=invoices&reissue=true`
4. ProductionManagement detects params, loads data, sets `isReissueMode=true`, opens form
5. InvoiceForm receives clean data + flag, pre-fills fields, pre-selects matching vendor
6. User edits amounts/quantities, submits → POST creates NEW invoice with fresh ID
7. Cancelled invoice remains in database (record_status=0) for audit/reporting
8. New invoice gets fresh database-generated ID and invoice number

**Security Features:**
- ✅ Server-side ID stripping (backend never trusts client)
- ✅ Explicit reissue flag prevents accidental PATCH
- ✅ Form logic: `if (isReissueMode || !invoice || !invoice.id)` → POST
- ✅ No ID conflicts or data corruption
- ✅ Audit trail preserved (both invoices coexist)

**Key Design Decisions:**
- SessionStorage for data passing (temporary, auto-clears on page load)
- Explicit `isReissueMode` flag to reliably distinguish reissue from edit
- Buyer field protection: Pre-selects vendor to prevent field clearing
- Clean URL handling: Removes reissue param after loading to prevent stale data

**GST Compliance:**
- Same-month restriction ensures corrected invoice in same GSTR-1 period
- Cancelled invoice excluded from reporting (record_status=0)
- New invoice counted in sales totals

**Architect Review:**
- ✅ PASS: Implementation complete and secure
- ✅ Backend strips all identifiers correctly
- ✅ Frontend always creates NEW invoice in reissue mode
- ✅ Buyer fields pre-fill correctly
- ✅ No security concerns observed

### Production Data Integrity Fixes
Fixed critical data discrepancies affecting Sales Dashboard and Vendor Analytics:

**1. Vendor Type Double-Counting Bug (₹8L discrepancy)**
- **Issue:** Vendors with multiple types (e.g., "Kinto" + "HPPani") had revenue counted multiple times in type breakdown
- **Fix:** Modified `/api/vendor-analytics` to count revenue by PRIMARY vendor type only (server/routes.ts line 5122-5133)
- **Impact:** Vendor type breakdown sum reduced from ₹1,21,35,385 (inflated) to ₹1,13,59,999 (accurate)
- **Database Fix:** Set `is_primary = 1` for each vendor's first vendor type assignment (158 vendors updated)

**2. Missing Vendor Type Assignment (₹3L uncategorized)**
- **Issue:** "Sri Kanthamma Talli Agencies" had ₹3,03,334 revenue but no vendor type assigned
- **Fix:** Assigned "Kinto" as primary vendor type
- **Impact:** All revenue now included in vendor type breakdown

**3. Buyer Name Mismatches (₹3L discrepancy)**
- **Issue:** 8 invoices had parenthetical text in buyer names preventing vendor master linkage
- **Fix:** Updated invoice buyer names to match vendor master records exactly
- **Impact:** Sales Dashboard and Vendor Analytics now show matching totals (339 invoices)

**4. JavaScript Runtime Error Pattern**
- **Issue:** Components using `data || []` failed when API returned error objects (truthy but not arrays)
- **Fix:** Replaced with `Array.isArray(data) ? data : []` pattern across 8 components
- **Files:** Reports, Dispatch Tracking, ProofOfDelivery, PendingPaymentsDashboard, InvoiceDetail, VendorAnalytics

**5. Query Client Pagination Bug**
- **Issue:** Pagination parameters not properly converted to query strings
- **Fix:** Enhanced queryClient.ts to handle `['/api/invoices', { page: 1 }]` pattern
- **Impact:** All paginated endpoints now work correctly

**Production Deployment:**
- Comprehensive SQL fix script created: `production-complete-fix.sql`
- Includes all 4 database fixes in one transactional script
- Safe, idempotent, includes verification queries
- Documentation updated in `PRODUCTION_DEPLOYMENT.md`

**6. Vendor Type Breakdown in Both Dashboards**
- **Feature:** Added vendor type breakdown to both Sales Dashboard and Vendor Analytics
- **Implementation:** 
  - Backend: Both `/api/sales-analytics` and `/api/vendor-analytics` return `typeBreakdown[]`
  - Frontend: Both dashboards display "Sales by Vendor Type" section with 3 cards (Kinto, HPPani, Purejal)
- **Impact:** Users can see revenue distribution by vendor classification on both dashboards

**Verified Results:**
- ✅ Sales Dashboard Total: ₹1,13,59,999.78
- ✅ Sales Dashboard Type Breakdown Sum: ₹1,13,59,999.78
- ✅ Vendor Analytics Total: ₹1,13,59,999.78
- ✅ Vendor Analytics Type Breakdown Sum: ₹1,13,59,999.78
- ✅ Both Dashboards Match: ₹0.00 difference (perfect match!)

**Vendor Type Breakdown:**
- Kinto: ₹95,50,265.78 (95 vendors)
- HPPani: ₹10,17,929.80 (32 vendors)
- Purejal: ₹7,91,804.20 (31 vendors)
- **Total: ₹1,13,59,999.78** ✅

## System Architecture

### UI/UX Decisions
The frontend utilizes React 18 with TypeScript, Vite, Wouter, `shadcn/ui` (Radix UI), and Tailwind CSS ("New York" theme, Material Design principles) with a mobile-first approach. It incorporates custom styling, a Vertical Sidebar for role-based navigation, dedicated detail pages, and form validation with `react-hook-form` and `zod`. The UI prioritizes a sleek, space-efficient design suitable for data-dense industrial operations, featuring reduced spacing, compact typography, and accessible components.

### Technical Implementations
The backend is an Express.js application built with TypeScript and Node.js, using Neon Serverless PostgreSQL managed via Drizzle ORM. It features Email/Password Authentication with `scrypt` and `Passport.js`, and a Dynamic Role-Based Access Control (RBAC) system. The system supports multi-item issuance, a Header-Detail pattern for transactions, automatic inventory management, and comprehensive vendor and role management. The API is RESTful JSON with structured error handling, audit logging, and multi-layer authorization.

### Feature Specifications
- **Comprehensive Reporting:** Generates printable, branded reports, sales/overview dashboards, and unified operational/GST reports.
- **Automated Reminders:** Machine Startup Reminders and Missed Checklist Notifications via WhatsApp and Email.
- **WhatsApp Interactive Checklist System:** Production-ready interactive Q&A system for checklist completion with multi-format answers, automatic assignment tracking, secure photo downloads, atomic database transactions, snapshot data consistency, and automatic submission.
- **Invoice & Gatepass Management:** Enforces an Invoice-First Gatepass Flow, manages templates, includes enhanced forms with print preview, smart item entry, and automatic UPI payment QR code generation.
- **Complete Dispatch Tracking Workflow:** A 5-stage workflow from Invoice Creation to Proof of Delivery with strict state machine enforcement, TOCTOU race condition protection, atomic status updates, and optional digital signature.
- **Comprehensive Role Permissions Management:** Granular access control across 36 system screens with metadata-driven UI.
- **Raw Material & Product Master Systems:** Manages raw material definitions with conversion methods, loss percentages, and comprehensive product management with Bill of Materials (BOM).
- **BOM-Driven Production:** Intelligent material issuance based on BOMs and production entry with BOM variance analysis.
- **Production Reconciliation & Analytics:** End-of-day reconciliation, detailed reports, and a Variance Analytics Dashboard.
- **Sales Returns & Damage Handling:** Manages post-delivery returns with a three-stage workflow, including quality segregation, inventory reconciliation, and intelligent credit note generation.
- **Master Data Management:** Comprehensive CRUD for Product Category & Type.
- **Financial Tracking:** Pending Payments Tracking Dashboard and Credit Notes Viewing System.
- **Admin Navigation & Vendor Classification:** Organized admin dashboard navigation and a three-tier vendor classification system based on product brands.
- **Comprehensive Search & Filter System:** Advanced search and filtering across all major data screens with consistent UX, performance optimization, and clear empty states.
- **Vyapaar Data Import System:** Excel-based data migration from Vyapaar accounting software with fuzzy matching, intelligent date conversion, automatic vendor type classification, and comprehensive error handling.
- **Payment Write-Off System:** Admin-only functionality to write off outstanding invoice balances with transaction-based implementation, Zod validation, and audit logging.
- **Comprehensive Pagination System:** Implemented server-side and client-side pagination across various modules (Invoice, Pending Payments, Vendor Master, Gatepass, Vendor Analytics) with URL-based state management, type-safe responses, filtering, sorting, and backward compatibility.

### System Design Choices
- **Authentication:** Users can log in with username or email.
- **Dispatch Workflow:** Invoice-first, tamper-proof state machine with strict backend validation, race condition prevention, database transactions, and optional digital signature.
- **Inventory Management Logic:** Inventory deduction on gatepass creation. Raw Material inventory supports "Opening Stock Entry Only" and "Ongoing Inventory" modes. Finished goods require explicit quality approval. Invoice/gatepass cancellations trigger automatic inventory returns.
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

### Styling
- Google Fonts

### Notification Services
- SendGrid (Email)
- Twilio (WhatsApp)

### QR Code Generation
- qrcode

### Other
- Wouter (Routing)
- TanStack Query (Server State Management)