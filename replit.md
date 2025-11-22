# KINTO Operations & QA Management System

## Overview
KINTO Operations & QA is a comprehensive manufacturing operations and quality management system designed to streamline industrial operations, enhance quality control, and prevent errors. It manages production, inventory, purchase orders, invoicing, gatepasses, quality assurance, and preventive maintenance. Key capabilities include FIFO payment allocation, GST-compliant invoice generation, payment tracking, extensive reporting, and two-way WhatsApp integration for machine startup and checklist management. The system supports various user roles through tasks like checklist completion, verification, approval, and configuration, providing a full-stack TypeScript solution for industrial settings.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend uses React 18 with TypeScript, Vite, Wouter, `shadcn/ui` (Radix UI), and Tailwind CSS ("New York" theme, Material Design principles). It adopts a mobile-first approach, incorporates custom styling, features a Vertical Sidebar for navigation with role-based dashboards, and provides dedicated detail pages. Form validation is handled using `react-hook-form` and `zod`.

**Compact Design System (November 2025):** The UI employs a sleek, space-efficient design optimized for data-dense industrial operations. Key characteristics include: (1) **Reduced Spacing** - Cards use p-4 padding (vs p-6), forms use space-y-4/space-y-3, grids use gap-3; (2) **Compact Typography** - Section headers text-lg, card titles text-base, body text-sm, maintaining clear hierarchy while maximizing content density; (3) **Sleek Components** - Smaller border radii (rounded-md vs rounded-xl), compact form inputs (h-9), reduced button spacing; (4) **Accessibility Maintained** - All interactive elements maintain minimum 40px touch targets for mobile/tablet use; (5) **Consistent Application** - Design guidelines documented in `design_guidelines.md` and applied consistently across Invoice Forms, Card components, Dialogs, Tables, and Sidebar navigation.

### Technical Implementations
The backend is an Express.js application built with TypeScript and Node.js, using Neon Serverless PostgreSQL managed via Drizzle ORM. It features Email/Password Authentication with `scrypt` and `Passport.js`, and a Dynamic Role-Based Access Control (RBAC) system. The system supports multi-item issuance, a Header-Detail pattern for transactions, automatic inventory management, and comprehensive vendor and role management. The API is RESTful JSON with structured error handling, audit logging, and multi-layer authorization.

### Feature Specifications
- **Comprehensive Reporting System:** Generates printable, branded reports and includes sales/overview dashboards and unified operational/GST reports.
- **Automated Reminder Systems:** Includes Machine Startup Reminders and Missed Checklist Notifications via WhatsApp and Email.
- **WhatsApp Interactive Checklist Completion System:** Production-ready interactive Q&A system for checklist completion via WhatsApp with multi-format answers (photo+caption, photo-first-then-text, text-only), automatic assignment tracking, secure photo downloads, atomic database transactions with row-level locking, snapshot data consistency, and automatic submission on confirmation. Handles concurrent messages and integrates with checklist assignment.
- **Invoice & Gatepass Management:** Enforces an Invoice-First Gatepass Flow, manages templates, and includes enhanced forms with print preview and smart item entry. Invoice PDFs feature automatic UPI payment QR code generation (when UPI ID is provided) and authorized signatory section with space for physical signature.
- **Complete Dispatch Tracking Workflow:** A 5-stage workflow from Invoice Creation to Proof of Delivery with strict state machine enforcement, TOCTOU race condition protection, atomic status updates, optional digital signature, and comprehensive validation guards.
- **Comprehensive Role Permissions Management:** Granular access control across 36 system screens with metadata-driven UI.
- **Raw Material Type Master System:** Manages raw material definitions with conversion methods and loss percentage, integrating with enhanced raw material entry for dual stock management modes.
- **Product Master with Bill of Materials (BOM):** Comprehensive product management with a multi-tabbed form interface, supporting empty BOMs and atomic BOM replacements.
- **BOM-Driven Raw Material Issuance:** Intelligent material issuance system that auto-populates required raw materials based on Product BOM with conversion calculation methods.
- **Production Entry System with BOM Variance Analysis:** Tracks actual manufacturing output linked to raw material issuances by shift, with real-time variance analysis.
- **Production Reconciliation Entry System:** End-of-day reconciliation system that closes the loop between raw material issuance, production, and actual consumption. Dynamically calculates `netConsumed`, enforces role-based edit limits, manages inventory updates with audit trails, and ensures data integrity.
- **Production Reconciliation Report System:** Provides detailed reconciliation analysis with Excel and PDF export functionality.
- **Variance Analytics Dashboard:** Advanced analytics system providing trend analysis of production efficiency and material usage variances across various time periods, featuring key metrics, color-coded variance indicators, and multiple chart types.
- **Sales Returns & Damage Handling System:** Manages post-delivery returns with a three-stage workflow, including quality segregation, inventory reconciliation, and intelligent credit note generation.
- **Product Category & Type Master Data Management:** Comprehensive master data management for product categorization with full CRUD functionality.
- **Pending Payments Tracking Dashboard:** Dedicated financial tracking page displaying outstanding invoice payments, outstanding balances, total paid amounts, payment history, and overdue indicators.
- **Credit Notes Viewing System:** Complete credit note management interface for viewing GST-compliant credit notes generated from sales returns.
- **Complete Admin Navigation System (36 Screens):** Organized admin dashboard navigation across 6 logical sections with relevant quick actions and icons.
- **Vendor Type Classification System:** Three-tier vendor classification system (Kinto, HPPani, Purejal) based on product brands purchased. Features many-to-many vendor-type relationships with optional primary type designation, complete CRUD API endpoints, and dedicated master data management UI. Designed for automatic type detection during Vyapaar data import based on invoice line item products. **Command Component Fix (Nov 2025):** Resolved vendor types dropdown rendering issue where CommandList applied aria-hidden and zero-height styling to nested spans. Solution: simplified CommandItem structure using single span element with `value={type.name}` and `keywords={[type.code]}` for search, wrapped in CommandList component for proper rendering.
- **Comprehensive Search & Filter System:** Advanced search and filtering capabilities across all major data screens with consistent UX patterns. Features include:
  - **Gatepasses**: Multi-field search (gatepass number, vehicle, driver) with date range/month/year filters and status filters
  - **Raw Material Issuances**: Multi-field search (issuance number, product, issued to) with flexible date filtering (range/month/year)
  - **Inventory Management - Vendors**: Multi-field search (name, code, GST number) with unique value filters for city, state, and active status
  - **Inventory Management - Products**: Dual search (product name, code) with dynamically computed category and type filters from existing data, plus active status filtering
  - **Inventory Management - Raw Materials**: Dual search (material name, code) with material type filters (from master data), stock mode filters (opening stock vs ongoing inventory), and active status
  - **Inventory Management - Finished Goods**: Enhanced search (batch number, product name) with quality status filters (pending/approved/rejected) and comprehensive date filtering (range/month/year) on production date
  - All implementations use `useMemo` for performance optimization, provide "Clear Filters" buttons when filters are active, display smart empty states differentiating "no data" from "filtered out", and maintain consistent responsive UI patterns with proper data-testid attributes for testing
