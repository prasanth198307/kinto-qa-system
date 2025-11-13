# KINTO Operations & QA Management System

## Overview
KINTO Operations & QA is a comprehensive manufacturing operations and quality management system. It manages production, inventory, purchase orders, invoicing, gatepasses, quality assurance, and preventive maintenance. The system supports various user roles through tasks like checklist completion, verification, approval, and configuration. Key capabilities include FIFO payment allocation, GST-compliant invoice generation, payment tracking, extensive reporting, and two-way WhatsApp integration for machine startup and checklist management. This full-stack TypeScript solution aims to streamline industrial operations, enhance quality control, and prevent errors in industrial settings.

## Recent Changes
- **2025-11-13**: Phase 1 Foundation Complete (TC 19.1, 19.2) - Implemented Product Category & Type Master Data Management with display order support. Schema updated: added `displayOrder: integer` to both tables (migration: 20251113_060000). UI refactored: fixed field name mismatch (categoryName/typeName → code/name), added displayOrder input field, updated isActive type (varchar 'true'/'false'), added code field display. Both pages fully functional with CRUD operations, unique code validation, and display order sorting (NULL values sort last).
- **2025-11-13**: Production Reconciliation Complete Implementation - Fixed 6 critical bugs: (1) DialogOverlay z-index elevated to z-[60] preventing overlay from blocking submit button, (2) Form watch pattern prevents stale subscriptions, (3) Sync effects with guards against undefined/pristine fields prevent data loss, (4) Auto-fill protection prevents overwrites in edit mode, (5) Production entry made REQUIRED per business rules - removed "(Optional)" label, removed "none" option, added submit validation, (6) TypeScript fixes for watch subscription patterns. TC 26.2 Phase 2-3 PASSED ✅ (Invoice INV-1763008388849 → Gatepass GP-1763008568165, inventory 100→50 units).
- **2025-11-13**: Fixed Raw Material Issuance form submission bugs - Resolved 4 critical bugs preventing form submission: (1) Optional string fields now transform `null` to `""` for backend compatibility, (2) UUID fields (productId, uomId) now transform empty strings to `null` to prevent FK violations, (3) Added 3-layer effectiveUomId resolution (material.uomId → type.uomId → null) to fix BOM auto-population using display names instead of UUIDs, (4) Updated `calculateBOMSuggestions` to use effectiveUomId. Test TC 20.1 (BOM-Driven Issuance) PASSED ✅. Payload transformation now properly handles: UUID fields `.trim() || null`, text fields `.trim() || ""`, numbers `Number.isFinite() ? val : null`.
- **2025-11-13**: Fixed Dialog overlay blocking Select dropdowns - Elevated shared `SelectContent` component from `z-50` to `z-[100]` to ensure dropdowns appear above Dialog overlays. Z-index hierarchy documented: Dialog overlay (50) < Select dropdown (100) < Toast/Sheet (higher). This fix applies to all dialog-based forms throughout the application.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend uses React 18 with TypeScript, Vite, Wouter, `shadcn/ui` (Radix UI), and Tailwind CSS ("New York" theme, Material Design principles). It features a mobile-first approach, custom styling, a Vertical Sidebar for navigation with role-based dashboards, and dedicated detail pages. Form validation uses `react-hook-form` and `zod`.

### Technical Implementations
The backend is an Express.js application with TypeScript and Node.js. It uses Email/Password Authentication with `scrypt` and `Passport.js`, and a Dynamic Role-Based Access Control (RBAC) system for granular, screen-level permissions. The database is Neon Serverless PostgreSQL, managed via Drizzle ORM. The system supports multi-item issuance, a Header-Detail pattern for transactions, automatic inventory management, and comprehensive vendor and role management. The API is RESTful JSON with structured error handling, audit logging, and multi-layer authorization.

### Feature Specifications
- **Comprehensive Reporting System:** Generates printable, branded reports for various operations (Raw Material Issuance, Purchase Orders, PM Execution, Gatepass, GST-Compliant Invoices) and includes sales/overview dashboards and unified operational/GST reports.
- **Automated Reminder Systems:** Includes Machine Startup Reminders and Missed Checklist Notifications via WhatsApp and Email.
- **WhatsApp Checklist Completion System:** Allows operators to complete checklists via WhatsApp with incremental task submission, photo uploads, and spare part requests.
- **Invoice & Gatepass Management:** Enforces an Invoice-First Gatepass Flow, manages templates, and includes enhanced forms with print preview and smart item entry.
- **Complete Dispatch Tracking Workflow:** A 5-stage workflow (Invoice Creation to Proof of Delivery) with status validation and digital signature.
- **Comprehensive Role Permissions Management:** Granular access control across 36 system screens with metadata-driven UI.
- **Raw Material Type Master System:** Manages raw material definitions with three conversion methods and accounts for loss percentage. Integrates with enhanced raw material entry for dual stock management modes.
- **Product Master with Bill of Materials (BOM):** Comprehensive product management with multi-tabbed form interface, supporting empty BOMs and atomic BOM replacements.
- **BOM-Driven Raw Material Issuance:** Intelligent material issuance system that auto-populates required raw materials based on Product BOM with conversion calculation methods.
- **Production Entry System with BOM Variance Analysis:** Tracks actual manufacturing output linked to raw material issuances by shift, with real-time variance analysis.
- **Production Reconciliation Entry System:** End-of-day reconciliation system that closes the loop between raw material issuance, production, and actual consumption. Dynamically calculates `netConsumed`, enforces role-based edit limits, manages inventory updates with audit trails, and ensures data integrity through composite unique indexes.
- **Production Reconciliation Report System:** Provides detailed reconciliation analysis with Excel and PDF export functionality, displaying header details, itemized breakdown, and variance percentages.
- **Variance Analytics Dashboard:** Advanced analytics system providing trend analysis of production efficiency and material usage variances across various time periods. Features key metrics, color-coded variance indicators, and multiple chart types for visualization.
- **Sales Returns & Damage Handling System:** Manages post-delivery returns with a three-stage workflow, including quality segregation, inventory reconciliation, and intelligent credit note generation based on time-based processing rules (automatic for same-month returns, manual tracking for older returns).
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