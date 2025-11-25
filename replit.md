# KINTO Operations & QA Management System

## Overview
KINTO Operations & QA is a comprehensive manufacturing operations and quality management system designed to streamline industrial operations, enhance quality control, and prevent errors. It manages production, inventory, purchase orders, invoicing, gatepasses, quality assurance, and preventive maintenance. Key features include FIFO payment allocation, GST-compliant invoice generation, payment tracking, extensive reporting, and two-way WhatsApp integration for machine startup and checklist management. The system supports various user roles through tasks like checklist completion, verification, approval, and configuration, providing a full-stack TypeScript solution for industrial settings. The business vision is to modernize industrial operations, improve efficiency, and ensure high-quality output.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend utilizes React 18 with TypeScript, Vite, Wouter, `shadcn/ui` (Radix UI), and Tailwind CSS ("New York" theme, Material Design principles) with a mobile-first approach. It incorporates custom styling, a Vertical Sidebar for role-based navigation, dedicated detail pages, and form validation with `react-hook-form` and `zod`. The UI prioritizes a sleek, space-efficient design suitable for data-dense industrial operations, featuring reduced spacing, compact typography, and accessible components.

### Technical Implementations
The backend is an Express.js application built with TypeScript and Node.js, using Neon Serverless PostgreSQL managed via Drizzle ORM. It features Email/Password Authentication with `scrypt` and `Passport.js`, and a Dynamic Role-Based Access Control (RBAC) system. The system supports multi-item issuance, a Header-Detail pattern for transactions, automatic inventory management, and comprehensive vendor and role management. The API is RESTful JSON with structured error handling, audit logging, and multi-layer authorization.

### Feature Specifications
- **Comprehensive Reporting:** Generates printable, branded reports, sales/overview dashboards, and unified operational/GST reports.
- **Automated Reminders:** Machine Startup Reminders and Missed Checklist Notifications via WhatsApp and Email.
- **WhatsApp Interactive Checklist System:** Production-ready interactive Q&A system for checklist completion with multi-format answers, automatic assignment tracking, secure photo downloads, atomic database transactions, snapshot data consistency, and automatic submission.
- **Invoice & Gatepass Management:** Enforces an Invoice-First Gatepass Flow, manages templates, includes enhanced forms with print preview, smart item entry, and automatic UPI payment QR code generation. Features manual credit note creation and cancel/reissue functionality for invoice corrections.
- **Complete Dispatch Tracking Workflow:** A 5-stage workflow from Invoice Creation to Proof of Delivery with strict state machine enforcement, TOCTOU race condition protection, atomic status updates, and optional digital signature.
- **Comprehensive Role Permissions Management:** Granular access control across 36 system screens with metadata-driven UI.
- **Raw Material & Product Master Systems:** Manages raw material definitions with conversion methods, loss percentages, and comprehensive product management with Bill of Materials (BOM).
- **BOM-Driven Production:** Intelligent material issuance based on BOMs and production entry with BOM variance analysis.
- **Production Reconciliation & Analytics:** End-of-day reconciliation, detailed reports, and a Variance Analytics Dashboard.
- **Sales Returns & Damage Handling:** Manages post-delivery returns with a three-stage workflow, including quality segregation, inventory reconciliation, and intelligent credit note generation.
- **Master Data Management:** Comprehensive CRUD for Product Category & Type.
- **Financial Tracking:** Pending Payments Tracking Dashboard and Credit Notes Viewing System.
- **Admin Navigation & Vendor Classification:** Organized admin dashboard navigation and a three-tier vendor classification system based on product brands, with accurate revenue reporting.
- **Comprehensive Search & Filter System:** Advanced search and filtering across all major data screens with consistent UX, performance optimization, and clear empty states.
- **Vyapaar Data Import System:** Excel-based data migration from Vyapaar accounting software with fuzzy matching, intelligent date conversion, automatic vendor type classification, and comprehensive error handling.
- **Payment Write-Off System:** Admin-only functionality to write off outstanding invoice balances with transaction-based implementation, Zod validation, and audit logging.
- **Comprehensive Pagination System:** Implemented server-side and client-side pagination across various modules with URL-based state management, type-safe responses, filtering, sorting, and backward compatibility.

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