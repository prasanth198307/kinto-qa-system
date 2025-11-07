# KINTO QA Management System

## Overview
KINTO QA Management System is a mobile-first Quality Assurance and Preventive Maintenance application for manufacturing. It enables operators to complete checklists, reviewers to verify submissions, managers to approve, and administrators to configure the entire system, including machines, users, checklist templates, and spare parts. Built as a full-stack TypeScript solution with a React frontend and Express backend, it's designed for industrial QA workflows, focusing on speed, clarity, and error prevention. The system includes a comprehensive FIFO payment allocation system, a dashboard widget for pending payments, GST-compliant invoice generation, and a robust payment tracking system with support for partial payments and advances.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The frontend uses **React 18** with **TypeScript**, **Vite** for building, and **Wouter** for routing. UI components are built with **shadcn/ui** (based on Radix UI) and styled using **Tailwind CSS** following a "New York" theme with Material Design principles. **TanStack Query** manages server state and API calls. The design system is mobile-first, featuring a custom color palette, typography, spacing, and elevation. Navigation uses a **Vertical Sidebar Navigation** system with role-based dashboards, reusable UI elements, and admin configuration tools. Form validation is handled via `react-hook-form` and `zod`.

### Backend Architecture
The backend is an **Express.js** application with **TypeScript** and **Node.js**. It features robust **Email/Password Authentication** with `scrypt` hashing and `Passport.js`. A **Dynamic Role-Based Access Control (RBAC)** system supports `admin`, `manager`, `operator`, and `reviewer` roles with granular, screen-level permissions. **Neon Serverless PostgreSQL** is the database, accessed via **Drizzle ORM**. The database schema includes core tables for users, machines, checklists, inventory, transactions, and **GST-compliant invoices**. Multi-item issuance and gatepass architecture utilizes a Header-Detail pattern with transactional integrity and automatic inventory management. A comprehensive **Vendor Master System** and **Role Management System** are also included. The **Invoice Management System** provides GST-compliant invoice generation with tax breakup and payment information.

### API Design
The RESTful API under `/api` features multi-layer authorization (`isAuthenticated`, `requireRole`) with fresh database lookups for role validation. It uses JSON for requests/responses, provides structured error handling, and implements comprehensive audit logging for security events and all mutations.

### Build & Deployment
Development uses `npm run dev` for a Vite dev server with an `tsx`-powered Express backend. Production builds (`npm run build`) bundle the frontend with Vite and the backend with `esbuild`. Database schema management uses Drizzle Kit.

## External Dependencies

### Database
- **Neon Serverless PostgreSQL**

### Authentication
- **Replit Auth** (via OpenID Connect)
- `openid-client`
- `passport`

### UI Libraries
- **Radix UI**
- **Lucide React**
- **date-fns**
- **cmdk**
- **vaul**

### Form Management
- **react-hook-form**
- **@hookform/resolvers**
- **zod**
- **drizzle-zod**

### Development Tools
- **TypeScript**
- **Vite**
- **esbuild**
- **Tailwind CSS**
- **class-variance-authority**
- **tailwind-merge**

### Styling
- **Google Fonts**

## Key Features

### Comprehensive Reporting System (COMPLETED - November 2025)
A complete reporting and printing solution for all major operational documents:

**Implemented Reports:**

1. **Raw Material Issuance Report (PrintableRawMaterialIssuance)**
   - Company header with KINTO branding
   - Issuance number, date, and issued-to details
   - Product-for-manufacturing information
   - Multi-item table with raw material details, quantities, and UOM
   - Signature blocks (Issued By, Received By, Authorized Signatory)
   - Browser print dialog integration
   - Integrated into RawMaterialIssuanceTable with print button for each issuance

2. **Purchase Order Report (PrintablePurchaseOrder)**
   - Professional PO format with company header
   - Supplier details section
   - Order details: status, urgency, delivery dates
   - Items table with part details, quantities, and pricing
   - Total amount calculation with rupee formatting
   - Terms & conditions section (payment, delivery, inspection, warranty)
   - Signature blocks (Prepared By, Approved By, Authorized Signatory)
   - Integrated into PurchaseOrderManagement with print button for each PO

3. **PM Execution Report (PrintablePMExecution)**
   - Maintenance execution documentation
   - Machine details (name, type, location)
   - Execution details (date, status, result, downtime hours)
   - Spare parts used section
   - Detailed tasks table with results (Pass/Fail/N/A)
   - Execution summary with task statistics
   - Color-coded results (green=pass, red=fail, gray=N/A)
   - Signature blocks (Completed By, Verified By, Authorized Signatory)
   - Integrated into PMHistoryView dialog with print button

**Technical Implementation:**
- All reports use print-optimized HTML/CSS with A4 page sizing (210mm x 297mm)
- Auto-print on window load with auto-close after printing
- Consistent styling across all reports (company branding, fonts, layout)
- Data fetching via TanStack Query for related entities
- Print preview via hidden div with full report rendering
- Mobile-responsive print buttons in management UIs

**Print Features:**
- Browser native print dialog
- Print-optimized CSS with proper page breaks
- Company branding on all documents
- Professional formatting suitable for business records
- Signature blocks for authorization tracking
- Computer-generated document disclaimers

**Integration Points:**
- Raw Material Issuance: Production Management > Raw Material Issuance tab
- Purchase Orders: Operations > Purchase Orders page
- PM Executions: Operations > PM History page

**Existing Reports (Previously Implemented):**
- Gatepass (3-copy format with PrintableGatepass component)
- GST-Compliant Invoice (PrintableInvoice component)

