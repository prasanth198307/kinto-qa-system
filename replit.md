# KINTO Operations & QA Management System

## Overview
KINTO Operations & QA is a comprehensive manufacturing operations and quality management system. It manages production, inventory, purchase orders, invoicing, gatepasses, quality assurance, and preventive maintenance. The system supports various user roles through tasks like checklist completion, verification, approval, and configuration. Key capabilities include FIFO payment allocation, GST-compliant invoice generation, payment tracking, extensive reporting, and two-way WhatsApp integration for machine startup and checklist management. This full-stack TypeScript solution aims to streamline industrial operations, enhance quality control, and prevent errors in industrial settings.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend uses React 18 with TypeScript, Vite, Wouter, `shadcn/ui` (Radix UI), and Tailwind CSS ("New York" theme, Material Design principles). It features a mobile-first approach, custom styling, a Vertical Sidebar for navigation with role-based dashboards, and dedicated detail pages. Form validation uses `react-hook-form` and `zod`.

### Technical Implementations
The backend is an Express.js application with TypeScript and Node.js. It uses Email/Password Authentication with `scrypt` and `Passport.js`, and a Dynamic Role-Based Access Control (RBAC) system for granular, screen-level permissions. The database is Neon Serverless PostgreSQL, managed via Drizzle ORM. The system supports multi-item issuance, a Header-Detail pattern for transactions, automatic inventory management, and comprehensive vendor and role management. The API is RESTful JSON with structured error handling, audit logging, and multi-layer authorization.

