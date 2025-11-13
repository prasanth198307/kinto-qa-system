# KINTO Operations & QA Management System

## Overview
KINTO Operations & QA is a comprehensive manufacturing operations and quality management system designed to streamline industrial operations, enhance quality control, and prevent errors. It manages production, inventory, purchase orders, invoicing, gatepasses, quality assurance, and preventive maintenance. Key features include FIFO payment allocation, GST-compliant invoice generation, payment tracking, extensive reporting, and two-way WhatsApp integration for machine startup and checklist management. The system supports various user roles through tasks like checklist completion, verification, approval, and configuration, providing a full-stack TypeScript solution for industrial settings.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend utilizes React 18 with TypeScript, Vite, Wouter, `shadcn/ui` (Radix UI), and Tailwind CSS ("New York" theme, Material Design principles). It adopts a mobile-first approach, incorporates custom styling, features a Vertical Sidebar for navigation with role-based dashboards, and provides dedicated detail pages. Form validation is handled using `react-hook-form` and `zod`.

### Technical Implementations
The backend is an Express.js application built with TypeScript and Node.js. It employs Email/Password Authentication with `scrypt` and `Passport.js`, alongside a Dynamic Role-Based Access Control (RBAC) system for granular, screen-level permissions. The database is Neon Serverless PostgreSQL, managed via Drizzle ORM. The system supports multi-item issuance, a Header-Detail pattern for transactions, automatic inventory management, and comprehensive vendor and role management. The API is RESTful JSON, featuring structured error handling, audit logging, and multi-layer authorization.

### Feature Specifications
- **Comprehensive Reporting System:** Generates printable, branded reports for various operations (Raw Material Issuance, Purchase Orders, PM Execution, Gatepass, GST-Compliant Invoices) and includes sales/overview dashboards and unified operational/GST reports.
- **Automated Reminder Systems:** Includes Machine Startup Reminders and Missed Checklist Notifications via WhatsApp and Email.
- **WhatsApp Checklist Completion System:** Enables operators to complete checklists via WhatsApp with incremental task submission, photo uploads, and spare part requests.
- **Invoice & Gatepass Management:** Enforces an Invoice-First Gatepass Flow, manages templates, and includes enhanced forms with print preview and smart item entry.
- **Complete Dispatch Tracking Workflow:** A 5-stage workflow from Invoice Creation to Proof of Delivery, including status validation and digital signature.
- **Comprehensive Role Permissions Management:** Granular access control across 36 system screens with metadata-driven UI.
- **Raw Material Type Master System:** Manages raw material definitions with three conversion methods and accounts for loss percentage, integrating with enhanced raw material entry for dual stock management modes.
- **Product Master with Bill of Materials (BOM):** Comprehensive product management with a multi-tabbed form interface, supporting empty BOMs and atomic BOM replacements.
- **BOM-Driven Raw Material Issuance:** Intelligent material issuance system that auto-populates required raw materials based on Product BOM with conversion calculation methods.
- **Production Entry System with BOM Variance Analysis:** Tracks actual manufacturing output linked to raw material issuances by shift, with real-time variance analysis.
- **Production Reconciliation Entry System:** End-of-day reconciliation system that closes the loop between raw material issuance, production, and actual consumption. It dynamically calculates `netConsumed`, enforces role-based edit limits, manages inventory updates with audit trails, and ensures data integrity through composite unique indexes.
- **Production Reconciliation Report System:** Provides detailed reconciliation analysis with Excel and PDF export functionality, displaying header details, itemized breakdown, and variance percentages.
- **Variance Analytics Dashboard:** Advanced analytics system providing trend analysis of production efficiency and material usage variances across various time periods, featuring key metrics, color-coded variance indicators, and multiple chart types for visualization.
- **Sales Returns & Damage Handling System:** Manages post-delivery returns with a three-stage workflow, including quality segregation, inventory reconciliation, and intelligent credit note generation.
- **Product Category & Type Master Data Management:** Comprehensive master data management for product categorization with full CRUD functionality, including display order management.
- **Pending Payments Tracking Dashboard:** Dedicated financial tracking page displaying outstanding invoice payments, invoice-wise outstanding balances, total paid amounts, payment history, and overdue indicators.
- **Credit Notes Viewing System:** Complete credit note management interface for viewing GST-compliant credit notes generated from sales returns, with detailed line-item views and tax calculations.
- **Complete Admin Navigation System (36 Screens):** Organized admin dashboard navigation across 6 logical sections (Main, Configuration, Production, Operations, Finance & Sales, Production Operations) with relevant quick actions and icons.

### System Design Choices
- **Authentication:** Users can log in with username or email.
- **Dispatch Workflow:** Invoice-first, tamper-proof state machine with backend validation and digital signature.
- **Inventory Management Logic:** Inventory deduction on gatepass creation. Raw Material inventory supports "Opening Stock Entry Only" and "Ongoing Inventory" modes. Finished goods require explicit quality approval. Invoice/gatepass cancellations trigger automatic inventory returns. Production reconciliation returned materials update raw material inventory with audit trail.
- **Production Reconciliation Design:** `netConsumed` calculated dynamically, composite unique index for data integrity, and server-side enforced role-based edit limits.
- **WhatsApp Integration:** Uses Meta WhatsApp Business Cloud API for incremental checklist completion, including photo uploads and spare part requests.
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

### Other
- Wouter (Routing)
- TanStack Query (Server State Management)