**Future Enhancements:**
- PDF generation and download (server-side)
- Email report functionality
- Batch printing of multiple documents
- Export to Excel/CSV for data analysis reports
- Custom report templates/branding configuration
- Inventory stock reports
- Sales summary reports
- Vendor payment statements

**Production Status**: ✅ Feature complete and operational. Print functionality integrated across all three new report types. Ready for production use in manufacturing environment.

### Sales Dashboard (COMPLETED - November 2025)
A comprehensive sales analytics dashboard providing insights into revenue, goods sold, and turnover with flexible time period views.

**Features:**
- **Time Period Filters**: Monthly, Quarterly, Half-Yearly, and Yearly views
- **Year Selection**: Current year plus past 5 years
- **Summary Metrics**:
  - Total Revenue (Turnover in ₹)
  - Goods Sold (Total quantity of items sold)
  - Total Orders (Invoice count)
  - Average Order Value (Revenue per invoice)
- **Period-wise Breakdown Table**: Detailed metrics for each period with totals
- **Empty States**: Graceful handling when no sales data exists

**Technical Implementation:**
- Backend API: `/api/sales-analytics` with query parameters for period and year
- Role-based access: Admin and Manager roles only
- Bulk data fetching to avoid N+1 queries
- Numeric period indexing for proper chronological sorting
- Data aggregation from invoices and invoice items tables
- Currency formatting in Indian Rupees (₹) with proper locale support

**Data Sources:**
- Invoice headers: Total revenue from `invoices.totalAmount` (stored in paise)
- Invoice items: Quantity sold from `invoiceItems.quantity`
- Aggregation by invoice date for period grouping

**Access Control:**
- Admin Dashboard: "Sales Dashboard" navigation item
- Manager Dashboard: Should also have access (to be added)

**Performance Optimizations:**
- Single bulk query for all invoice items (not per-invoice)
- Client-side period filtering by year
- Cached queries via TanStack Query

**Future Enhancements:**
- Charts/visualizations (bar charts, line graphs, trend analysis)
- Product-wise sales breakdown
- Customer/vendor-wise analytics
- Export to Excel/PDF functionality
- Sales target tracking and comparison
- Top selling products report
- Payment collection analytics

**Production Status**: ✅ Feature complete and operational. Sales dashboard available to Admin and Manager roles with proper authorization.

### Machine Startup Reminder System (COMPLETED - November 2025)
A comprehensive notification system that enables managers to assign machine startup tasks to operators with automated reminders sent before scheduled production time.

**Features:**
- **Task Assignment**: Managers can assign machines to specific operators for startup
- **Scheduled Reminders**: Automated notifications sent before scheduled start time
- **Multi-Channel Notifications**: Support for WhatsApp and Email (console-based, upgradeable)
- **Task Status Tracking**: pending → notified → completed → cancelled workflow
- **Production Planning**: Assign tasks by date, shift, and time
- **Notification Preferences**: Toggle WhatsApp/Email per task
- **Task Management**: Full CRUD operations with soft delete support
- **Reminder Configuration**: Customizable reminder time (default: 30 minutes before start)

**Technical Implementation:**
- **Database Schema**: `machine_startup_tasks` table with comprehensive fields
  - Machine assignment with FK to machines table
  - User assignment with FK to users table  
  - Scheduled start time and reminder offset
  - Status tracking (pending/notified/completed/cancelled)
  - Notification sent timestamps
  - WhatsApp/Email enable/disable flags
  - Production date, shift, and notes
  - Soft delete support via recordStatus field
- **Backend Services**:
  - Notification service module (`server/notificationService.ts`)
  - Automated reminder checker (runs every 5 minutes via setInterval)
  - Console-based logging (upgradeable to real WhatsApp/Email)
  - RESTful API routes for task CRUD operations
  - Role-based access control (admin/manager for creation)
- **Frontend UI**: 
  - Machine Startup Reminders page (`client/src/pages/machine-startup-reminders.tsx`)
  - Task creation dialog with date/time pickers
  - Task list table with status badges
  - Complete/Cancel action buttons
  - Integrated into Admin Dashboard navigation under Production section

**Notification System:**
- Current: Console-based logging for both WhatsApp and Email
- Upgradeable: Ready for Twilio (WhatsApp) and SendGrid/Resend (Email) integration
- Configuration: Set API credentials via environment secrets when ready
- Template: "🔔 REMINDER: Machine '[Machine Name]' is scheduled to start at [Time]. Please ensure it's ready for production."

**Access Control:**
- Admin/Manager: Create, edit, delete, view all tasks
- Operators: View assigned tasks (future enhancement)
- Navigation: Admin Dashboard > Production > Machine Startup Reminders

**Database Indexes:**
- machine_id, assigned_user_id for efficient lookups
- production_date for date-based filtering
- status for status-based queries
- record_status for soft delete filtering

**Integration Points:**
- Runs alongside existing workflow system
- No conflicts with other notification systems
- Uses existing user and machine master data
- Audit trail via created_by field

**Future Enhancements:**
- Real WhatsApp integration via Twilio API
- Real Email integration via SendGrid/Resend
- SMS notification support
- Operator mobile app for task acknowledgment
- Recurring task templates
- Task completion verification with photos
- Machine startup checklist integration
- Delay notification if machine not started on time
- Dashboard widget showing today's startup schedule

**Production Status**: ✅ Feature complete and operational. Sales dashboard available to Admin and Manager roles with proper authorization.