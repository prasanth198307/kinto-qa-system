# KINTO Operations & QA Management System

## Overview
KINTO Operations & QA is a comprehensive manufacturing operations and quality management system. It handles complete production operations including inventory management, purchase orders, invoicing, gatepasses, quality assurance, and preventive maintenance. The system enables operators to complete checklists, reviewers to verify submissions, managers to approve, and administrators to configure the entire system. It supports managing machines, users, checklist templates, spare parts, and includes features like FIFO payment allocation, GST-compliant invoice generation, robust payment tracking, and comprehensive reporting. The system is built as a full-stack TypeScript solution with a React frontend and Express backend, focusing on speed, clarity, and error prevention for industrial workflows.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The frontend uses React 18 with TypeScript, Vite, and Wouter for routing. UI components are built with shadcn/ui (Radix UI) and styled using Tailwind CSS, following a "New York" theme with Material Design principles. TanStack Query manages server state. The design is mobile-first, featuring a custom color palette, typography, spacing, and elevation. Navigation uses a Vertical Sidebar system with role-based dashboards, reusable UI elements, and admin configuration tools. Form validation uses `react-hook-form` and `zod`.

**Navigation Structure (Nov 2025):**
- Manager Dashboard: Production (Product Master, Raw Materials, Finished Goods), Inventory (UOM, Vendor Master), Operations (Purchase Orders, Issuance, Gatepasses, Invoices)
- Admin Dashboard (Flat Navigation - No Dropdowns): 
  1. Overview Dashboard
  2. Sales Dashboard
  3. Configuration (Users, Role Permissions, Machines, Machine Types, Spare Parts, PM Templates, UOM, Vendor Master, Notification Settings)
  4. Production (Product Master, Checklist Builder, Raw Materials, Finished Goods)
  5. Operations (Maintenance, PM History, Purchase Orders)
  6. Production Operations (Raw Material Issuance, Gatepasses, Sales Invoices, Machine Startup Reminders)

### Backend Architecture
The backend is an Express.js application with TypeScript and Node.js. It features Email/Password Authentication with `scrypt` and `Passport.js`, and a Dynamic Role-Based Access Control (RBAC) system for `admin`, `manager`, `operator`, and `reviewer` roles with granular, screen-level permissions. Neon Serverless PostgreSQL is the database, accessed via Drizzle ORM. The schema includes core tables for users, machines, checklists, inventory, transactions, and GST-compliant invoices. It supports multi-item issuance, a Header-Detail pattern for transactional integrity, automatic inventory management, a comprehensive Vendor Master System, and a Role Management System.

**Authentication Implementation (Fixed Nov 2025):** The `getUserByUsername()` function now queries by both username AND email using Drizzle's `or()` operator. This allows users to log in with either their username or email address. Admin credentials: username=`admin` OR email=`admin@kinto.com`, password=`admin123`.

### API Design
The RESTful API under `/api` uses JSON, provides structured error handling, implements comprehensive audit logging, and features multi-layer authorization (`isAuthenticated`, `requireRole`) with fresh database lookups for role validation.

### Build & Deployment
Development uses a Vite dev server with an `tsx`-powered Express backend. Production builds bundle the frontend with Vite and the backend with `esbuild`. Database schema management uses Drizzle Kit.

### Key Features
- **Comprehensive Reporting System:** Printable reports for Raw Material Issuance, Purchase Orders, PM Execution, Gatepass (3-copy), and GST-Compliant Invoices. Reports are print-optimized HTML/CSS for A4, with company branding and signature blocks.
- **Sales Dashboard:** Provides sales analytics including revenue, goods sold, total orders, and average order value, with flexible time period filters (Monthly, Quarterly, Half-Yearly, Yearly) and year selection. Accessible by Admin and Manager roles.
- **Machine Startup Reminder System:** Allows managers to assign machine startup tasks to operators, tracks configurable warmup times per machine, and sends automated multi-channel (WhatsApp, Email via Twilio/SendGrid) reminders before scheduled production. Supports bulk assignment, task status tracking (pending → notified → completed → cancelled), and full CRUD operations. Configuration for notifications is available via Admin settings and environment variables.
- **Missed Checklist Notification System:** Automatically detects checklist assignments that pass their due date without completion and sends WhatsApp alerts to multiple recipients (operator, reviewer, manager, and all admins). The system runs periodic checks every 5 minutes, tracks notification status to prevent duplicates, and supports both test mode (console logging) and production mode (Twilio API integration). Manual triggering is available via `/api/cron/missed-checklists` endpoint for testing purposes.
- **Invoice-First Gatepass Flow:** Gatepasses require an invoice to be created first. The workflow is:
  1. Create an invoice (Operations → Invoices)
  2. Create a gatepass and select the invoice
  3. Items auto-populate from the invoice (read-only - cannot manually add/remove/edit)
  
  **Key Points:**
  - The items section **only displays when an invoice is selected**
  - If no invoice is selected, items section is hidden and gatepass cannot be created
  - This ensures complete data consistency between invoices and gatepasses
  - Once an invoice is linked to an active gatepass, it cannot be reused
  - When a gatepass is deleted (soft deleted), the linked invoice becomes available for reuse
