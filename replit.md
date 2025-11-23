# KINTO Operations & QA Management System

## Overview
KINTO Operations & QA is a comprehensive manufacturing operations and quality management system. It streamlines industrial operations, enhances quality control, and prevents errors by managing production, inventory, purchase orders, invoicing, gatepasses, quality assurance, and preventive maintenance. Key capabilities include FIFO payment allocation, GST-compliant invoice generation, payment tracking, extensive reporting, and two-way WhatsApp integration for machine startup and checklist management. The system supports various user roles through tasks like checklist completion, verification, approval, and configuration, providing a full-stack TypeScript solution for industrial settings. The business vision is to modernize industrial operations, improve efficiency, and ensure high-quality output, positioning KINTO as a leader in manufacturing operations and quality assurance technology.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Changes (November 23, 2025)

### Session Persistence Fix ✅ ARCHITECT APPROVED
- **Problem:** Server cleared all sessions on startup, causing users to be logged out after every server restart
- **Solution:** Completely removed session clearing on startup - sessions now expire naturally based on TTL (7 days)
- **Implementation:** Removed `clearAllSessions()` call from server startup
- **Result:** Users stay logged in across server restarts in both development and production
- **Security:** Sessions still expire after 7 days of inactivity via cookie maxAge setting
- **Deployment:** Works on both Replit (development) and Mac production deployments

### Comprehensive Pagination System Implementation ✅ PRODUCTION-READY
- **Server-side pagination infrastructure:** Created shared `PaginationRequest` and `PaginationMeta` schemas with z.coerce.number() for string-to-number query param handling
- **Reusable DataTablePagination component:** Prev/Next/First/Last buttons, page size selector (25/50/100), record count display
- **Invoice pagination (Dispatch Tracking):** URL-based state management, backward compatible API, aggregate status statistics across all data
- **Pending Payments pagination:** Dedicated /api/pending-payments endpoint with server-side balance calculation, customer filtering, efficient N+1 query elimination
- **Vendor Master Backend Pagination:** Server-side filtering (search, city, state, active status) with backward compatible /api/vendors endpoint for 161+ vendors, single DB query optimized to reuse vendor array for metadata computation
- **Vendor Master Frontend Pagination:** Production-ready implementation with:
  - **URL-based state management:** Pathname separated from query params to prevent duplicate `?` characters in URLs
  - **Type-safe responses:** PaginatedVendorResponse interface with full type safety for data and metadata
  - **Runtime type detection:** Handles both paginated `{data, meta}` and legacy `Vendor[]` responses gracefully
  - **Client-side fallbacks:** Cities/states computed from vendors when metadata unavailable (legacy mode)
  - **Filter metadata:** Backend returns unique cities/states for filter dropdowns from unfiltered dataset
  - **Backward compatibility:** Legacy requests (no pagination params) work seamlessly with existing filtering
- **Gatepass Pagination (Production Management):** ✅ ARCHITECT APPROVED - Production-ready implementation with:
  - **Backend endpoint:** `/api/gatepasses` enforces strict `{data, meta}` response structure (no legacy arrays)
  - **Complex filtering:** Search, status, and advanced date filtering (range/month/year) via `deriveGatepassDateRange` helper
  - **URL-based state:** All filters preserved as `?gatepassPage=1&gatepassPageSize=25&gatepassSearch=...&gatepassStatus=...`
  - **Filter metadata:** Status options computed from full unfiltered dataset
  - **Frontend validation:** Runtime metadata presence validation in queryFn, throws error if missing
  - **Standalone route:** Added `/production-management` route to App.tsx for direct access
  - **DataTablePagination:** Full integration with prev/next/first/last navigation, page size selector, record count display
- **Vendor Analytics Pagination:** Production-ready detailed transaction table with:
  - **Backend endpoint:** `/api/vendor-analytics` with server-side search, sorting, and pagination
  - **Sort capabilities:** Revenue, outstanding amount, order count, average order value (ascending/descending)
  - **Summary stats:** Computed from full dataset before filtering for accurate totals
  - **Type breakdown:** Vendor type distribution maintained across filtered results
  - **URL state management:** `?vendorPage=1&vendorPageSize=25&vendorSearch=...&vendorSort=revenue&vendorSortDir=desc`
  - **Frontend integration:** DataTablePagination with sort controls, metadata validation, type-safe responses
- **Query param preservation:** URLSearchParams-based state management preserves all existing filters during pagination navigation
- **Default settings:** 25 records per page, supports 25/50/100 options
- **Pagination contract:** ALL endpoints now enforce `{data, meta}` structure - no backward compatibility with legacy arrays (per architect requirement)
- **Pattern:** Frontend validates metadata presence and throws error if missing, ensuring consistent pagination behavior across all screens
- **Architect approved:** VendorManagement and Gatepass pagination reviewed and approved for production deployment
- **Future optimization:** Migrate to database-level LIMIT/OFFSET when datasets exceed 500-1000 records

