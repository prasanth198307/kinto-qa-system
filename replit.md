# KINTO Operations & QA Management System

## Overview
KINTO Operations & QA is a comprehensive manufacturing operations and quality management system designed to manage production, inventory, purchase orders, invoicing, gatepasses, quality assurance, and preventive maintenance. It supports various user roles through tasks like checklist completion, verification, approval, and system configuration. Key capabilities include FIFO payment allocation, GST-compliant invoice generation, robust payment tracking, extensive reporting, and two-way WhatsApp integration for machine startup and checklist management. The system is a full-stack TypeScript solution focused on speed and error prevention in industrial settings, aiming to streamline industrial operations and enhance quality control.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend uses React 18 with TypeScript, Vite, Wouter, `shadcn/ui` (Radix UI), and Tailwind CSS ("New York" theme, Material Design principles). It features a mobile-first approach, custom styling, a Vertical Sidebar for navigation with role-based dashboards, and dedicated detail pages. Form validation is handled by `react-hook-form` and `zod`. A GlobalHeader ensures consistent branding and navigation.

### Technical Implementations
The backend is an Express.js application built with TypeScript and Node.js, featuring Email/Password Authentication using `scrypt` and `Passport.js`. It includes a Dynamic Role-Based Access Control (RBAC) system for `admin`, `manager`, `operator`, and `reviewer` roles with granular, screen-level permissions. The database is Neon Serverless PostgreSQL, managed via Drizzle ORM. The system implements multi-item issuance, a Header-Detail pattern for transactions, automatic inventory management, and comprehensive vendor and role management. The API is RESTful JSON with structured error handling, audit logging, and multi-layer authorization.

