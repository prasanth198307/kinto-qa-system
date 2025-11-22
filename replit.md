# KINTO Operations & QA Management System

## Overview
KINTO Operations & QA is a comprehensive manufacturing operations and quality management system designed to streamline industrial operations, enhance quality control, and prevent errors. It manages production, inventory, purchase orders, invoicing, gatepasses, quality assurance, and preventive maintenance. Key capabilities include FIFO payment allocation, GST-compliant invoice generation, payment tracking, extensive reporting, and two-way WhatsApp integration for machine startup and checklist management. The system supports various user roles through tasks like checklist completion, verification, approval, and configuration, providing a full-stack TypeScript solution for industrial settings.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend uses React 18 with TypeScript, Vite, Wouter, `shadcn/ui` (Radix UI), and Tailwind CSS ("New York" theme, Material Design principles). It adopts a mobile-first approach, incorporates custom styling, features a Vertical Sidebar for navigation with role-based dashboards, and provides dedicated detail pages. Form validation is handled using `react-hook-form` and `zod`.

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
- **Vendor Type Classification System:** Three-tier vendor classification system (Kinto, HPPani, Purejal) based on product brands purchased. Features many-to-many vendor-type relationships with optional primary type designation, complete CRUD API endpoints, and dedicated master data management UI. Designed for automatic type detection during Vyapaar data import based on invoice line item products.

### System Design Choices
- **Authentication:** Users can log in with username or email.
- **Dispatch Workflow:** Invoice-first, tamper-proof state machine with strict backend validation, ConflictError-based race condition prevention, database transactions for atomic updates, and optional digital signature.
- **Inventory Management Logic:** Inventory deduction on gatepass creation. Raw Material inventory supports "Opening Stock Entry Only" and "Ongoing Inventory" modes. Finished goods require explicit quality approval. Invoice/gatepass cancellations trigger automatic inventory returns.
- **Production Reconciliation Design:** `netConsumed` calculated dynamically, composite unique index for data integrity, and server-side enforced role-based edit limits.
- **WhatsApp Integration:** Uses Colloki Flow API with Meta WhatsApp Business Cloud API fallback for interactive checklist completion with AI-assisted response interpretation. Features include assignment-linked conversation sessions, multi-format answer support with secure photo storage, database transactions with row-level locking, snapshot data architecture, pending photo queue, validated photo download routes, 24-hour session expiry, automatic submission, and AI-powered response interpretation with confidence-based gating.
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