### Vendor Analytics Customer Filter & Duplicate Prevention
- **Fixed Vendor Analytics customer filter:** Outstanding amount links now pass vendor name as URL parameter to filter Pending Payments page
- **Pending Payments customer filtering:** Page now reads `?customer=` query parameter and filters invoices to show only that customer's outstanding balances
- **Prevented duplicate vendor type badges:** Added composite unique constraint on `(vendorId, vendorTypeId)` to prevent duplicate assignments
- **Updated classification script:** Now uses per-vendor transactions with `onConflictDoNothing` instead of global table truncation
- **Frontend deduplication safeguard:** Added client-side deduplication in `vendorTypesMap` to handle React Query dev-mode double-fetch edge cases
- **Result:** No more "Kinto Kinto" duplicate badges in Vendor Master, accurate vendor analytics counts

### Vyapaar Import - Vendor Classification Fixed
- **Fixed critical vendor classification bug:** Previously only 7 out of 161 vendors were getting type assignments after import
- **Implemented post-import classification:** New `classify-vendors.ts` script classifies ALL vendors based on products purchased from their invoices
- **Automatic classification:** Runs automatically after every successful Vyapaar data import
- **Database-driven approach:** Instead of complex Excel mapping, reads invoices and products directly from database for 100% accuracy
- **Results:** Now classifies 158 vendors (all vendors with invoices) with 160 type assignments
  - 92 vendors → HPPani (purchased HP Pani products)
  - 67 vendors → Kinto (purchased Kinto products)
  - 1 vendor → Purejal (purchased Purejal products)
  - Some vendors have multiple types based on diverse purchases
- **Manual script available:** Can run `npx tsx server/classify-vendors.ts` to reclassify all vendors anytime

## System Architecture

### UI/UX Decisions
The frontend uses React 18 with TypeScript, Vite, Wouter, `shadcn/ui` (Radix UI), and Tailwind CSS ("New York" theme, Material Design principles). It adopts a mobile-first approach, incorporates custom styling, features a Vertical Sidebar for navigation with role-based dashboards, and provides dedicated detail pages. Form validation is handled using `react-hook-form` and `zod`. The UI employs a sleek, space-efficient design optimized for data-dense industrial operations with reduced spacing, compact typography, and sleek components, while maintaining accessibility.

### Technical Implementations
The backend is an Express.js application built with TypeScript and Node.js, using Neon Serverless PostgreSQL managed via Drizzle ORM. It features Email/Password Authentication with `scrypt` and `Passport.js`, and a Dynamic Role-Based Access Control (RBAC) system. The system supports multi-item issuance, a Header-Detail pattern for transactions, automatic inventory management, and comprehensive vendor and role management. The API is RESTful JSON with structured error handling, audit logging, and multi-layer authorization.

### Feature Specifications
- **Comprehensive Reporting System:** Generates printable, branded reports and includes sales/overview dashboards and unified operational/GST reports.
- **Automated Reminder Systems:** Includes Machine Startup Reminders and Missed Checklist Notifications via WhatsApp and Email.
- **WhatsApp Interactive Checklist Completion System:** Production-ready interactive Q&A system for checklist completion via WhatsApp with multi-format answers, automatic assignment tracking, secure photo downloads, atomic database transactions, snapshot data consistency, and automatic submission.
- **Invoice & Gatepass Management:** Enforces an Invoice-First Gatepass Flow, manages templates, includes enhanced forms with print preview, smart item entry, and automatic UPI payment QR code generation.
- **Complete Dispatch Tracking Workflow:** A 5-stage workflow from Invoice Creation to Proof of Delivery with strict state machine enforcement, TOCTOU race condition protection, atomic status updates, and optional digital signature.
- **Comprehensive Role Permissions Management:** Granular access control across 36 system screens with metadata-driven UI.
- **Raw Material & Product Master Systems:** Manages raw material definitions with conversion methods, loss percentages, and comprehensive product management with Bill of Materials (BOM).
- **BOM-Driven Raw Material Issuance & Production Entry:** Intelligent material issuance based on BOMs and production entry with BOM variance analysis.
- **Production Reconciliation & Analytics:** End-of-day reconciliation, detailed reconciliation reports, and a Variance Analytics Dashboard for trend analysis of production efficiency and material usage.
- **Sales Returns & Damage Handling System:** Manages post-delivery returns with a three-stage workflow, including quality segregation, inventory reconciliation, and intelligent credit note generation.
- **Master Data Management:** Comprehensive CRUD functionality for Product Category & Type.
- **Financial Tracking:** Pending Payments Tracking Dashboard and Credit Notes Viewing System.
- **Admin Navigation & Vendor Classification:** Organized admin dashboard navigation and a three-tier vendor classification system based on product brands.
- **Comprehensive Search & Filter System:** Advanced search and filtering capabilities across all major data screens with consistent UX patterns, performance optimization, and clear empty states.
- **Vyapaar Data Import System:** Excel-based data migration from Vyapaar accounting software with fuzzy matching, intelligent date conversion, automatic vendor type classification, and comprehensive error handling.
- **Payment Write-Off System:** Admin-only functionality to write off outstanding invoice balances with transaction-based implementation, Zod validation, and audit logging.

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
- qrcode (UPI Payment QR Codes)

### Other
- Wouter (Routing)
- TanStack Query (Server State Management)