- **Vyapaar Data Import System:** Complete Excel-based data migration from Vyapaar accounting software with support for Party Report, Sale Report, and Item Details files. Features enhanced fuzzy vendor matching that handles parenthetical name variations (e.g., "Sri Kanthamma Talli Agencies (Sri Kartam Talli Agencies)"), intelligent DD/MM/YYYY date format conversion, automatic vendor type classification (Kinto, HPPani, Purejal) based on product purchases, and comprehensive error handling with detailed import summaries. Achieved 97.9% success rate (333/340 invoices) with automatic payment import and FIFO payment allocation.
- **Payment Write-Off System:** Admin-only functionality to write off outstanding invoice balances directly from the Pending Payments dashboard. Features transaction-based implementation with row-level locking for race condition prevention, Zod schema validation, comprehensive audit logging, confirmation dialog with invoice details, proper loading states, and automatic cache invalidation. Creates payment records with paymentType='Write-off' for complete audit trails.

### System Design Choices
- **Authentication:** Users can log in with username or email.
- **Dispatch Workflow:** Invoice-first, tamper-proof state machine with strict backend validation, ConflictError-based race condition prevention, database transactions for atomic updates, and optional digital signature.
- **Inventory Management Logic:** Inventory deduction on gatepass creation. Raw Material inventory supports "Opening Stock Entry Only" and "Ongoing Inventory" modes. Finished goods require explicit quality approval. Invoice/gatepass cancellations trigger automatic inventory returns.
- **Production Reconciliation Design:** `netConsumed` calculated dynamically, composite unique index for data integrity, and server-side enforced role-based edit limits.
- **WhatsApp Integration:** Uses Colloki Flow API with Meta WhatsApp Business Cloud API fallback for interactive checklist completion with AI-assisted response interpretation. Features include assignment-linked conversation sessions, multi-format answer support with secure photo storage, database transactions with row-level locking, snapshot data architecture, pending photo queue, validated photo download routes, 24-hour session expiry, automatic submission, and AI-powered response interpretation with confidence-based gating.
- **Build & Deployment:** Uses Vite for frontend, `tsx` for Express development, and `esbuild` for backend production. Drizzle Kit manages database schema.
- **Environment Handling:** Automatically detects Replit environment for cross-origin cookie settings.

## Production Deployment

### Database Setup
The system uses a production-ready database setup with TypeScript-based migrations and seed scripts:
- **Migration System:** Baseline SQL migration (`migrations/0000_curly_silk_fever.sql`, 1080 lines) defines complete schema
- **Seed Script:** Idempotent TypeScript seed script (`scripts/db/seed.ts`) for reference data initialization
- **Deployment Documentation:** Comprehensive guide (`PRODUCTION_DEPLOYMENT.md`) with step-by-step setup instructions

### Seed Script Characteristics
- **Idempotent:** Safe to run multiple times without data duplication
- **Sequential Operations:** Runs without transaction wrapping - each DB operation is individually atomic
- **Partial Failure Handling:** Can be safely re-run to complete if interrupted
- **Security Features:** Preserves existing admin passwords, warns about soft-deleted account reactivation
- **Additive Permissions:** Only adds/updates role permissions - does not remove obsolete ones (manual cleanup required)
- **Reference Data Coverage:** Seeds 4 roles, 62 permissions, 8 UOMs, 5 machine types, 3 vendor types, 4 product categories, 5 product types

### Default Credentials
- **Admin Username:** `admin`
- **Admin Password:** `Admin@123` (must be changed after first login)
- **Security Note:** If admin account was previously soft-deleted, seed script reactivates it with existing credentials

### Deployment Checklist
1. Set up `DATABASE_URL` environment variable for production PostgreSQL database
2. Run migrations: `npx drizzle-kit migrate`
3. Seed reference data: `npx tsx scripts/db/seed.ts`
4. Remove test users: `DELETE FROM users WHERE username LIKE '%_test'`
5. Change admin password on first login
6. Manually clean up obsolete permissions if needed

See `PRODUCTION_DEPLOYMENT.md` for detailed instructions and troubleshooting.

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