### Feature Specifications
- **Comprehensive Reporting System:** Generates printable, branded reports for various operations (Raw Material Issuance, Purchase Orders, PM Execution, Gatepass, GST-Compliant Invoices).
- **Sales & Overview Dashboards:** Provide analytics on revenue, orders, and real-time stock levels.
- **Machine Startup Reminder System:** Manages and tracks machine startup tasks, sending multi-channel reminders (WhatsApp, Email).
- **Missed Checklist Notification System:** Automatically alerts personnel via WhatsApp for overdue checklist assignments.
- **WhatsApp Checklist Completion System:** Allows operators to complete assigned checklists via WhatsApp with incremental task submission, photo uploads for "Not OK" tasks, and optional spare part requests.
- **Invoice-First Gatepass Flow:** Enforces gatepass creation from existing invoices, auto-populating items.
- **Invoice & Gatepass Management:** Includes template management, enhanced invoice forms with print preview, and multi-screen printing options.
- **Centralized Reports Module:** A unified page for operational and GST reports with filtering and export options, including GSTR-1 and GSTR-3B.
- **Complete Dispatch Tracking Workflow:** A 5-stage workflow (Invoice Creation to Proof of Delivery) with strict status validation and digital signature for Proof of Delivery.
- **Comprehensive Role Permissions Management:** Granular access control across 26 system screens (View, Create, Edit, Delete).
- **Two-Way WhatsApp Integration:** Production-ready integration using Meta WhatsApp Business Cloud API for outbound reminders, inbound checklist completion, sender verification, atomic status updates, and analytics.
- **Raw Material Type Master System:** Manages raw material definitions with three conversion methods (Formula-Based, Direct-Value, Output-Coverage) including auto-calculation for conversion values and usable units, accounting for loss percentage.
- **Raw Material Type Master Integration:** Enhanced Raw Material entry screen with automatic type details fetching, dual stock management modes (Opening Stock Entry Only vs Ongoing Inventory), and real-time auto-calculation of closing stock and usable units. The system validates Material Type selection, auto-populates base units and conversion details, and calculates inventory based on the selected mode: Opening Stock Only (closingStock = openingStock) or Ongoing Inventory (closingStock = openingStock + received - returned + adjustments).
- **Product Master with Bill of Materials (BOM):** Comprehensive product management system with multi-tabbed form interface featuring 4 sections: Product Info (code, name, SKU, category via master table, type via master table), Packaging & Conversion Details (units, conversion methods with conditional rendering, loss percentage, auto-calculated usable units), Pricing & Tax Information (base price, GST with real-time total price calculation, HSN/SAC codes, tax type, minimum stock level), and Bill of Materials (dynamic table for raw material linkage with quantity requirements and UOM). The system implements a robust two-step mutation pattern (product save + BOM bulk replace) with graceful partial-failure handling: on BOM save failure after successful product creation, the dialog automatically switches to update mode to prevent duplicate product creation, allowing users to retry BOM save. Supports empty BOM (products without raw material requirements), full type safety via composite ProductFormData schema, and atomic BOM replacements via database transactions. Product Category and Product Type use dedicated master tables (productCategories, productTypes) with UUID primary keys for data consistency, replacing free-text fields with normalized lookups via categoryId/typeId foreign keys while preserving legacy text columns for backward compatibility.
- **BOM-Driven Raw Material Issuance:** Intelligent material issuance system that auto-populates required raw materials based on Product BOM with three conversion calculation methods (Formula-Based, Direct-Value, Output-Coverage). Operators select a product and enter planned output quantity; system automatically calculates and displays suggested quantities for each BOM material alongside editable actual quantities. Features include: Product selector for BOM loading, Production Reference field (Batch ID/FG Name/Shift No), Planned Output entry for quantity calculations, side-by-side display of Suggested vs Actual quantities with calculation basis indicators (formula-based/direct-value/output-coverage badges), manual off-BOM item addition capability tagged as 'manual', deterministic quantity calculations with loss percentage, divide-by-zero protection, and edge case handling. Database stores both suggestedQuantity and calculationBasis for audit trail and variance analysis. System supports mixed BOM/manual workflows, preserves full operator discretion for quantity adjustments, and maintains backward compatibility with non-BOM issuances.
- **Production Entry System with BOM Variance Analysis:** Comprehensive production tracking system that records actual manufacturing output linked to raw material issuances by shift (A/B/General) with real-time variance analysis. Operators select an issuance, enter production date and shift, record produced and rejected quantities, and track empty bottle inventory (produced/used/pending). System auto-calculates derived units (produced quantity × usable derived units from Product Master) for quality metrics. Features include: Issuance selector with auto-populated product and planned output details, shift-based entry (A/B/General) with unique constraint preventing duplicate entries per issuance/date/shift, quantity inputs for produced/rejected/empty bottles, server-side derived units calculation for tamper-proof metrics, and collapsible BOM variance analysis table displaying Material, Type, UOM, Conversion Method, Expected Quantity (auto-calculated from actual output using BOM formulas), Issued Quantity (from issuance records), and Variance (issued - expected) with color-coded indicators (green/yellow/red). The variance analysis enables real-time material efficiency tracking by comparing planned BOM requirements against actual material consumption. Database schema enforces unique composite constraint on (issuanceId, productionDate, shift), with 409 conflict handling for duplicate attempts. Accessible via Manager and Admin dashboards under Operations/Production Operations navigation section with list view, stats cards (Total Entries, Total Produced, Total Rejected), and full CRUD operations through modal dialogs.

### System Design Choices
- **Authentication:** Users can log in with username or email.
- **Database Schema:** Includes `is_cluster` for mobile integration and status tracking fields for dispatch workflow and WhatsApp responses.
- **Dispatch Workflow:** Invoice-first, tamper-proof state machine with backend validation and digital signature requirement.
- **Inventory Management Logic:** Inventory deduction occurs on gatepass creation (physical dispatch). Raw Material inventory supports dual stock management modes: Opening Stock Entry Only mode for setting baseline inventory with openingStock and openingDate, and Ongoing Inventory mode for dynamic tracking with receivedQuantity, returnedQuantity, and adjustments. Backend auto-calculates closingStock and closingStockUsable (closingStock × usableUnits from Type Master) for both modes, with zero-value and string-numeral normalization.
- **WhatsApp Integration:** Uses Meta WhatsApp Business Cloud API with sender verification, atomic updates, and state management for incremental checklist completion, including photo uploads and spare part requests.
- **Build & Deployment:** Development uses Vite dev server and `tsx`-powered Express; production builds use Vite for frontend and `esbuild` for backend. Drizzle Kit manages database schema.
- **Environment Handling:** Automatically detects Replit environment for cross-origin cookie settings (`secure: true`, `sameSite: 'none'`) to ensure session persistence.

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