- **Cluster Flag for Mobile Integration:** Added `is_cluster` column to vendors, gatepasses, and invoices tables. This flag (0=Individual, 1=Cluster) is automatically copied from vendor to gatepass/invoice during creation, eliminating the need for table joins in mobile app queries. The flag is displayed in the Vendor Master table and managed via a checkbox in the vendor form.
- **Enhanced Invoice Form (Nov 2025):** The invoice form features a compact single-line item layout (Product, HSN, Description, Qty, Price, GST, Remove in one row) for better UX and reduced scrolling. Added Seller Details section above Buyer Details with fields for seller name, GSTIN, address, state, and state code (pre-populated with KINTO Manufacturing details). Includes Print Preview button that opens a formatted, print-ready invoice in a new window with proper styling, company details, item table, tax summary, payment details, signature block, and a Print button. The preview safely handles numeric conversions to prevent runtime errors.
- **Gatepass Print Functionality (Nov 2025):** Added Print Preview button to the gatepass form (available after saving). When clicked, opens a formatted, print-ready gatepass in a new window featuring company branding, gatepass details (number, date, vehicle, driver, customer, destination), itemized product list with quantities and UOM, remarks section, and signature blocks for Prepared By, Checked By, and Authorized Signatory. Includes a Print button for direct printing.
- **Centralized Reports Module (Nov 2025):** Implemented a comprehensive Reports page (client/src/pages/reports.tsx) accessible from both Admin and Manager dashboards. Features include:
  - **Tabbed Interface**: Six report types (Gatepasses, Invoices, Raw Material Issuances, Purchase Orders, PM Execution, GST Reports) with icons and filtered record counts
  - **Print Preview**: Each operational tab includes print preview buttons that open formatted, print-ready reports in new windows using existing printable components (PrintableGatepass, PrintableInvoice, PrintableRawMaterialIssuance, PrintablePurchaseOrder, PrintablePMExecution)
  - **Smart Filtering**: Date range filters (From/To) apply to all report types using appropriate date fields; Customer filter populated with unique customers from gatepasses and invoices, applies only to relevant tabs (Gatepasses and Invoices)
  - **GST Reports for Filing (Nov 2025)**: Complete GST reporting functionality for upload to GST portal with real HSN data from invoice line items
    - **Report Types**: GSTR-1 (Outward Supplies), GSTR-3B (Summary Return). **Note**: GSTR-2/2A/2B excluded (require vendor invoice data not yet in system), GSTR-9 excluded (complex annual return for future implementation)
    - **Filing Periods**: Monthly, Quarterly, Annual with year and period selection
    - **Export Formats**: JSON (for direct portal upload) and Excel (for review/validation)
    - **Classifications**: Auto-classification of B2B, B2CL (Large), B2CS (Small), Export invoices based on buyer GSTIN and amount
    - **HSN Summary**: **Fully implemented** with real data from invoice_items table. Server-side aggregation by HSN code, UOM, and tax rate via dedicated `/api/gst-reports` POST endpoint
    - **Tax Calculations**: Automatic CGST/SGST (intra-state) and IGST (inter-state) calculation based on seller and buyer states, with accurate tax rate computation
    - **API Endpoint**: `/api/gst-reports` (POST) - Accepts periodType, month, year; returns invoices with items and aggregated HSN summary
    - **Frontend Utilities**: `client/src/lib/gst-reports.ts` - includes `fetchGSTReportData()`, `generateGSTR1()`, `generateGSTR3B()`, JSON/Excel export functions
  - **Navigation**: Added to main sections of both Admin and Manager dashboards for easy access to all operational and compliance reports
  - **Data Sources**: Uses TanStack Query to fetch from /api/gatepasses, /api/invoices, /api/raw-material-issuances, /api/purchase-orders, /api/pm-executions
- **Professional Delete Confirmations (Nov 2025):** Implemented shadcn AlertDialog confirmation dialogs for all delete operations across the application. Replaces browser confirm() with professional, accessible UI components featuring destructive styling, proper test IDs, and consistent UX. Applied to Vendors, Products, Raw Materials, and Finished Goods in inventory management.
- **Updated Branding (Nov 2025):** Login page updated from "KINTO QA System" to "KINTO Operations & QA" to reflect the comprehensive operations and quality management capabilities of the system. Hero content updated to showcase complete manufacturing operations including inventory, production, invoicing, gatepasses, quality assurance, and comprehensive reporting.

## External Dependencies

### Database
- Neon Serverless PostgreSQL

### Authentication
- Replit Auth (via OpenID Connect)
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

### Other
- Wouter (Routing)
- TanStack Query (Server State Management)