# KINTO Operations & QA Management System

## Overview
KINTO Operations & QA is a comprehensive manufacturing operations and quality management system designed to streamline industrial operations, enhance quality control, and prevent errors. It manages production, inventory, purchase orders, invoicing, gatepasses, quality assurance, and preventive maintenance. Key features include FIFO payment allocation, GST-compliant invoice generation, payment tracking, extensive reporting, and two-way WhatsApp integration for machine startup and checklist management. The system supports various user roles through tasks like checklist completion, verification, approval, and configuration, providing a full-stack TypeScript solution for industrial settings. The business vision is to modernize industrial operations, improve efficiency, and ensure high-quality output.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend uses React 18 with TypeScript, Vite, Wouter, `shadcn/ui` (Radix UI), and Tailwind CSS ("New York" theme, Material Design principles) with a mobile-first approach. It incorporates custom styling, a Vertical Sidebar for role-based navigation, dedicated detail pages, and form validation with `react-hook-form` and `zod`. The UI prioritizes a sleek, space-efficient design suitable for data-dense industrial operations, featuring reduced spacing, compact typography, and accessible components.

### Technical Implementations
The backend is an Express.js application built with TypeScript and Node.js, using Neon Serverless PostgreSQL managed via Drizzle ORM. It features Email/Password Authentication with `scrypt` and `Passport.js`, and a Dynamic Role-Based Access Control (RBAC) system. The system supports multi-item issuance, a Header-Detail pattern for transactions, automatic inventory management, and comprehensive vendor and role management. The API is RESTful JSON with structured error handling, audit logging, and multi-layer authorization.

### Feature Specifications
- **Comprehensive Reporting:** Generates printable, branded reports, sales/overview dashboards, and unified operational/GST reports for various documents like Invoices, Gatepasses, and Purchase Orders.
- **Automated Reminders:** Machine Startup Reminders and Missed Checklist Notifications via WhatsApp and Email.
- **WhatsApp Interactive Checklist System:** Production-ready interactive Q&A system for checklist completion with multi-format answers, secure photo downloads, and atomic database transactions.
- **Invoice & Gatepass Management:** Enforces an Invoice-First Gatepass Flow, manages templates, includes enhanced forms with print preview, smart item entry, automatic UPI payment QR code generation, manual credit note creation, and cancel/reissue functionality for invoice corrections.
- **Complete Dispatch Tracking Workflow:** A 5-stage workflow from Invoice Creation to Proof of Delivery with strict state machine enforcement, TOCTOU race condition protection, atomic status updates, and optional digital signature.
- **Comprehensive Role Permissions Management:** Granular access control across 37+ system screens with metadata-driven UI and API-level permission enforcement.
- **Raw Material & Product Master Systems:** Manages raw material definitions with conversion methods and loss percentages, and comprehensive product management with Bill of Materials (BOM).
- **BOM-Driven Production:** Intelligent material issuance based on BOMs and production entry with BOM variance analysis. Supports multi-BOM configurations per product.
- **FIFO Batch Allocation:** Automatic allocation of raw materials from oldest batches first, with detailed breakdown for multi-batch production scenarios.
- **Production Reconciliation & Analytics:** End-of-day reconciliation, detailed reports, and a Variance Analytics Dashboard.
- **Sales Returns & Damage Handling:** Manages post-delivery returns with a three-stage workflow including quality segregation, inventory reconciliation, intelligent credit note generation, split disposition, repacking queue, and scrap inventory with evidence upload. **Traceability:** Finished goods track `source` field ('production', 'sales_return_restock', 'sales_return_repack') and `salesReturnItemId` linking to original sales return items for full audit trail. **Batch Preservation:** Original batch numbers are preserved throughout all workflows - physical bottle labels remain unchanged. **Consolidated Inventory View:** The Finished Goods tab includes a "Consolidated" view toggle that groups inventory by product and batch number, showing total quantities with source breakdown (Production/Restock/Repack) and expandable detail records for traceability.
- **Master Data Management:** Comprehensive CRUD for Product Category & Type.
- **Financial Tracking:** Pending Payments Tracking Dashboard, Credit Notes Viewing System, and Customer Advances System with multi-payment method support and transaction-safe application to invoices.
- **Vendor Debit Notes System:** Manual debit note creation against vendors for claims with multi-item entries, GST breakdown, and settlement tracking.
- **Admin Navigation & Vendor Classification:** Organized admin dashboard navigation and a three-tier vendor classification system with accurate revenue reporting.
- **Comprehensive Search & Filter System:** Advanced search and filtering across all major data screens.
- **Vyapaar Data Import System:** Excel-based data migration from Vyapaar accounting software with fuzzy matching, intelligent date conversion, and comprehensive error handling. Supports separate Payments.xlsx import with FIFO allocation and de-duplication.
- **Payment Evidence System:** Two-stream payment architecture where Sale Report's "Amount Received" is the immutable ledger, and Payments.xlsx records are linked as payment_evidence for audit.
- **Payment Write-Off System:** Admin-only functionality to write off outstanding invoice balances with transaction-based implementation and audit logging.
- **Comprehensive Pagination System:** Server-side and client-side pagination across modules with URL-based state management, filtering, and sorting.
- **Document Management System:** Store and organize contracts, invoices, certificates with file versioning, category management, vendor/invoice linking, sharing capabilities, and automated expiry alerts.
- **Expense Tracking System:** Record daily expenses with voucher issuance, categorization, payment mode tracking, GST handling, and approval workflow.
- **Daily Cash Register:** Daily business cash flow tracking with Excel import, daily balance tracking, mandatory reconciliation before close day, variance tracking, instant expense voucher auto-generation, and comprehensive reporting.
- **MIS (Management Information System) Module:** Comprehensive executive dashboard with 5 analytics screens: Executive KPI Dashboard, Production Analytics, Inventory Intelligence, Sales Analysis, and Delivery Performance.

### System Design Choices
- **Authentication:** Users can log in with username or email.
- **Dispatch Workflow:** Invoice-first, tamper-proof state machine with strict backend validation, race condition prevention, database transactions, and optional digital signature.
- **Inventory Management Logic:** Inventory deduction on gatepass creation. Raw Material inventory supports "Opening Stock Entry Only" and "Ongoing Inventory" modes. Finished goods require explicit quality approval. Invoice/gatepass cancellations trigger automatic inventory returns. Includes logical stock reservation for invoices to prevent overselling.
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