### Feature Specifications
- **Comprehensive Reporting System:** Generates printable, branded reports for various operations (Raw Material Issuance, Purchase Orders, PM Execution, Gatepass, GST-Compliant Invoices).
- **Sales & Overview Dashboards:** Provides analytics on revenue, orders, and real-time stock levels.
- **Automated Reminder Systems:** Includes Machine Startup Reminders and Missed Checklist Notifications via WhatsApp and Email.
- **WhatsApp Checklist Completion System:** Allows operators to complete checklists via WhatsApp with incremental task submission, photo uploads, and spare part requests.
- **Invoice & Gatepass Management:** Enforces an Invoice-First Gatepass Flow, manages templates, and includes enhanced forms with print preview and smart item entry (auto-fills product details from master data).
- **Centralized Reports Module:** Unified page for operational and GST reports (GSTR-1, GSTR-3B) with filtering and export.
- **Complete Dispatch Tracking Workflow:** A 5-stage workflow (Invoice Creation to Proof of Delivery) with status validation and digital signature.
- **Comprehensive Role Permissions Management:** Granular access control across 26 system screens.
- **Two-Way WhatsApp Integration:** Production-ready integration using Meta WhatsApp Business Cloud API for outbound reminders and inbound checklist completion.
- **Raw Material Type Master System:** Manages raw material definitions with three conversion methods (Formula-Based, Direct-Value, Output-Coverage) and accounts for loss percentage. Integrates with enhanced raw material entry for dual stock management modes.
- **Product Master with Bill of Materials (BOM):** Comprehensive product management with multi-tabbed form interface for Product Info, Packaging & Conversion, Pricing & Tax, and Bill of Materials. Supports empty BOMs and atomic BOM replacements via transactions.
- **BOM-Driven Raw Material Issuance:** Intelligent material issuance system that auto-populates required raw materials based on Product BOM with conversion calculation methods. Allows manual off-BOM item addition.
- **Production Entry System with BOM Variance Analysis:** Tracks actual manufacturing output linked to raw material issuances by shift, with real-time variance analysis comparing expected vs. issued quantities. Automatically integrates with Finished Goods inventory, setting quality status to 'pending'.
- **Production Reconciliation Entry System:** End-of-day reconciliation system that closes the loop between raw material issuance, production, and actual consumption. **Core Workflow:** Links to specific raw material issuances and captures actual quantities used, returned to inventory, and pending (work-in-process). **Dynamic Calculation:** netConsumed is calculated dynamically as (quantityUsed - quantityReturned - quantityPending) rather than stored, preventing data drift. **Role-Based Edit Limits:** Admin users have unlimited edits; other roles are restricted to maximum 3 edits per reconciliation (enforced server-side with edit count tracking). **Inventory Management:** Returned materials automatically update raw material inventory with full audit trail; pending materials tracked as in-process without inventory updates. **Data Integrity:** Composite unique index on (issuanceId, shift) prevents duplicate reconciliations; multi-column indexes optimize dashboard queries. **User Interface:** Complete CRUD workflow with auto-populated forms from issuance data, real-time netConsumed calculation, list view with edit count badges, delete confirmation dialogs, and integration into Manager/Admin dashboards. **Transaction Safety:** All inventory updates wrapped in database transactions for consistency. Database includes productionReconciliations (header with reconciliationNumber, shift, editCount) and productionReconciliationItems (line-level details) tables. API endpoints enforce authentication, role-based authorization, duplicate prevention, and comprehensive error handling with structured responses.
- **Production Reconciliation Report System:** Comprehensive reporting module that provides detailed reconciliation analysis with Excel and PDF export functionality. **Report Features:** Displays reconciliation header details (reconciliation number, issuance number, product, shift, date), itemized breakdown of all raw materials with issued quantities, quantities used/returned/pending, and calculated net consumption with variance percentages. **Export Options:** Excel export with formatted worksheets including company branding, and PDF export with professional layout and variance highlighting. **Access Control:** Available to Manager and Admin roles with seamless integration into role-based dashboards.
- **Variance Analytics Dashboard:** Advanced analytics system providing trend analysis of production efficiency and material usage variances. **Time-Period Analysis:** Supports weekly, monthly, quarterly, and yearly aggregation with year selection. **Key Metrics:** Calculates and visualizes average variance percentage, efficiency percentage, and yield percentage across time periods. **Status Classification:** Color-coded variance indicators (green ≤2% good, yellow 2-5% warning, red >5% critical) with distribution tracking over time. **Visualizations:** Five chart types using recharts: variance trend line chart, efficiency & yield dual-trend line chart, status distribution stacked bar chart, top materials by variance horizontal bar chart, and summary cards with trend indicators. **Data Integrity:** Backend API scopes all reconciliation items to selected year using inArray filtering to prevent historic data bleed, ensuring accurate period metrics and material rankings. **Performance:** Optimized queries with proper year-based filtering for production datasets. **Access Control:** Available to Manager and Admin roles with navigation integration in both dashboards.
- **Sales Returns & Damage Handling System with Automatic Credit Notes and Manual Tracking:** Manages post-delivery returns with a three-stage workflow (Pending → Received → Inspected). Includes quality segregation, inventory reconciliation, and intelligent credit note generation with time-based processing rules. **Same-Month Returns (<30 days):** When a sales return is inspected within 30 days AND in the same month as the original invoice, the system automatically creates a GST-compliant credit note (format: CN-{invoiceNumber}-{seq}) with full line-item details, tax breakups (CGST, SGST, IGST), and proper accounting adjustments. **Old Returns (>30 days):** Returns inspected more than 30 days after the invoice are flagged with `credit_note_status: 'manual_required'` and a manual credit note request is created in the `manual_credit_note_requests` table for tracking. This ensures GST compliance by preventing automatic credit notes in different tax periods while maintaining visibility of items requiring manual processing. The system calculates days since invoice and provides clear messaging to managers about which returns need manual GST-compliant handling. Creates new Finished Goods inventory records with batch suffixes (-RETURNED/-DAMAGED) and quality statuses ('approved'/'rejected') based on inspection. Database includes salesReturns (with credit_note_status field), salesReturnItems, creditNotes, creditNoteItems, and manualCreditNoteRequests tables. API endpoints support returns management, credit note viewing, and manual processing tracking with role-based access.

### System Design Choices
- **Authentication:** Users can log in with username or email.
- **Database Schema:** Includes `is_cluster` and status tracking fields for dispatch and WhatsApp.
- **Dispatch Workflow:** Invoice-first, tamper-proof state machine with backend validation and digital signature.
- **Inventory Management Logic:** Inventory deduction on gatepass creation. Raw Material inventory supports "Opening Stock Entry Only" and "Ongoing Inventory" modes. Finished goods require explicit quality approval. Invoice cancellation is restricted if a gatepass exists; gatepass cancellation automatically returns items to Finished Goods inventory. Production reconciliation returned materials automatically update raw material inventory with audit trail.
- **Production Reconciliation Design:** netConsumed calculated dynamically (not stored) as quantityUsed - quantityReturned - quantityPending. Composite unique index enforces one reconciliation per issuance+shift combination. Role-based edit limits enforced server-side with persistent edit count tracking.
- **WhatsApp Integration:** Uses Meta WhatsApp Business Cloud API for incremental checklist completion, including photo uploads and spare part requests.
- **Build & Deployment:** Uses Vite for frontend, `tsx` for Express dev, and `esbuild` for backend production. Drizzle Kit manages database schema.
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

### Other
- Wouter (Routing)
- TanStack Query (Server State Management)